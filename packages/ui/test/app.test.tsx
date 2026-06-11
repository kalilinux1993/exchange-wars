// @vitest-environment jsdom
// Catalog-agnostic: everything derives from DEFAULT_ITEMS so `npm run
// gen:catalog` regens never break these tests.
import { addAgent, createWorld, DEFAULT_ITEMS, playerView } from '@exchange-wars/engine';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { App } from '../src/App';
import { TradeFeed } from '../src/components/TradeFeed';
import { ghostWorthAt } from '../src/components/WorthChart';
import { chooseSave } from '../src/cloud';
import {
  applyOfflineProgress,
  checkMilestones,
  exportSaveString,
  ghostForRestart,
  HUMAN_START_GP,
  importSaveString,
  newGame,
  OFFLINE_CAP_TICKS,
  parseChallengeSeed,
  updateNews,
  type Game,
} from '../src/game';

const FIRST = DEFAULT_ITEMS[0]!; // cheapest item — guaranteed affordable
const LAST = DEFAULT_ITEMS[DEFAULT_ITEMS.length - 1]!;

afterEach(() => {
  cleanup();
  localStorage.clear();
  window.history.replaceState(null, '', window.location.pathname);
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

/** A resting bid: price 2 never crosses any ask in a ≥30gp catalog. */
function placeRestingBuy(qty: string): void {
  placeBuy('2', qty);
}

describe('UI shell', () => {
  it('renders the full catalog with net worth in the header', () => {
    freshApp();
    expect(document.querySelectorAll('.market tbody tr')).toHaveLength(DEFAULT_ITEMS.length);
    expect(screen.getByText(FIRST.name)).toBeTruthy();
    expect(screen.getAllByText(LAST.name).length).toBeGreaterThan(0);
    expect(screen.getByText('net')).toBeTruthy();
    expect(screen.getByText('+0')).toBeTruthy();
  });

  it('places a resting buy offer; escrow debits gp and a slot fills', () => {
    const game = freshApp();
    placeRestingBuy('2');
    expect(screen.getByText(/1\/3 offer slots used/i)).toBeTruthy();
    expect(game.world.agents[game.playerId]!.gp).toBe(HUMAN_START_GP - 4);
    expect(screen.getByText(/2 @ 2/)).toBeTruthy();
  });

  it('abort cancels the offer and refunds the escrow', () => {
    const game = freshApp();
    placeRestingBuy('2');
    fireEvent.click(screen.getByText('abort'));
    expect(screen.getByText(/0\/3 offer slots used/i)).toBeTruthy();
    expect(game.world.agents[game.playerId]!.gp).toBe(HUMAN_START_GP);
    expect(screen.getByText('no open offers')).toBeTruthy();
  });

  it('rejects an unaffordable offer with the engine reason', () => {
    freshApp();
    placeBuy('999999', '99');
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
    expect(game.worthHistory.length).toBeGreaterThan(1);
    expect(screen.queryByText(/let the world run/i)).toBeNull();
  });

  it('milestones latch once and persist on the save', () => {
    const game = newGame(42);
    const v = playerView(game.world, game.playerId)!;
    const newly = checkMilestones(game, v, 120_000);
    expect(newly.map((m) => m.id)).toContain('hundred-k');
    expect(game.milestones).toContain('doubled');
    expect(checkMilestones(game, v, 120_000)).toHaveLength(0);
  });

  it('first offer unlocks a milestone with a toast, and the Deeds panel tracks it', () => {
    freshApp();
    expect(screen.getByText('Deeds')).toBeTruthy();
    placeRestingBuy('1');
    expect(screen.getAllByText('Open for Business').length).toBeGreaterThan(0);
  });

  it('Clerk Orders configure the idle bot through the command protocol', () => {
    const game = freshApp();
    expect(screen.getByText(/hire the clerk/i)).toBeTruthy();
    fireEvent.click(screen.getByText('50,000 gp'));
    const focus = screen.getByLabelText(/focus/i) as HTMLSelectElement;
    fireEvent.change(focus, { target: { value: DEFAULT_ITEMS[1]!.id } });
    expect(game.world.agents[game.playerId]!.botConfig?.focusItemId).toBe(DEFAULT_ITEMS[1]!.id);
    const risk = screen.getByLabelText(/risk/i) as HTMLSelectElement;
    fireEvent.change(risk, { target: { value: '0.06' } });
    expect(game.world.agents[game.playerId]!.botConfig?.maxVolatility).toBe(0.06);
  });

  it('depth ladder shows the selected book with the player marked', () => {
    const game = freshApp();
    fireEvent.click(screen.getByText('+1k'));
    const title = new RegExp(`Depth · ${FIRST.id.replace(/_/g, ' ')}`, 'i');
    expect(screen.getByText(title)).toBeTruthy();
    expect(screen.getByText(/spread/i)).toBeTruthy();
    // One gp BELOW best bid: guaranteed to rest (real-price catalogs have
    // 1gp spreads, so bid+1 can cross) and guaranteed inside the top-5 levels.
    const bestBid = game.world.books[FIRST.id]!.buys[0]!.price;
    placeBuy(String(Math.max(1, bestBid - 1)), '1');
    const ladder = screen.getByText(title).closest('.ladder')!;
    expect(ladder.textContent).toContain('◆');
  });

  it('clicking a ladder level loads side + price into the ticket', () => {
    freshApp();
    fireEvent.click(screen.getByText('+1k'));
    const ask = document.querySelector('.ladder .level.ask') as HTMLElement;
    expect(ask).toBeTruthy();
    const levelPrice = ask.querySelector('.price')!.textContent!.replace(/,/g, '');
    fireEvent.click(ask);
    expect((screen.getByLabelText(/price/i) as HTMLInputElement).value).toBe(levelPrice);
    // Lifting an ask means buying at it.
    const buyBtn = screen.getByRole('button', { name: 'buy' }) as HTMLButtonElement;
    expect(buyBtn.className).toContain('active');
    const bid = document.querySelector('.ladder .level.bid') as HTMLElement;
    if (bid) {
      fireEvent.click(bid);
      const sellBtn = screen.getByRole('button', { name: 'sell' }) as HTMLButtonElement;
      expect(sellBtn.className).toContain('active');
    }
  });

  it('quartermaster board: deliver gates on inventory, pays out, and latches the milestone', () => {
    const game = freshApp();
    expect(screen.getByText(/no contracts posted/i)).toBeTruthy();
    fireEvent.click(screen.getByText('+1k'));
    game.world.contracts!.length = 0;
    game.world.contracts!.push({ id: 999, itemId: FIRST.id, qty: 1, unitPrice: 500, expiresTick: 99_999 });
    // FIRST is already selected — clicking it would bail out of re-rendering.
    // Bounce through the second row, then back, to force fresh renders.
    fireEvent.click(screen.getAllByText(DEFAULT_ITEMS[1]!.name).find((el) => el.closest('.market') !== null)!);
    const marketCell = screen.getAllByText(FIRST.name).find((el) => el.closest('.market') !== null)!;
    fireEvent.click(marketCell);
    const deliver = screen.getByText('deliver') as HTMLButtonElement;
    expect(deliver.disabled).toBe(true);
    placeBuy(String(FIRST.consumeValue * 3), '1'); // crosses any ask — instant fill
    const gpBefore = game.world.agents[game.playerId]!.gp;
    const deliverNow = screen.getByText('deliver') as HTMLButtonElement;
    expect(deliverNow.disabled).toBe(false);
    fireEvent.click(deliverNow);
    expect(game.world.agents[game.playerId]!.gp).toBe(gpBefore + 500);
    expect(game.milestones).toContain('contractor');
    expect(game.world.stats.contractsFilled).toBe(1);
  });

  it('offline accrual: real time away fast-forwards the world, capped, ignoring blips', () => {
    // Tiny 1-item, 1-agent world: this tests game.ts clock logic, not the
    // economy — the 100k-tick cap case must not drag the full 470-agent world
    // through jsdom (it timed out CI at 124s on the 64-item catalog).
    const world = createWorld({
      seed: 1,
      items: [{ id: 'ore', name: 'Ore', baseCost: 80, consumeValue: 200, volatility: 0.08 }],
      producersPerItem: 0,
      consumersPerItem: 0,
      marketMakersPerItem: 0,
      momentumTraders: 0,
      noiseTraders: 0,
      players: 0,
    });
    const human = addAgent(world, 'player', HUMAN_START_GP, {});
    human.policy = 'idle';
    const game: Game = {
      world,
      playerId: human.id,
      startGp: HUMAN_START_GP,
      worthHistory: [],
      milestones: [],
      newsLog: [],
      seenEvents: [],
      fills: [],
      fillScanTick: 0,
    };
    expect(applyOfflineProgress(game, 1_000_000)).toBeNull();
    expect(game.world.tick).toBe(0);
    game.lastSeenMs = 1_000_000;
    const res = applyOfflineProgress(game, 1_000_000 + 600_000);
    expect(res?.ticks).toBe(600);
    expect(game.world.tick).toBe(600);
    game.lastSeenMs = 2_000_000;
    expect(applyOfflineProgress(game, 2_000_000 + 30_000)).toBeNull();
    expect(game.world.tick).toBe(600);
    game.lastSeenMs = 3_000_000;
    const capped = applyOfflineProgress(game, 3_000_000 + 7 * 24 * 3_600_000);
    expect(capped?.ticks).toBe(OFFLINE_CAP_TICKS);
    expect(game.world.tick).toBe(600 + OFFLINE_CAP_TICKS);
  });

  it('shows the away banner when reopening after time has passed', () => {
    const game = newGame(42);
    game.lastSeenMs = Date.now() - 600_000;
    render(<App initial={game} />);
    expect(screen.getByText(/while you were away/i)).toBeTruthy();
    expect(game.world.tick).toBeGreaterThanOrEqual(600);
  });

  it('parseChallengeSeed accepts only #seed=<digits>', () => {
    expect(parseChallengeSeed('#seed=777')).toBe(777);
    expect(parseChallengeSeed('#seed=0')).toBe(0);
    expect(parseChallengeSeed('#seed=abc')).toBeNull();
    expect(parseChallengeSeed('#seed=')).toBeNull();
    expect(parseChallengeSeed('')).toBeNull();
    expect(parseChallengeSeed('#seed=99999999999')).toBeNull(); // 11 digits
  });

  it('a #seed link starts fresh visitors on that seed directly', () => {
    window.location.hash = '#seed=777';
    render(<App />); // no initial, no save
    fireEvent.click(screen.getByText('start trading'));
    expect(screen.getByText('777')).toBeTruthy(); // seed in the clock
    expect(window.location.hash).toBe(''); // consumed
  });

  it('a #seed link with an existing save offers a challenge bar instead of clobbering', () => {
    window.location.hash = '#seed=777';
    const game = newGame(42);
    render(<App initial={game} />);
    expect(screen.getByText(/challenged to seed/)).toBeTruthy();
    fireEvent.click(screen.getByText('accept'));
    expect(screen.queryByText(/challenged to seed/)).toBeNull();
    expect(screen.getByText('777')).toBeTruthy();
  });

  it('the challenge-link chip raises a copied toast naming the seed', () => {
    freshApp();
    fireEvent.click(screen.getByRole('button', { name: 'challenge link' }));
    expect(screen.getByText('Challenge link copied')).toBeTruthy();
    expect(screen.getByText(/seed 42/)).toBeTruthy();
  });

  it('ghostForRestart keeps the best previous run on the SAME seed only', () => {
    const prev = newGame(42);
    prev.worthHistory = [
      { tick: 0, worth: 55_000 },
      { tick: 500, worth: 80_000 },
    ];
    expect(ghostForRestart(prev, 7)).toBeUndefined(); // different seed: no ghost
    const g = ghostForRestart(prev, 42)!;
    expect(g.seed).toBe(42);
    expect(g.history[g.history.length - 1]!.worth).toBe(80_000);
    // A weaker new run must NOT displace a stronger existing ghost.
    prev.ghost = { seed: 42, history: [{ tick: 0, worth: 55_000 }, { tick: 800, worth: 200_000 }] };
    expect(ghostForRestart(prev, 42)!.history[1]!.worth).toBe(200_000);
    // A stronger new run takes over.
    prev.worthHistory = [
      { tick: 0, worth: 55_000 },
      { tick: 900, worth: 500_000 },
    ];
    expect(ghostForRestart(prev, 42)!.history[1]!.worth).toBe(500_000);
  });

  it('restarting the same seed races your previous run as a chart ghost', () => {
    freshApp();
    fireEvent.click(screen.getByText('+1k')); // build some worth history
    fireEvent.click(screen.getByText('new game'));
    const seedInput = screen.getByLabelText('seed') as HTMLInputElement;
    fireEvent.change(seedInput, { target: { value: '42' } }); // SAME seed
    fireEvent.click(screen.getByText('start'));
    fireEvent.click(screen.getByText('+1k')); // new run draws its own line
    expect(screen.getByText(/vs ghost/)).toBeTruthy();
    expect(document.querySelectorAll('.worth polyline').length).toBe(2);
  });

  it('ghostWorthAt interpolates and clamps', () => {
    const h = [
      { tick: 100, worth: 1_000 },
      { tick: 200, worth: 2_000 },
    ];
    expect(ghostWorthAt(h, 50)).toBe(1_000); // clamp left
    expect(ghostWorthAt(h, 150)).toBe(1_500); // interpolate
    expect(ghostWorthAt(h, 999)).toBe(2_000); // clamp right
    expect(ghostWorthAt([], 10)).toBe(0);
  });

  it('hiding the tab stamps + pauses; returning accrues like a reopen', () => {
    const game = newGame(42);
    render(<App initial={game} />);
    fireEvent.click(screen.getByText('1×')); // world running
    Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });
    fireEvent(document, new Event('visibilitychange'));
    expect(game.lastSeenMs).toBeGreaterThan(Date.now() - 5_000); // stamped
    expect(screen.getByText('❚❚').className).toContain('active'); // paused
    game.lastSeenMs = Date.now() - 600_000; // pretend 10 minutes hidden
    const before = game.world.tick;
    Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
    fireEvent(document, new Event('visibilitychange'));
    expect(game.world.tick - before).toBeGreaterThanOrEqual(600); // accrued at 1 tps
    expect(screen.getByText(/while you were away/i)).toBeTruthy();
  });

  it('big offline debts run chunked behind the catch-up overlay', async () => {
    // Tiny world again — this tests the chunk driver, not the economy.
    const world = createWorld({
      seed: 1,
      items: [{ id: 'ore', name: 'Ore', baseCost: 80, consumeValue: 200, volatility: 0.08 }],
      producersPerItem: 0,
      consumersPerItem: 0,
      marketMakersPerItem: 0,
      momentumTraders: 0,
      noiseTraders: 0,
      players: 0,
    });
    const human = addAgent(world, 'player', HUMAN_START_GP, {});
    human.policy = 'idle';
    const game: Game = {
      world,
      playerId: human.id,
      startGp: HUMAN_START_GP,
      worthHistory: [],
      milestones: [],
      newsLog: [],
      seenEvents: [],
      fills: [],
      fillScanTick: 0,
      lastSeenMs: Date.now() - 20_000_500, // owes ~20k ticks > sync threshold
    };
    render(<App initial={game} />);
    expect(screen.getByText(/The world turns/)).toBeTruthy(); // overlay up, tab responsive
    await waitFor(() => expect(screen.queryByText(/The world turns/)).toBeNull(), { timeout: 15_000 });
    expect(game.world.tick).toBeGreaterThanOrEqual(20_000); // debt fully paid
    expect(screen.getByText(/while you were away/i)).toBeTruthy(); // banner takes over
  });

  it('max button fills the buy qty from gp and the item buy limit', () => {
    freshApp();
    fireEvent.change(screen.getByLabelText(/price/i), { target: { value: '100' } });
    fireEvent.click(screen.getByText('max'));
    const afford = Math.floor(HUMAN_START_GP / 100);
    const limit = FIRST.buyLimit && FIRST.buyLimit > 0 ? FIRST.buyLimit : Number.POSITIVE_INFINITY;
    const expected = Math.min(afford, limit);
    expect((screen.getByLabelText(/qty/i) as HTMLInputElement).value).toBe(String(expected));
  });

  it('my trades: instant fills latch into the personal log', () => {
    const game = freshApp();
    fireEvent.click(screen.getByText('+1k'));
    placeBuy(String(FIRST.consumeValue * 3), '1'); // crosses — instant fill
    expect(game.fills.length).toBeGreaterThan(0);
    const last = game.fills[game.fills.length - 1]!;
    expect(last.side).toBe('buy');
    expect(last.itemId).toBe(FIRST.id);
    fireEvent.click(screen.getByText('mine'));
    expect(screen.getAllByText('buy').length).toBeGreaterThan(0); // badge row visible
  });

  it('save export/import round-trips and rejects garbage', () => {
    const game = newGame(42);
    game.world.tick = 0;
    const raw = exportSaveString(game);
    const back = importSaveString(raw);
    expect(back).not.toBeNull();
    expect(back!.world.seed).toBe(42);
    expect(back!.playerId).toBe(game.playerId);
    expect(importSaveString('not json')).toBeNull();
    expect(importSaveString('{"hello":1}')).toBeNull();
  });

  it('column sort orders the market by last price both ways', () => {
    freshApp();
    const lasts = (): number[] =>
      Array.from(document.querySelectorAll('.market tbody tr td:nth-child(4)')).map((td) =>
        Number(td.textContent!.replace(/,/g, '')),
      );
    fireEvent.click(screen.getByText('last')); // ascending
    const asc = lasts();
    for (let i = 1; i < asc.length; i++) expect(asc[i]!).toBeGreaterThanOrEqual(asc[i - 1]!);
    fireEvent.click(screen.getByText(/^last ▲/)); // descending
    const desc = lasts();
    for (let i = 1; i < desc.length; i++) expect(desc[i]!).toBeLessThanOrEqual(desc[i - 1]!);
  });

  it('market filter narrows the table live', () => {
    freshApp();
    const before = document.querySelectorAll('.market tbody tr').length;
    expect(before).toBe(DEFAULT_ITEMS.length);
    fireEvent.change(screen.getByPlaceholderText(/filter items/i), { target: { value: 'rune' } });
    const after = document.querySelectorAll('.market tbody tr').length;
    expect(after).toBeGreaterThan(0);
    expect(after).toBeLessThan(before);
  });

  it('space bar toggles pause/play except while typing', () => {
    freshApp();
    fireEvent.keyDown(window, { code: 'Space' });
    expect((screen.getByText('5×') as HTMLButtonElement).className).toContain('active');
    fireEvent.keyDown(window, { code: 'Space' });
    expect((screen.getByText('❚❚') as HTMLButtonElement).className).toContain('active');
    // Typing in an input must NOT toggle.
    fireEvent.keyDown(screen.getByLabelText(/qty/i), { code: 'Space' });
    expect((screen.getByText('❚❚') as HTMLButtonElement).className).toContain('active');
  });

  it('first-run help overlay shows once per device and reopens via ?', () => {
    freshApp();
    expect(screen.getByText('How to Play')).toBeTruthy();
    fireEvent.click(screen.getByText('start trading'));
    expect(screen.queryByText('How to Play')).toBeNull();
    cleanup();
    render(<App initial={newGame(7)} />); // same device — flag persisted
    expect(screen.queryByText('How to Play')).toBeNull();
    fireEvent.click(screen.getByText('?'));
    expect(screen.getByText('How to Play')).toBeTruthy();
  });

  it('locked worth deeds show progress percentages', () => {
    freshApp();
    expect(screen.getByText('22%')).toBeTruthy(); // Merchant Prince: 55k / 250k
    expect(screen.getByText('5%')).toBeTruthy(); // Millionaire: 55k / 1M
  });

  it('the Chronicle records event begins and ends', () => {
    const game = newGame(42);
    game.world.events!.push({ id: 'ev1', itemId: FIRST.id, kind: 'demand_surge', startTick: 0, endTick: 100 });
    updateNews(game);
    expect(game.newsLog).toHaveLength(1);
    expect(game.newsLog[0]!.text).toContain('craze begins');
    updateNews(game); // no duplicate
    expect(game.newsLog).toHaveLength(1);
    game.world.tick = 150; // past the end
    updateNews(game);
    expect(game.newsLog).toHaveLength(2);
    expect(game.newsLog[1]!.text).toContain('craze ends');
    expect(game.newsLog[1]!.kind).toBe('ended');
  });

  it('event endings report the EMA move over the run', () => {
    const game = newGame(42);
    const book = game.world.books[FIRST.id]!;
    book.ema = 100;
    game.world.events!.push({ id: 'ev1', itemId: FIRST.id, kind: 'supply_shock', startTick: 0, endTick: 100 });
    updateNews(game); // headline captures startPrice = 100
    book.ema = 142;
    game.world.tick = 150;
    updateNews(game);
    expect(game.newsLog[1]!.move).toBe(42);
    // pre-outcome saves have no startPrice — ending falls back to plain text
    game.world.events!.push({ id: 'ev2', itemId: FIRST.id, kind: 'supply_glut', startTick: 150, endTick: 200 });
    updateNews(game);
    delete game.seenEvents[0]!.startPrice;
    game.world.tick = 250;
    updateNews(game); // log: begins, ends(+42), begins, ends(no move)
    expect(game.newsLog[3]!.kind).toBe('ended');
    expect(game.newsLog[3]!.move).toBeUndefined();
  });

  it('active events show countdowns on the newsbar chip and the ticket', () => {
    const game = newGame(42);
    game.world.events!.push({ id: 'ev1', itemId: FIRST.id, kind: 'demand_surge', startTick: 0, endTick: 450 });
    render(<App initial={game} />);
    fireEvent.click(screen.getByText('start trading'));
    expect(screen.getByText(/450 left/)).toBeTruthy(); // newsbar chip
    expect(screen.getByText(/craze active — ends in ~450 ticks/)).toBeTruthy(); // ticket (FIRST selected by default)
  });

  it('new deeds latch: Gold Baron, Exotic Taste, Quartermaster General, Storm Trader', () => {
    const game = newGame(42);
    const view = () => playerView(game.world, game.playerId)!;

    expect(checkMilestones(game, view(), 5_000_000).map((m) => m.id)).toContain('five-million');

    const exotic = game.world.items.find((i) => i.volatility >= 0.13)!;
    game.world.agents[game.playerId]!.inventory[exotic.id] = 1;
    expect(checkMilestones(game, view(), 0).map((m) => m.id)).toContain('exotic-taste');

    game.world.stats.contractsFilled = 10;
    expect(checkMilestones(game, view(), 0).map((m) => m.id)).toContain('master-contractor');

    // Storm Trader: a fill OUTSIDE the event window must not latch...
    game.world.events!.push({ id: 'ev', itemId: exotic.id, kind: 'demand_surge', startTick: 10, endTick: 20 });
    game.fills.push({ tick: 25, itemId: exotic.id, side: 'buy', qty: 1, price: 5 });
    expect(checkMilestones(game, view(), 0).map((m) => m.id)).not.toContain('storm-rider');
    // ...but one INSIDE it does.
    game.fills.push({ tick: 15, itemId: exotic.id, side: 'buy', qty: 1, price: 5 });
    expect(checkMilestones(game, view(), 0).map((m) => m.id)).toContain('storm-rider');
  });

  it('the ticket warns on unaffordable buys and overdrawn sells (advisory only)', () => {
    freshApp();
    fireEvent.change(screen.getByLabelText('price'), { target: { value: '49999' } });
    fireEvent.change(screen.getByLabelText('qty'), { target: { value: '99' } }); // ~4.95M on a 55k purse
    expect(screen.getByText(/exceeds your 55,000 gp/)).toBeTruthy();
    expect((screen.getByText('place buy offer') as HTMLButtonElement).disabled).toBe(false); // engine stays the authority
    const ticket = document.querySelector('.ticket') as HTMLElement;
    fireEvent.click(within(ticket).getByRole('button', { name: 'sell' }));
    expect(screen.getByText(/you hold only 0/)).toBeTruthy(); // empty satchel
  });

  it('the feed glows on a NEW personal fill, not on save load', () => {
    const fill = { tick: 5, itemId: FIRST.id, side: 'buy' as const, qty: 1, price: 100 };
    const { container, rerender } = render(
      <TradeFeed trades={[]} fills={[fill]} items={[FIRST]} playerId={1} />,
    );
    // Pre-existing fills (loading a save) must not glow.
    expect(container.querySelector('.feed-flash')).toBeNull();
    rerender(<TradeFeed trades={[]} fills={[fill, { ...fill, tick: 9 }]} items={[FIRST]} playerId={1} />);
    expect(container.querySelector('.feed-flash')).toBeTruthy();
  });

  it('Chronicle outcome chips render signed', () => {
    const game = newGame(42);
    game.newsLog.push(
      { tick: 1, text: 'up ends', kind: 'ended', move: 42 },
      { tick: 2, text: 'down ends', kind: 'ended', move: -17 },
    );
    render(<App initial={game} />);
    expect(screen.getByText('+42%')).toBeTruthy();
    expect(screen.getByText('-17%')).toBeTruthy();
  });

  it('renders the Chronicle panel and the ticket wiki line', () => {
    freshApp();
    expect(screen.getByText('Chronicle')).toBeTruthy();
    expect(screen.getByText(/quiet markets/i)).toBeTruthy();
    expect(screen.getByText(/wiki snapshot/i)).toBeTruthy();
  });

  it('new game accepts a chosen seed — identical worlds for shared challenges', () => {
    freshApp();
    fireEvent.click(screen.getByText('new game'));
    const seedInput = screen.getByLabelText('seed') as HTMLInputElement;
    expect(seedInput.value).toBe('43'); // suggested: current seed + 1
    fireEvent.change(seedInput, { target: { value: '12345' } });
    fireEvent.click(screen.getByText('start'));
    expect(screen.getByText('12345')).toBeTruthy(); // seed display in the clock
    expect(screen.getAllByText('0').length).toBeGreaterThan(0); // fresh world at tick 0
    expect(screen.getAllByText('55,000').length).toBeGreaterThan(0); // fresh purse (gp + net)
  });

  it('cloud conflict chooser: latest lastSeenMs wins, cloud wins ties', () => {
    const a = newGame(42);
    const b = newGame(42);
    expect(chooseSave(a, null)).toBe('local');
    expect(chooseSave(null, b)).toBe('cloud');
    a.lastSeenMs = 1_000;
    b.lastSeenMs = 2_000;
    expect(chooseSave(a, b)).toBe('cloud');
    b.lastSeenMs = 500;
    expect(chooseSave(a, b)).toBe('local');
    b.lastSeenMs = 1_000;
    expect(chooseSave(a, b)).toBe('cloud'); // tie → cloud
  });

  it('renders the sign-in bar when signed out', () => {
    freshApp();
    expect(screen.getByPlaceholderText(/sign in to sync/i)).toBeTruthy();
    expect(screen.getByText('sign in')).toBeTruthy();
  });

  it('upgrade shop gates purchases by affordability', () => {
    const game = freshApp();
    const slotBtn = screen.getByText('25,000 gp') as HTMLButtonElement;
    const flipBtn = screen.getByText('50,000 gp') as HTMLButtonElement;
    expect(slotBtn.disabled).toBe(false);
    expect(flipBtn.disabled).toBe(false);
    fireEvent.click(slotBtn);
    expect(game.world.agents[game.playerId]!.slots).toBe(4);
    expect(screen.getByText(/0\/4 offer slots used/i)).toBeTruthy();
    expect((screen.getByText('50,000 gp') as HTMLButtonElement).disabled).toBe(true);
  });
});
