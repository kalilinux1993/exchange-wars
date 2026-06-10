// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { App } from '../src/App';
import { HUMAN_START_GP, newGame, type Game } from '../src/game';

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

  it('upgrade shop gates purchases by affordability', () => {
    const game = freshApp(); // 30k gp: first slot (25k) affordable, autoFlip tier 1 (50k) not
    const slotBtn = screen.getByText('25,000 gp') as HTMLButtonElement;
    const flipBtn = screen.getByText('50,000 gp') as HTMLButtonElement;
    expect(slotBtn.disabled).toBe(false);
    expect(flipBtn.disabled).toBe(true);
    fireEvent.click(slotBtn);
    expect(game.world.agents[game.playerId]!.slots).toBe(4);
    expect(screen.getByText(/0\/4 offer slots used/i)).toBeTruthy();
  });
});
