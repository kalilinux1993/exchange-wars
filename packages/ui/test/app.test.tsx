// @vitest-environment jsdom
import { playerView } from '@exchange-wars/engine';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { App } from '../src/App';
import {
  applyOfflineProgress,
  checkMilestones,
  HUMAN_START_GP,
  newGame,
  OFFLINE_CAP_TICKS,
  type Game,
} from '../src/game';

afterEach(() => {
  cleanup();
  localStorage.clear();
});

function freshApp(): Game {
  const game = newGame(42);
  render(<App initial={game} />);
  return game;
}

function placeBuy(price: string, qty: string): void {
  fireEvent.change(screen.getByLabelText(/price/i), { target: { value: price } });
  fireEvent.change(screen.getByLabelText(/qty/i), { target: { value: qty } });
  fireEvent.click(screen.getByText(/place buy offer/i));
}

describe('UI shell', () => {
  it('renders the market catalog across price tiers, with net worth in the header', () => {
    freshApp();
    for (const name of ['Iron ore', 'Coal', 'Shark', 'Grimy ranarr', 'Rune scimitar', 'Rune platebody']) {
      expect(screen.getByText(name)).toBeTruthy();
    }
    expect(screen.getByText('net')).toBeTruthy();
    expect(screen.getByText('+0')).toBeTruthy(); // net worth delta at boot
  });

  it('places a buy offer through the ticket; escrow debits gp and a slot fills', () => {
    const game = freshApp();
    placeBuy('50', '2');
    expect(screen.getByText(/1\/3 offer slots used/i)).toBeTruthy();
    expect(game.world.agents[game.playerId]!.gp).toBe(HUMAN_START_GP - 100);
    expect(screen.getByText(/2 @ 50/)).toBeTruthy(); // open offer row
  });

  it('abort cancels the offer and refunds the escrow', () => {
    const game = freshApp();
    placeBuy('50', '2');
    fireEvent.click(screen.getByText('abort'));
    expect(screen.getByText(/0\/3 offer slots used/i)).toBeTruthy();
    expect(game.world.agents[game.playerId]!.gp).toBe(HUMAN_START_GP);
    expect(screen.getByText('no open offers')).toBeTruthy();
  });

  it('rejects an invalid offer with the engine reason', () => {
    freshApp();
    placeBuy('999999', '99'); // unaffordable
    expect(screen.getByText(/rejected: insufficient-gp/i)).toBeTruthy();
  });

  it('fast-forward advances the deterministic world and feeds the Fortune chart', () => {
    const game = freshApp();
    expect(screen.getByText('Fortune')).toBeTruthy();
    expect(screen.getByText('Tape')).toBeTruthy();
    fireEvent.click(screen.getByText('+1k'));
    expect(game.world.tick).toBe(1_000);
    fireEvent.click(screen.getByText('+10k'));
    expect(game.world.tick).toBe(11_000);
    expect(game.worthHistory.length).toBeGreaterThan(1); // sampled during fast-forward
    expect(screen.queryByText(/let the world run/i)).toBeNull(); // chart now renders
  });

  it('milestones latch once and persist on the save', () => {
    const game = newGame(42);
    const v = playerView(game.world, game.playerId)!;
    const newly = checkMilestones(game, v, 120_000);
    expect(newly.map((m) => m.id)).toContain('hundred-k');
    expect(game.milestones).toContain('doubled'); // 120k ≥ 2 × 55k
    expect(checkMilestones(game, v, 120_000)).toHaveLength(0); // no double-unlock
  });

  it('first offer unlocks a milestone with a toast, and the Deeds panel tracks it', () => {
    freshApp();
    expect(screen.getByText('Deeds')).toBeTruthy();
    placeBuy('50', '2');
    expect(screen.getAllByText('Open for Business').length).toBeGreaterThan(0); // toast + panel
  });

  it('Clerk Orders configure the idle bot through the command protocol', () => {
    const game = freshApp();
    expect(screen.getByText(/hire the clerk/i)).toBeTruthy();
    fireEvent.click(screen.getByText('50,000 gp')); // buy autoFlip tier 1 (affordable at 55k)
    const focus = screen.getByLabelText(/focus/i) as HTMLSelectElement;
    fireEvent.change(focus, { target: { value: 'iron_ore' } });
    expect(game.world.agents[game.playerId]!.botConfig?.focusItemId).toBe('iron_ore');
    const risk = screen.getByLabelText(/risk/i) as HTMLSelectElement;
    fireEvent.change(risk, { target: { value: '0.06' } });
    expect(game.world.agents[game.playerId]!.botConfig?.maxVolatility).toBe(0.06);
  });

  it('depth ladder shows the selected book with the player marked', () => {
    const game = freshApp();
    fireEvent.click(screen.getByText('+1k')); // populate books
    expect(screen.getByText(/Depth · feather/i)).toBeTruthy(); // first item selected by default
    expect(screen.getByText(/spread/i)).toBeTruthy();
    placeBuy('2', '1'); // deep bid rests → appears as our level
    const ladder = screen.getByText(/Depth · feather/i).closest('.ladder')!;
    expect(ladder.textContent).toContain('◆');
  });

  it('quartermaster board: deliver gates on inventory, pays out, and latches the milestone', () => {
    const game = freshApp();
    expect(screen.getByText(/no contracts posted/i)).toBeTruthy();
    fireEvent.click(screen.getByText('+1k')); // populate books (real contracts may spawn)
    game.world.contracts!.length = 0; // isolate the test contract from spawned ones
    game.world.contracts!.push({ id: 999, itemId: 'iron_ore', qty: 1, unitPrice: 500, expiresTick: 99_999 });
    const marketCell = screen.getAllByText('Iron ore').find((el) => el.closest('.market') !== null)!;
    fireEvent.click(marketCell); // select + re-render
    const deliver = screen.getByText('deliver') as HTMLButtonElement;
    expect(deliver.disabled).toBe(true); // nothing in the satchel yet
    // Buy 1 iron ore at a crossing price for an instant fill.
    placeBuy('500', '1');
    const gpBefore = game.world.agents[game.playerId]!.gp;
    const deliverNow = screen.getByText('deliver') as HTMLButtonElement;
    expect(deliverNow.disabled).toBe(false);
    fireEvent.click(deliverNow);
    expect(game.world.agents[game.playerId]!.gp).toBe(gpBefore + 500);
    expect(game.milestones).toContain('contractor');
    expect(game.world.stats.contractsFilled).toBe(1);
  });

  it('offline accrual: real time away fast-forwards the world, capped, ignoring blips', () => {
    const game = newGame(42);
    // No lastSeenMs yet (never saved) → nothing applied.
    expect(applyOfflineProgress(game, 1_000_000)).toBeNull();
    expect(game.world.tick).toBe(0);
    // 10 minutes away at 1 tick/sec → 600 ticks.
    game.lastSeenMs = 1_000_000;
    const res = applyOfflineProgress(game, 1_000_000 + 600_000);
    expect(res?.ticks).toBe(600);
    expect(game.world.tick).toBe(600);
    // 30 seconds is a blip → ignored.
    game.lastSeenMs = 2_000_000;
    expect(applyOfflineProgress(game, 2_000_000 + 30_000)).toBeNull();
    expect(game.world.tick).toBe(600);
    // A week away hits the cap.
    game.lastSeenMs = 3_000_000;
    const capped = applyOfflineProgress(game, 3_000_000 + 7 * 24 * 3_600_000);
    expect(capped?.ticks).toBe(OFFLINE_CAP_TICKS);
    expect(game.world.tick).toBe(600 + OFFLINE_CAP_TICKS);
  });

  it('shows the away banner when reopening after time has passed', () => {
    const game = newGame(42);
    game.lastSeenMs = Date.now() - 600_000; // "saved" 10 minutes ago
    render(<App initial={game} />);
    expect(screen.getByText(/while you were away/i)).toBeTruthy();
    expect(game.world.tick).toBeGreaterThanOrEqual(600);
  });

  it('upgrade shop gates purchases by affordability', () => {
    const game = freshApp(); // 55k gp: slot (25k) and autoFlip tier 1 (50k) both within reach
    const slotBtn = screen.getByText('25,000 gp') as HTMLButtonElement;
    const flipBtn = screen.getByText('50,000 gp') as HTMLButtonElement;
    expect(slotBtn.disabled).toBe(false);
    expect(flipBtn.disabled).toBe(false);
    fireEvent.click(slotBtn); // 25k left — autoFlip no longer affordable
    expect(game.world.agents[game.playerId]!.slots).toBe(4);
    expect(screen.getByText(/0\/4 offer slots used/i)).toBeTruthy();
    expect((screen.getByText('50,000 gp') as HTMLButtonElement).disabled).toBe(true);
  });
});
