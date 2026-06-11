// @vitest-environment jsdom
// Catalog-agnostic: everything derives from DEFAULT_ITEMS so `npm run
// gen:catalog` regens never break these tests.
import { addAgent, applyCommand, createWorld, DEFAULT_ITEMS, playerView, SPRINT_TICKS, tickWorld } from '@exchange-wars/engine';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { App } from '../src/App';
import { ErrorBoundary } from '../src/components/ErrorBoundary';
import { Icon } from '../src/components/Icon';
import { MoversPanel } from '../src/components/MoversPanel';
import { LeaderboardPanel } from '../src/components/LeaderboardPanel';
import { TradeFeed } from '../src/components/TradeFeed';
import { ghostWorthAt } from '../src/components/WorthChart';
import { chooseSave, sanitizeHandle, type Session } from '../src/cloud';
import {
  applyOfflineProgress,
  checkMilestones,
  deathRecap,
  exportSaveString,
  fmtDuration,
  ghostForRestart,
  HUMAN_START_GP,
  importSaveString,
  loadGame,
  newGame,
  normalizeGame,
  OFFLINE_CAP_TICKS,
  parseChallengeSeed,
  updateNews,
  type Game,
} from '../src/game';

const FIRST = DEFAULT_ITEMS[0]!; // cheapest item — guaranteed affordable
const LAST = DEFAULT_ITEMS[DEFAULT_ITEMS.length - 1]!;

// jsdom must NEVER hit the real Supabase (the backend partially exists now,
// which would make tests network-dependent). supabase-js captures fetch once
// at client construction, so the stub is installed at MODULE scope with a
// mutable router: default = offline; tests script routes per-case.
let fetchRoutes: ((url: string) => Promise<Response> | null) | null = null;
vi.stubGlobal('fetch', (input: RequestInfo | URL): Promise<Response> => {
  const url = String(input instanceof Request ? input.url : input);
  return fetchRoutes?.(url) ?? Promise.reject(new Error('offline'));
});
const jsonResponse = (body: unknown): Promise<Response> =>
  Promise.resolve(
    new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' } }),
  );

afterEach(() => {
  cleanup();
  localStorage.clear();
  window.history.replaceState(null, '', window.location.pathname);
  fetchRoutes = null;
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
    fireEvent.change(risk, { target: { value: '0.09' } }); // "cheap goods only" on the ladder
    expect(game.world.agents[game.playerId]!.botConfig?.maxVolatility).toBe(0.09);
    fireEvent.change(risk, { target: { value: '0.1' } }); // "no big staples"
    expect(game.world.agents[game.playerId]!.botConfig?.maxVolatility).toBe(0.1);
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
      commandLog: [],
      logSince: 0,
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
      commandLog: [],
      logSince: 0,
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

  it('locked worth deeds show progress percentages (in the badge grid tooltips)', () => {
    freshApp();
    // The compact deed grid (9k) carries every deed's progress in its title;
    // the closest-to-done few also surface inline.
    expect(document.querySelector('[title*="Merchant Prince · 22%"]')).toBeTruthy(); // 55k / 250k
    expect(document.querySelector('[title*="Millionaire · 5%"]')).toBeTruthy(); // 55k / 1M
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

  it('market rows mark active-event items with ⚡ and track chips filter the table', () => {
    const game = newGame(42);
    game.world.events!.push({ id: 'ev1', itemId: FIRST.id, kind: 'demand_surge', startTick: 0, endTick: 500 });
    render(<App initial={game} />);
    const market = document.querySelector('.market') as HTMLElement;
    expect(within(market).getAllByTitle(/active event/).length).toBe(1); // only the event row
    const exotics = DEFAULT_ITEMS.filter((i) => i.volatility >= 0.13).length;
    fireEvent.click(within(market).getByRole('button', { name: 'exotics' }));
    expect(within(market).getByText(`${exotics}/${DEFAULT_ITEMS.length}`)).toBeTruthy();
    fireEvent.click(within(market).getByRole('button', { name: 'staples' }));
    expect(within(market).getByText(`${DEFAULT_ITEMS.length - exotics}/${DEFAULT_ITEMS.length}`)).toBeTruthy();
    fireEvent.click(within(market).getByRole('button', { name: 'all' }));
    expect(within(market).getByText(`${DEFAULT_ITEMS.length}/${DEFAULT_ITEMS.length}`)).toBeTruthy();
  });

  it('active events show countdowns on the newsbar chip and the ticket', () => {
    const game = newGame(42);
    game.world.events!.push({ id: 'ev1', itemId: FIRST.id, kind: 'demand_surge', startTick: 0, endTick: 450 });
    render(<App initial={game} />);
    fireEvent.click(screen.getByText('start trading'));
    expect(screen.getByText(/450 left/)).toBeTruthy(); // newsbar chip
    expect(screen.getByText(/craze active — ends in ~450 ticks/)).toBeTruthy(); // ticket (FIRST selected by default)
  });

  it('the hunter tally renders once there is something to tell', () => {
    const game = newGame(42);
    game.world.stats.monstersSlain = 7;
    game.world.stats.cacheFinds = 2;
    game.world.stats.deepestRegion = 1;
    render(<App initial={game} />);
    const panel = document.querySelector('.expedition') as HTMLElement;
    expect(within(panel).getByText(/7 slain · 2 caches/)).toBeTruthy();
    expect(within(panel).getByText(/deepest Varrock Sewers/)).toBeTruthy();
  });

  it('expedition deeds latch from stats and the dragon-bones ledger', () => {
    const game = newGame(42);
    const view = playerView(game.world, game.playerId)!;
    game.world.stats.monstersSlain = 1;
    expect(checkMilestones(game, view, 0).map((m) => m.id)).toContain('first-blood');
    game.world.stats.monstersSlain = 25;
    game.world.stats.deepestRegion = 4;
    const latched = checkMilestones(game, view, 0).map((m) => m.id);
    expect(latched).toContain('slayer-25');
    expect(latched).toContain('pioneer');
    expect(latched).not.toContain('dragon-slayer');
    game.world.ledger.itemsMinted['superior_dragon_bones'] = 1;
    expect(checkMilestones(game, view, 0).map((m) => m.id)).toContain('dragon-slayer');
    // Stat deeds latch from trained levels (8v): xp for level 10 = 4 * 9².
    game.world.agents[game.playerId]!.combatXp = { atk: 324, def: 324, hp: 323 };
    const statDeeds = checkMilestones(game, view, 0).map((m) => m.id);
    expect(statDeeds).toContain('swordhand');
    expect(statDeeds).toContain('bulwark');
    expect(statDeeds).not.toContain('iron-constitution'); // one xp short
  });

  it('sell the spoils: one click realizes what the resting bids would pay', () => {
    const game = newGame(42);
    const player = game.world.agents[game.playerId]!;
    // A second player rests real bids (5 @ 500, then 5 @ 400) on FIRST's book.
    const buyer = addAgent(game.world, 'player', 50_000, {});
    buyer.policy = 'idle';
    expect(applyCommand(game.world, buyer.id, { type: 'place', itemId: FIRST.id, side: 'buy', price: 500, qty: 5 }).ok).toBe(true);
    expect(applyCommand(game.world, buyer.id, { type: 'place', itemId: FIRST.id, side: 'buy', price: 400, qty: 5 }).ok).toBe(true);
    player.inventory[FIRST.id] = 8; // spoils to dump: 5 fill at 500, 3 at 400
    render(<App initial={game} />);
    const panel = document.querySelector('.player') as HTMLElement;
    expect(within(panel).getByText(/bids pay ≈3,700 gp/)).toBeTruthy(); // 5×500 + 3×400
    const gpBefore = player.gp;
    fireEvent.click(within(panel).getByRole('button', { name: 'sell @ bid' }));
    expect(player.inventory[FIRST.id] ?? 0).toBe(0); // the walk took the whole stack
    expect(player.gp).toBeGreaterThan(gpBefore); // instant fills (net of tax)
    expect(playerView(game.world, game.playerId)!.openOrders.length).toBe(0); // no resting residue
  });

  it('fight it out: auto-resolve settles the fight or hands back control when low', () => {
    const game = freshApp();
    const agent = game.world.agents[game.playerId]!;
    const panel = document.querySelector('.expedition') as HTMLElement;
    fireEvent.click(within(panel).getByText('embark'));
    for (let i = 0; i < 30 && agent.expedition && !agent.expedition.combat; i++) {
      if (agent.expedition.event) fireEvent.click(screen.getByText('walk on'));
      else fireEvent.click(screen.getByText(/venture deeper/));
    }
    expect(agent.expedition?.combat).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'fight it out' }));
    // Outcome space: combat settled (won/fled/dead), or the safety stop fired
    // (low hp, no food). Either way the loop must have ENDED.
    const c = agent.expedition?.combat;
    if (c) {
      const max = c.maxHp ?? 50;
      expect(c.playerHp).toBeLessThan(Math.ceil(max * 0.4)); // only the safety stop leaves a live fight
    } else if (agent.expedition) {
      expect(agent.expedition.cleared).toBeGreaterThanOrEqual(1); // settled by victory
    }
    // (no expedition at all = died fighting — also a settled fight)
  });

  it('a corrupt save is quarantined, not silently destroyed, and boot starts fresh', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    // Unparseable garbage.
    localStorage.setItem('exchange-wars-save-v1', 'not json {{{');
    expect(loadGame()).toBeNull(); // fresh start, not a crash
    expect(localStorage.getItem('exchange-wars-save-v1-corrupt')).toBe('not json {{{'); // preserved
    // Parseable but wrong shape (e.g. a future/foreign format) — also quarantined.
    localStorage.setItem('exchange-wars-save-v1', '{"foo":1}');
    expect(loadGame()).toBeNull();
    expect(localStorage.getItem('exchange-wars-save-v1-corrupt')).toBe('{"foo":1}');
    localStorage.removeItem('exchange-wars-save-v1');
    localStorage.removeItem('exchange-wars-save-v1-corrupt');
    spy.mockRestore();
  });

  it('the error boundary catches a render crash and offers recovery (save untouched)', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    localStorage.setItem('exchange-wars-save-v1', '{"sentinel":true}');
    const Boom = (): never => {
      throw new Error('kaboom');
    };
    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>,
    );
    expect(screen.getByText('The interface hit a snag')).toBeTruthy();
    expect(screen.getByText('reload the game')).toBeTruthy();
    // The save on disk is never touched by the boundary.
    expect(localStorage.getItem('exchange-wars-save-v1')).toBe('{"sentinel":true}');
    localStorage.removeItem('exchange-wars-save-v1');
    spy.mockRestore();
  });

  it('the icon pipeline renders dropped-in art and falls back to the glyph otherwise', () => {
    const game = newGame(42);
    render(<App initial={game} />);
    fireEvent.click(screen.getByRole('tab', { name: /Adventure/ }));
    const panel = document.querySelector('.expedition') as HTMLElement;
    // skill-*.svg now exist → the skills strip renders real icons, not emoji.
    const skills = panel.querySelector('.skills') as HTMLElement;
    expect(skills.querySelectorAll('img').length).toBe(3);
    // A name with no committed asset still falls back to its glyph.
    const { container } = render(<Icon name="definitely-missing-xyz" glyph="✦" />);
    expect(container.querySelector('img')).toBeNull();
    expect(container.textContent).toContain('✦');
  });

  it('the character panel shows a combat level and offers earned deeds as titles', () => {
    const game = newGame(42);
    game.world.agents[game.playerId]!.combatXp = { atk: 324, def: 324, hp: 323 }; // ~lvl 10s
    game.milestones = ['dragon-slayer']; // an earned deed → a wearable title
    render(<App initial={game} />);
    fireEvent.click(screen.getByRole('tab', { name: /Adventure/ }));
    const panel = document.querySelector('.expedition') as HTMLElement;
    expect(within(panel).getByText(/Combat Lv \d+/)).toBeTruthy();
    expect(within(panel).getByRole('option', { name: 'Dragon Slayer' })).toBeTruthy();
  });

  it('the ticket sparkline charts recent prices (and degrades gracefully)', () => {
    const game = newGame(42);
    for (let t = 0; t < 400; t++) tickWorld(game.world); // generate trade history
    render(<App initial={game} />);
    const ticket = document.querySelector('.ticket') as HTMLElement;
    const spark = ticket.querySelector('.sparkline');
    if (spark) {
      // A drawn sparkline has a polyline with at least two points.
      const pts = spark.querySelector('polyline')!.getAttribute('points')!;
      expect(pts.trim().split(/\s+/).length).toBeGreaterThanOrEqual(2);
    } else {
      expect(ticket.textContent).toContain('no recent trades'); // <2 points fallback
    }
  });

  it('watchlist: star from the ticket, the item appears in the watch panel', () => {
    localStorage.removeItem('ew-watch');
    const game = newGame(42);
    render(<App initial={game} />);
    // Select the cheapest item, then star it from the ticket.
    fireEvent.click(document.querySelectorAll('.market tbody tr')[0]!);
    const star = document.querySelector('.watchstar') as HTMLButtonElement;
    expect(star.getAttribute('aria-pressed')).toBe('false');
    fireEvent.click(star);
    expect(star.getAttribute('aria-pressed')).toBe('true');
    const watch = document.querySelector('.watchlist') as HTMLElement;
    expect(watch.querySelectorAll('.mover').length).toBe(1); // now tracked
    // Unstar from the panel removes it.
    fireEvent.click(within(watch).getByTitle('unstar'));
    expect(watch.querySelectorAll('.mover').length).toBe(0);
    localStorage.removeItem('ew-watch');
  });

  it('market movers list traded items by trend and click selects one', () => {
    const game = newGame(42);
    for (let t = 0; t < 400; t++) tickWorld(game.world); // give items volume + a wandering EMA
    const view = playerView(game.world, game.playerId)!;
    const onSelect = vi.fn();
    const { container } = render(<MoversPanel view={view} items={game.world.items} onSelect={onSelect} />);
    const movers = container.querySelectorAll('.mover');
    expect(movers.length).toBeGreaterThan(0); // 400 ticks of trading produces movers
    fireEvent.click(movers[0]!);
    expect(onSelect).toHaveBeenCalledWith(expect.any(String)); // clicking loads that item
    // Every mover shows a signed % badge.
    expect(container.querySelector('.pct')!.textContent).toMatch(/[▲▼]\s*\d+%/);
  });

  it('the combat scene renders the foe and animates a hit splat per round', () => {
    const game = newGame(42);
    const agent = game.world.agents[game.playerId]!;
    agent.expedition = {
      regionId: 'lumbridge_plains',
      rngState: 1,
      hp: 50,
      pack: {},
      packGp: 0,
      cleared: 0,
      combat: { monsterId: 'goblin', monsterHp: 12, playerHp: 50, antifire: false, maxHp: 50, outcome: 'fighting', lootGp: 0, lootItems: [], log: ['a goblin blocks the path'] },
    };
    render(<App initial={game} />);
    fireEvent.click(screen.getByRole('tab', { name: /Adventure/ }));
    const scene = document.querySelector('.combatscene') as SVGElement;
    expect(scene).toBeTruthy();
    expect(scene.getAttribute('aria-label')).toContain('Goblin');
    // Regression (9r): the bob animation must NOT clobber the monster's
    // positioning transform — the animated group is nested inside an outer
    // group that carries the translate to the right side of the scene.
    const monster = scene.querySelector('.monster') as SVGElement;
    expect(monster.parentElement?.getAttribute('transform')).toContain('translate(150');
    // Land a blow: monster hp drops, a fresh log entry → a splat appears.
    agent.expedition.combat!.monsterHp = 4;
    agent.expedition.combat!.log.push('you strike the Goblin for 8');
    fireEvent.click(screen.getByRole('button', { name: 'fight' })); // forces a re-render
    expect(document.querySelector('.combatscene .splat')).toBeTruthy();
  });

  it('equip best: one tap auto-packs your strongest usable gear per slot', () => {
    const game = newGame(42);
    const agent = game.world.agents[game.playerId]!;
    agent.combatXp = { atk: 700, def: 500, hp: 0 }; // Attack 14 / Defence 12 — qualifies for rune
    agent.inventory['rune_2h_sword'] = 1; // a weapon worth wielding
    agent.inventory['rune_platebody'] = 1; // body armor
    agent.inventory['shark'] = 3;
    render(<App initial={game} />);
    fireEvent.click(screen.getByRole('tab', { name: /Adventure/ }));
    const panel = document.querySelector('.expedition') as HTMLElement;
    fireEvent.click(within(panel).getByText('⚔ equip best'));
    fireEvent.click(within(panel).getByText('embark'));
    // The best usable weapon + body were auto-equipped (escrowed into the pack).
    expect(agent.expedition!.pack['rune_2h_sword']).toBe(1);
    expect(agent.expedition!.pack['rune_platebody']).toBe(1);
  });

  it('expedition loadouts: save a kit, refill from it clamped to what you hold', () => {
    localStorage.removeItem('ew-loadouts');
    const game = newGame(42);
    const agent = game.world.agents[game.playerId]!;
    agent.inventory['shark'] = 5;
    render(<App initial={game} />);
    fireEvent.click(screen.getByRole('tab', { name: /Adventure/ }));
    const panel = document.querySelector('.expedition') as HTMLElement;
    // Build a pack of 2 sharks, save it as a loadout.
    const sharkRow = within(panel).getByText('Shark').closest('li')!;
    fireEvent.click(within(sharkRow as HTMLElement).getByText('+'));
    fireEvent.click(within(sharkRow as HTMLElement).getByText('+'));
    fireEvent.click(within(panel).getByText('+ save kit'));
    expect(within(panel).getByText(/Shark ×2/)).toBeTruthy(); // the loadout chip
    // Clear the draft to 0, then refill from the saved kit.
    fireEvent.click(within(sharkRow as HTMLElement).getByText('−'));
    fireEvent.click(within(sharkRow as HTMLElement).getByText('−'));
    expect(within(sharkRow as HTMLElement).getByText('0/5')).toBeTruthy();
    fireEvent.click(within(panel).getByText(/Shark ×2/));
    expect(within(sharkRow as HTMLElement).getByText('2/5')).toBeTruthy(); // refilled
    localStorage.removeItem('ew-loadouts');
  });

  it('the clerk counter explains the unit cap once hired (legibility, not breakage)', () => {
    const game = newGame(42);
    applyCommand(game.world, game.playerId, { type: 'buyUpgrade', upgradeId: 'autoFlip' }); // tier 1
    render(<App initial={game} />);
    fireEvent.click(screen.getByRole('tab', { name: /Hall/ }));
    const shop = document.querySelector('.shop') as HTMLElement;
    expect(within(shop).getByText(/units a flip/)).toBeTruthy(); // the cap is stated
    expect(within(shop).getByText(/flip it yourself/)).toBeTruthy(); // and the escape hatch
  });

  it('the almanac opens the books: realm figures and your saga', () => {
    const game = newGame(42);
    game.world.stats.monstersSlain = 12;
    game.world.stats.eliteSlain = 1;
    game.world.stats.deaths = 2;
    game.world.stats.killsByMonster = { goblin: 12 };
    render(<App initial={game} />);
    const panel = document.querySelector('.almanac') as HTMLElement;
    expect(panel).toBeTruthy();
    expect(within(panel).getByText(/12 \(★1\)/)).toBeTruthy(); // slain, elite starred
    expect(within(panel).getByText('2†')).toBeTruthy(); // deaths
    expect(within(panel).getByText('gp minted / burned')).toBeTruthy(); // the ledger, public
    expect(within(panel).getByText(/1\/\d+ met/)).toBeTruthy(); // bestiary progress
  });

  it('deathRecap mirrors the engine keep-3 rule and tells the loss honestly', () => {
    const items = [
      { id: 'sword', name: 'Sword', baseCost: 30_000 },
      { id: 'body', name: 'Body', baseCost: 28_000 },
      { id: 'shark', name: 'Shark', baseCost: 700 },
    ];
    const r = deathRecap(items, { shark: 4, sword: 1, body: 1 }, 1_230);
    expect(r.kept).toEqual(['Sword', 'Body', 'Shark']); // top 3 units by cost
    expect(r.lostUnits).toBe(3); // the other 3 sharks feed the depths
    expect(r.lostGp).toBe(1_230);
    const naked = deathRecap(items, {}, 0);
    expect(naked.kept).toEqual([]);
    expect(naked.lostUnits).toBe(0);
  });

  it('the bestiary reveals monsters you have met and hides the rest', () => {
    const game = newGame(42);
    game.world.stats.monstersSlain = 5;
    game.world.stats.killsByMonster = { goblin: 5 };
    render(<App initial={game} />);
    const panel = document.querySelector('.expedition') as HTMLElement;
    expect(within(panel).getByText(/Bestiary \(1\//)).toBeTruthy();
    expect(within(panel).getByText(/Goblin/)).toBeTruthy();
    expect(within(panel).getByText('×5')).toBeTruthy();
    expect(within(panel).getAllByText('???').length).toBeGreaterThan(0); // the unmet stay hidden
  });

  it('expeditions: regions render with locks; an empty-pack embark works fists-first', () => {
    const game = freshApp();
    const panel = document.querySelector('.expedition') as HTMLElement;
    expect(panel).toBeTruthy();
    expect(within(panel).getByText('Lumbridge Plains')).toBeTruthy();
    expect(within(panel).getByText("The Dragon's Maw")).toBeTruthy(); // visible but locked
    fireEvent.click(within(panel).getByText('embark'));
    const agent = game.world.agents[game.playerId]!;
    expect(agent.expedition).toBeTruthy();
    expect(screen.getByText(/venture deeper/)).toBeTruthy();
    // Drive until a combat happens, declining choice events — real engine.
    for (let i = 0; i < 30 && agent.expedition && !agent.expedition.combat; i++) {
      if (agent.expedition.event) fireEvent.click(screen.getByText('walk on'));
      else fireEvent.click(screen.getByText(/venture deeper/));
    }
    expect(agent.expedition?.combat).toBeTruthy();
    expect(screen.getByRole('button', { name: 'fight' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'flee' })).toBeTruthy();
    for (let i = 0; i < 60 && agent.expedition?.combat; i++) {
      fireEvent.click(screen.getByRole('button', { name: 'fight' }));
    }
    if (agent.expedition) {
      while (agent.expedition?.event) fireEvent.click(screen.getByText('walk on'));
      fireEvent.click(screen.getByText(/extract/));
      expect(agent.expedition).toBeUndefined();
    }
  });

  it('expeditions: the pack builder escrows chosen supplies', () => {
    const game = newGame(42);
    const agent = game.world.agents[game.playerId]!;
    agent.inventory['shark'] = 3; // stock the satchel directly (fixture)
    render(<App initial={game} />);
    const panel = document.querySelector('.expedition') as HTMLElement;
    const sharkRow = within(panel).getByText('Shark').closest('li')!;
    fireEvent.click(within(sharkRow as HTMLElement).getByText('+'));
    fireEvent.click(within(sharkRow as HTMLElement).getByText('+'));
    fireEvent.click(within(panel).getByText('embark'));
    expect(agent.expedition!.pack['shark']).toBe(2);
    expect(agent.inventory['shark']).toBe(1);
  });

  it('sanitizeHandle keeps emails off the public board', () => {
    expect(sanitizeHandle('jesse')).toBe('jesse');
    expect(sanitizeHandle('Jesse.is.back@gmail.com')).toBe('Jesse.is.back');
    expect(sanitizeHandle('  @weird ')).toBe('anonymous trader');
    expect(sanitizeHandle('')).toBe('anonymous trader');
    expect(sanitizeHandle('a'.repeat(40))).toBe('a'.repeat(24));
  });

  it('the Sprint Board stays hidden while the leaderboard backend is absent', () => {
    freshApp(); // default fetch route: offline → probe null → no panel
    expect(screen.queryByText('Sprint Board')).toBeNull();
  });

  it('the Sprint Board renders verified rows and submits a sprint', async () => {
    fetchRoutes = (url) => {
      if (url.includes('/rest/v1/leaderboard')) return jsonResponse([{ handle: 'gertrude', worth: 77_777, deepest: 2 }]);
      if (url.includes('/functions/v1/verify-score')) return jsonResponse({ worth: 123_456, improved: true });
      return null;
    };
    const game = newGame(42);
    game.world.tick = SPRINT_TICKS; // sprint horizon reached
    const onToast = vi.fn();
    render(<LeaderboardPanel game={game} session={{} as Session} onToast={onToast} />);
    await waitFor(() => expect(screen.getByText('Sprint Board')).toBeTruthy());
    expect(screen.getByText('gertrude')).toBeTruthy();
    expect(screen.getByText('77,777')).toBeTruthy();
    expect(screen.getByText('⛏3')).toBeTruthy(); // verified depth badge (index 2 = region 3)
    fireEvent.click(screen.getByText(`submit ${SPRINT_TICKS / 1_000}k sprint`));
    await waitFor(() =>
      expect(onToast).toHaveBeenCalledWith('Sprint verified — new best!', expect.stringContaining('123,456')),
    );
  });

  it('unprovable runs (pre-recording saves) cannot submit', async () => {
    fetchRoutes = (url) => (url.includes('/rest/v1/leaderboard') ? jsonResponse([]) : null);
    const game = newGame(42);
    game.world.tick = SPRINT_TICKS;
    game.logSince = 500; // log incomplete — replay would misattribute
    render(<LeaderboardPanel game={game} session={{} as Session} onToast={vi.fn()} />);
    await waitFor(() => expect(screen.getByText('Sprint Board')).toBeTruthy());
    expect((screen.getByText(`submit ${SPRINT_TICKS / 1_000}k sprint`) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByText(/predates command recording/)).toBeTruthy();
  });

  it('logSince normalizes: pre-log saves become unprovable, logged saves stay provable', () => {
    const fresh = newGame(7);
    expect(fresh.logSince).toBe(0);
    const preLog = newGame(7);
    preLog.world.tick = 500;
    // @ts-expect-error — simulating a pre-7f save shape
    delete preLog.commandLog;
    // @ts-expect-error — simulating a pre-7f save shape
    delete preLog.logSince;
    expect(normalizeGame(preLog).logSince).toBe(500);
    const logged = newGame(7);
    logged.world.tick = 500;
    // @ts-expect-error — simulating a 7f-era save (log but no logSince)
    delete logged.logSince;
    expect(normalizeGame(logged).logSince).toBe(0);
  });

  it('human commands are recorded into the replayable command log', () => {
    const game = freshApp();
    expect(game.commandLog).toHaveLength(0);
    fireEvent.click(screen.getByText('25,000 gp')); // buySlot
    expect(game.commandLog).toHaveLength(1);
    expect(game.commandLog[0]!.cmd.type).toBe('buySlot');
    expect(game.commandLog[0]!.tick).toBe(0);
    placeRestingBuy('1');
    expect(game.commandLog.some((e) => e.cmd.type === 'place')).toBe(true);
    // Old saves normalize to an empty log.
    const g2 = newGame(7);
    // @ts-expect-error — simulating a pre-log save shape
    delete g2.commandLog;
    expect(normalizeGame(g2).commandLog).toEqual([]);
  });

  it('fmtDuration speaks human time', () => {
    expect(fmtDuration(45)).toBe('45s');
    expect(fmtDuration(150)).toBe('2m');
    expect(fmtDuration(3_600)).toBe('1h');
    expect(fmtDuration(12_345)).toBe('3h 25m');
    expect(fmtDuration(100_000)).toBe('27h 46m');
  });

  it('the ticket names the selected item band; Big Leagues latches on a 0.12-band fill', () => {
    const game = newGame(42);
    render(<App initial={game} />);
    expect(screen.getByText(/staple — all clerks/)).toBeTruthy(); // FIRST is cheap
    const big = DEFAULT_ITEMS.find((i) => i.volatility >= 0.12 && i.volatility < 0.13);
    expect(big).toBeTruthy(); // the ladder guarantees a big-staple band
    game.fills.push({ tick: 5, itemId: big!.id, side: 'buy', qty: 1, price: 5_000 });
    const view = playerView(game.world, game.playerId)!;
    expect(checkMilestones(game, view, 0).map((m) => m.id)).toContain('big-leagues');
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
