// @vitest-environment jsdom
// Catalog-agnostic: everything derives from DEFAULT_ITEMS so `npm run
// gen:catalog` regens never break these tests.
import { addAgent, applyCommand, createWorld, DEFAULT_ITEMS, playerView, REGIONS, SPRINT_TICKS, tickWorld, xpForLevel } from '@exchange-wars/engine';
import type { AgentState, SimStats } from '@exchange-wars/engine';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ItemDef, PlayerView } from '@exchange-wars/engine';
import { App } from '../src/App';
import { ErrorBoundary } from '../src/components/ErrorBoundary';
import { Icon, itemIcon } from '../src/components/Icon';
import { MoversPanel } from '../src/components/MoversPanel';
import { CharacterPanel, equipped, lockedUpgrades } from '../src/components/CharacterPanel';
import { TopFlips, rankFlips } from '../src/components/TopFlips';
import { RecordsPanel, recordRows } from '../src/components/RecordsPanel';
import { regionDanger } from '../src/components/ExpeditionPanel';
import { resolveShortcut } from '../src/keyboard';
import { ProfitPanel } from '../src/components/ProfitPanel';
import { PositionsPanel } from '../src/components/PositionsPanel';
import { ConquestPanel } from '../src/components/ConquestPanel';
import { MarketTable } from '../src/components/MarketTable';
import { DelvePanel } from '../src/components/DelvePanel';
import { WealthPanel } from '../src/components/WealthPanel';
import { PlayerPanel } from '../src/components/PlayerPanel';
import { depthSplit } from '../src/components/TradeTicket';
import { LeaderboardPanel, myRank } from '../src/components/LeaderboardPanel';
import { MilestonesPanel } from '../src/components/MilestonesPanel';
import { FirstSteps, firstSteps } from '../src/components/FirstSteps';
import { ContractsBoard, contractPremium } from '../src/components/ContractsBoard';
import { BountyBoard } from '../src/components/BountyBoard';
import { TradeFeed } from '../src/components/TradeFeed';
import { WorthChart, ghostWorthAt } from '../src/components/WorthChart';
import { chooseSave, sanitizeHandle, type Session } from '../src/cloud';
import {
  applyOfflineProgress,
  bumpStreak,
  checkMilestones,
  CORRUPT_SAVE_KEY,
  dailySeed,
  deathRecap,
  discardCorruptSave,
  exportSaveString,
  loadCorruptSave,
  fmtCompact,
  fmtDuration,
  ghostForRestart,
  alertHit,
  applyFillToBook,
  blendBuy,
  breakEvenSell,
  bookFromFills,
  emptyTradeBook,
  HUMAN_START_GP,
  importSaveString,
  loadGame,
  newGame,
  nextRoundTarget,
  normalizeGame,
  offlineRatePerMin,
  OFFLINE_CAP_TICKS,
  openFromBook,
  openPosition,
  heldPositions,
  positionConcentration,
  lootSpoils,
  worthBreakdown,
  parseChallengeSeed,
  realizedFromBook,
  tradeRecord,
  realizedPnL,
  streakAtRisk,
  recordDailyBest,
  dailyBestView,
  regionRoster,
  regionMastery,
  expectedHit,
  combatForecast,
  embarkPrep,
  nextRowIndex,
  summarizeDelve,
  recentDelves,
  raidTotals,
  totalRealized,
  totalUnrealized,
  updateNews,
  worthRate,
  type Fill,
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
      tradeBook: emptyTradeBook(),
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

  it('the offline summary reports what the sellsword hunted while away', () => {
    const game = newGame(42);
    const agent = game.world.agents[game.playerId]!;
    applyCommand(game.world, game.playerId, { type: 'buyUpgrade', upgradeId: 'sellsword' });
    applyCommand(game.world, game.playerId, { type: 'configureSellsword', active: true });
    agent.questProgress = 4; // a fightable shallow frontier
    game.lastSeenMs = 1_000;
    const res = applyOfflineProgress(game, 1_000 + 5_000_000)!; // long enough to raid
    expect(res.sellswordKills).toBeGreaterThan(0);
    expect(res.sellswordBanked).toBeGreaterThanOrEqual(0);
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

  it('dailySeed derives a shared YYYYMMDD seed from the UTC date', () => {
    expect(dailySeed(new Date(Date.UTC(2026, 5, 11)))).toBe(20260611); // month is 0-based
    expect(dailySeed(new Date(Date.UTC(2026, 0, 1)))).toBe(20260101);
    expect(dailySeed(new Date(Date.UTC(2026, 11, 31)))).toBe(20261231);
    // late-UTC-day instant still resolves to that UTC calendar day, not the local one
    expect(dailySeed(new Date(Date.UTC(2026, 5, 11, 23, 59, 59)))).toBe(20260611);
  });

  it('shows the "today" daily badge only when the active seed is today\'s daily', () => {
    const { unmount } = render(<App initial={newGame(dailySeed())} />);
    expect(screen.getByText('🗓 today')).toBeTruthy();
    unmount();
    render(<App initial={newGame(42)} />); // a plain seed is never the 8-digit daily
    expect(screen.queryByText('🗓 today')).toBeNull();
  });

  describe('bumpStreak', () => {
    it('starts a fresh streak at 1 (no prior record)', () => {
      expect(bumpStreak(null, 20260611)).toEqual({ count: 1, lastDay: 20260611, best: 1 });
    });
    it('is idempotent within the same UTC day (returns the same reference)', () => {
      const prev = { count: 3, lastDay: 20260611, best: 5 };
      expect(bumpStreak(prev, 20260611)).toBe(prev); // same ref → caller skips the write
    });
    it('increments on consecutive days and tracks the best', () => {
      expect(bumpStreak({ count: 3, lastDay: 20260611, best: 3 }, 20260612)).toEqual({
        count: 4,
        lastDay: 20260612,
        best: 4,
      });
    });
    it('counts month and year rollovers as a single day', () => {
      expect(bumpStreak({ count: 2, lastDay: 20260531, best: 2 }, 20260601).count).toBe(3);
      expect(bumpStreak({ count: 9, lastDay: 20251231, best: 9 }, 20260101).count).toBe(10);
    });
    it('resets to 1 after a skipped day but preserves the best', () => {
      expect(bumpStreak({ count: 7, lastDay: 20260611, best: 7 }, 20260613)).toEqual({
        count: 1,
        lastDay: 20260613,
        best: 7,
      });
    });
    it('resets if the day somehow goes backwards', () => {
      expect(bumpStreak({ count: 4, lastDay: 20260611, best: 4 }, 20260610).count).toBe(1);
    });
  });

  it('lights the streak ember on the daily and persists it', () => {
    render(<App initial={newGame(dailySeed())} />);
    expect(screen.getByText('🔥 1')).toBeTruthy(); // effect bumped null → count 1
    const saved = JSON.parse(localStorage.getItem('ew-daily-streak')!) as { count: number };
    expect(saved.count).toBe(1);
    expect(screen.queryByText(/🔥/)).toBeTruthy();
  });

  it('shows no streak ember off the daily', () => {
    render(<App initial={newGame(42)} />);
    expect(screen.queryByText(/🔥/)).toBeNull();
  });

  describe('streakAtRisk', () => {
    it('is true only when last played exactly yesterday (span 1)', () => {
      expect(streakAtRisk({ count: 3, lastDay: 20260610, best: 3 }, 20260611)).toBe(true);
    });
    it('is false when already played today (span 0)', () => {
      expect(streakAtRisk({ count: 3, lastDay: 20260611, best: 3 }, 20260611)).toBe(false);
    });
    it('is false once the streak is already dead (gap >= 2)', () => {
      expect(streakAtRisk({ count: 3, lastDay: 20260609, best: 3 }, 20260611)).toBe(false);
    });
    it('is false with no streak record', () => {
      expect(streakAtRisk(null, 20260611)).toBe(false);
    });
  });

  it('nudges to keep an at-risk streak when off the daily, pre-filling the daily seed', () => {
    // exactly one UTC day ago — span 1 vs today's daily, so the streak is at risk
    const yesterday = dailySeed(new Date(Date.now() - 86_400_000));
    localStorage.setItem('ew-daily-streak', JSON.stringify({ count: 4, lastDay: yesterday, best: 4 }));
    render(<App initial={newGame(42)} />); // a plain, non-daily world
    const cta = screen.getByText(/keep your streak/i);
    expect(cta).toBeTruthy();
    fireEvent.click(cta); // soft-confirm: pre-fills the seed form, never nukes the run outright
    expect((screen.getByLabelText('seed') as HTMLInputElement).value).toBe(String(dailySeed()));
  });

  it('shows no streak nudge when already on today\'s daily', () => {
    const yesterday = dailySeed(new Date(Date.now() - 86_400_000));
    localStorage.setItem('ew-daily-streak', JSON.stringify({ count: 4, lastDay: yesterday, best: 4 }));
    render(<App initial={newGame(dailySeed())} />);
    expect(screen.queryByText(/keep your streak/i)).toBeNull();
  });

  describe('recordDailyBest', () => {
    const TODAY = 20260611;
    it('first play of a daily starts the record at the current worth', () => {
      expect(recordDailyBest(null, TODAY, 1000)).toEqual({ day: TODAY, best: 1000 });
    });
    it('keeps the running max on the same day', () => {
      expect(recordDailyBest({ day: TODAY, best: 1000 }, TODAY, 1500)).toEqual({ day: TODAY, best: 1500 });
    });
    it('returns the same ref when worth does not beat the record (skips the write)', () => {
      const prev = { day: TODAY, best: 1500 };
      expect(recordDailyBest(prev, TODAY, 1200)).toBe(prev); // identity — no new high
    });
    it('a new day resets the record to the current worth', () => {
      expect(recordDailyBest({ day: TODAY, best: 1500 }, 20260612, 800)).toEqual({ day: 20260612, best: 800 });
    });
  });

  describe('dailyBestView', () => {
    const TODAY = 20260611;
    it('hidden off the record day, or before any progress past the start', () => {
      expect(dailyBestView(null, TODAY, 9999, 100)).toBeNull();
      expect(dailyBestView({ day: 20260610, best: 5000 }, TODAY, 9999, 100)).toBeNull(); // stale day
      expect(dailyBestView({ day: TODAY, best: 100 }, TODAY, 100, 100)).toBeNull(); // best == start, no progress
    });
    it('shown once past the start; atPeak true only when worth is at/above the best', () => {
      expect(dailyBestView({ day: TODAY, best: 1500 }, TODAY, 1200, 1000)).toEqual({ best: 1500, atPeak: false });
      expect(dailyBestView({ day: TODAY, best: 1500 }, TODAY, 1500, 1000)).toEqual({ best: 1500, atPeak: true });
    });
  });

  it('shows your daily best to beat on the daily, persisted across reloads', () => {
    localStorage.setItem('ew-daily-best', JSON.stringify({ day: dailySeed(), best: HUMAN_START_GP + 10_000 }));
    render(<App initial={newGame(dailySeed())} />);
    expect(screen.getByText(`🏁 ${fmtCompact(HUMAN_START_GP + 10_000)}`)).toBeTruthy();
  });

  it('shows no daily-best tag off the daily', () => {
    localStorage.setItem('ew-daily-best', JSON.stringify({ day: dailySeed(), best: HUMAN_START_GP + 10_000 }));
    render(<App initial={newGame(42)} />);
    expect(screen.queryByText(/🏁/)).toBeNull();
  });

  describe('regionMastery', () => {
    it('rosters a region as its pool plus elite, deduped & order-stable', () => {
      expect(regionRoster({ monsters: ['a', 'b'] })).toEqual(['a', 'b']);
      expect(regionRoster({ monsters: ['a', 'b'], elite: 'z' })).toEqual(['a', 'b', 'z']);
      expect(regionRoster({ monsters: ['a', 'a', 'b'], elite: 'b' })).toEqual(['a', 'b']); // deduped
    });
    it('counts distinct roster foes slain; done only when all (incl. elite) fall', () => {
      const region = { monsters: ['a', 'b'], elite: 'z' };
      expect(regionMastery(region, undefined)).toEqual({ slain: 0, total: 3, done: false });
      expect(regionMastery(region, { a: 5, b: 0 })).toEqual({ slain: 1, total: 3, done: false });
      expect(regionMastery(region, { a: 1, b: 2 })).toEqual({ slain: 2, total: 3, done: false }); // elite alive
      expect(regionMastery(region, { a: 1, b: 2, z: 1 })).toEqual({ slain: 3, total: 3, done: true });
    });
    it('an empty roster is never done (and never divides by zero)', () => {
      expect(regionMastery({ monsters: [] }, { a: 1 })).toEqual({ slain: 0, total: 0, done: false });
    });
  });

  it('the Conquest panel crowns a region once its whole roster is slain', () => {
    const game = newGame(42);
    const r0 = REGIONS[0]!;
    const roster = r0.elite ? [...r0.monsters, r0.elite] : r0.monsters;
    game.world.stats.killsByMonster = Object.fromEntries(roster.map((id) => [id, 1]));
    render(<ConquestPanel game={game} />);
    expect(screen.getByText(r0.name, { exact: false })).toBeTruthy(); // region row present
    expect(screen.getByText(`1/${REGIONS.length} mastered`)).toBeTruthy(); // exactly one conquered
  });

  describe('nextRowIndex (market keyboard nav)', () => {
    it('clamps at both ends, no wrap', () => {
      expect(nextRowIndex(0, 1, 3)).toBe(1);
      expect(nextRowIndex(2, 1, 3)).toBe(2); // bottom — stays
      expect(nextRowIndex(0, -1, 3)).toBe(0); // top — stays
    });
    it('an unselected cursor (-1) lands on the first row either way', () => {
      expect(nextRowIndex(-1, 1, 3)).toBe(0);
      expect(nextRowIndex(-1, -1, 3)).toBe(0);
    });
    it('no rows → -1 (nothing to select)', () => {
      expect(nextRowIndex(0, 1, 0)).toBe(-1);
    });
  });

  describe('MarketTable keyboard nav', () => {
    const mkt = (itemId: string) => ({
      itemId, bestBid: 1, bestAsk: 2, lastPrice: 1, ema: 1, volume: 0, bestBidIsMine: false, bestAskIsMine: false,
    });
    const ids = DEFAULT_ITEMS.slice(0, 3).map((i) => i.id);
    const view = { markets: ids.map(mkt) } as unknown as PlayerView;

    it('j / k walk the selection through the displayed order, clamped at the ends', () => {
      const onSelect = vi.fn();
      const { rerender } = render(
        <MarketTable view={view} items={DEFAULT_ITEMS} trades={[]} selected={ids[0]!} onSelect={onSelect} eventItems={new Set()} active />,
      );
      fireEvent.keyDown(document.body, { key: 'j' });
      expect(onSelect).toHaveBeenLastCalledWith(ids[1]); // first → second
      rerender(
        <MarketTable view={view} items={DEFAULT_ITEMS} trades={[]} selected={ids[2]!} onSelect={onSelect} eventItems={new Set()} active />,
      );
      fireEvent.keyDown(document.body, { key: 'ArrowDown' });
      expect(onSelect).toHaveBeenLastCalledWith(ids[2]); // at the bottom — clamps, no wrap
      fireEvent.keyDown(document.body, { key: 'k' });
      expect(onSelect).toHaveBeenLastCalledWith(ids[1]); // last → second
    });

    it('does nothing when the Exchange tab is not the active room', () => {
      const onSelect = vi.fn();
      render(
        <MarketTable view={view} items={DEFAULT_ITEMS} trades={[]} selected={ids[0]!} onSelect={onSelect} eventItems={new Set()} active={false} />,
      );
      fireEvent.keyDown(document.body, { key: 'j' });
      expect(onSelect).not.toHaveBeenCalled();
    });

    it('ignores the keys while typing in the filter input', () => {
      const onSelect = vi.fn();
      render(
        <MarketTable view={view} items={DEFAULT_ITEMS} trades={[]} selected={ids[0]!} onSelect={onSelect} eventItems={new Set()} active />,
      );
      const filter = screen.getByPlaceholderText(/filter items/i);
      fireEvent.keyDown(filter, { key: 'j' }); // target is the INPUT — guarded
      expect(onSelect).not.toHaveBeenCalled();
    });
  });

  describe('Delve Log', () => {
    it('summarizeDelve maps an ending expedition to a record; died is the in-combat signal', () => {
      const snap = { regionId: 'wilderness_ruins', cleared: 4, packGp: 1840 };
      expect(summarizeDelve(snap, false, 500)).toEqual({ tick: 500, regionId: 'wilderness_ruins', kills: 4, lootGp: 1840, died: false });
      expect(summarizeDelve(snap, true, 500)).toEqual({ tick: 500, regionId: 'wilderness_ruins', kills: 4, lootGp: 1840, died: true });
    });
    it('recentDelves is newest-first and capped, undefined → empty', () => {
      const log = Array.from({ length: 5 }, (_, i) => ({ tick: i, regionId: 'r', kills: i, lootGp: i, died: false }));
      expect(recentDelves(log, 3).map((d) => d.tick)).toEqual([4, 3, 2]);
      expect(recentDelves(undefined, 3)).toEqual([]);
    });
    it('DelvePanel shows the empty state with no delves', () => {
      render(<DelvePanel game={newGame(42)} />);
      expect(screen.getByText(/no expeditions yet/i)).toBeTruthy();
    });
    it('DelvePanel lists finished delves with their outcome', () => {
      const game = newGame(42);
      game.delves = [
        { tick: game.world.tick, regionId: REGIONS[0]!.id, kills: 2, lootGp: 500, died: false },
        { tick: game.world.tick, regionId: REGIONS[0]!.id, kills: 1, lootGp: 300, died: true },
      ];
      render(<DelvePanel game={game} />);
      expect(screen.getByText(/2 runs/)).toBeTruthy();
      expect(screen.getByText(/banked/)).toBeTruthy(); // 500 from the survived run
      expect(screen.getByText(/lost/)).toBeTruthy(); // 300 forfeited to the death
      expect(screen.getByText('🏆', { exact: false })).toBeTruthy(); // survived row
      expect(screen.getByText('☠', { exact: false })).toBeTruthy(); // died row
    });
    it('raidTotals sums loot banked on survival vs lost to deaths', () => {
      expect(raidTotals(undefined)).toEqual({ runs: 0, deaths: 0, banked: 0, lost: 0 });
      const delves = [
        { tick: 0, regionId: 'r', kills: 2, lootGp: 500, died: false },
        { tick: 1, regionId: 'r', kills: 4, lootGp: 900, died: false },
        { tick: 2, regionId: 'r', kills: 1, lootGp: 300, died: true },
      ];
      expect(raidTotals(delves)).toEqual({ runs: 3, deaths: 1, banked: 1400, lost: 300 });
    });
    it('a Delve Log row calls onPick with its region (raid here again)', () => {
      const game = newGame(42);
      game.delves = [{ tick: game.world.tick, regionId: REGIONS[2]!.id, kills: 2, lootGp: 500, died: false }];
      const onPick = vi.fn();
      render(<DelvePanel game={game} onPick={onPick} />);
      fireEvent.click(screen.getByText(REGIONS[2]!.name, { exact: false }));
      expect(onPick).toHaveBeenCalledWith(REGIONS[2]!.id);
    });
    it('clicking a Delve Log row jumps to the Adventure tab', () => {
      const game = newGame(42);
      game.delves = [{ tick: game.world.tick, regionId: REGIONS[2]!.id, kills: 2, lootGp: 500, died: false }];
      render(<App initial={game} />); // Hall is tabhidden but in the DOM
      fireEvent.click(screen.getByTitle(/click to raid here again/)); // unique to a Delve Log row
      expect(screen.getByRole('tab', { name: /Adventure/ }).getAttribute('aria-selected')).toBe('true');
    });
  });

  describe('combat forecast', () => {
    it('expectedHit mirrors the engine damage() mean (quest.ts:394)', () => {
      expect(expectedHit(3, 0)).toBe(2); // roll [1..3] mean 2, no armour
      expect(expectedHit(24, 11)).toBe(14); // roll [8..24] mean 16, −floor(11/4)=2
      expect(expectedHit(4, 40)).toBe(1); // heavy armour floors the hit at 1
    });
    it('forecasts the exchange; a tie favours the player (strikes first)', () => {
      const strong = combatForecast({ atk: 50, def: 40, hp: 80 }, { atk: 4, def: 1, hp: 12 });
      expect(strong).toMatchObject({ roundsToKill: 1, favored: true });
      const outmatched = combatForecast({ atk: 30, def: 20, hp: 50 }, { atk: 24, def: 13, hp: 130 });
      expect(outmatched.favored).toBe(false);
      expect(outmatched.roundsToKill).toBeGreaterThan(outmatched.roundsToFall);
    });
    it('a foe-hit bonus (dragonfire) shortens rounds-to-fall, not rounds-to-kill', () => {
      const you = { atk: 20, def: 20, hp: 50 };
      const foe = { atk: 20, def: 10, hp: 60 };
      const base = combatForecast(you, foe);
      const drag = combatForecast(you, foe, 5); // +5/round incoming
      expect(drag.roundsToFall).toBeLessThan(base.roundsToFall);
      expect(drag.roundsToKill).toBe(base.roundsToKill); // your damage is unaffected
    });
  });

  it('the embark screen forecasts the exchange vs the hardest foe', () => {
    freshApp(); // adventure room mounted (tabhidden but in the DOM); fresh player, no active dive
    expect(screen.getByText(/forecast:/)).toBeTruthy();
    expect(screen.getByText(/favored|risky/)).toBeTruthy();
  });

  describe('embarkPrep', () => {
    it('warns to pack antifire for a fiery region with none packed; clears once packed / non-fiery', () => {
      expect(embarkPrep({ fiery: true, hasAntifire: false, hasFood: true, riskyFight: false })).toEqual([
        { kind: 'antifire', text: '🔥 foes here breathe fire — pack antifire or you will burn' },
      ]);
      expect(embarkPrep({ fiery: true, hasAntifire: true, hasFood: true, riskyFight: false })).toEqual([]);
      expect(embarkPrep({ fiery: false, hasAntifire: false, hasFood: true, riskyFight: false })).toEqual([]);
    });
    it('warns about no food only when the fight is risky', () => {
      expect(embarkPrep({ fiery: false, hasAntifire: true, hasFood: false, riskyFight: true })).toEqual([
        { kind: 'food', text: '🍖 no food packed — a hard fight here and you cannot heal' },
      ]);
      expect(embarkPrep({ fiery: false, hasAntifire: true, hasFood: false, riskyFight: false })).toEqual([]);
    });
    it('stacks both warnings when both apply', () => {
      expect(embarkPrep({ fiery: true, hasAntifire: false, hasFood: false, riskyFight: true })).toHaveLength(2);
    });
  });

  it('the embark screen does not nag for antifire on a non-fiery region', () => {
    freshApp(); // lumbridge_plains (region 0) has no dragonfire foes
    expect(screen.queryByText(/breathe fire/)).toBeNull();
  });

  it('the antifire warning offers a one-click pack that clears it', () => {
    const game = newGame(42);
    game.world.agents[game.playerId]!.inventory.super_antifire_potion_4 = 3; // owned, not packed
    game.delves = [{ tick: 0, regionId: 'dragons_maw', kills: 1, lootGp: 0, died: false }]; // a fire region
    render(<App initial={game} />);
    fireEvent.click(screen.getByTitle(/raid here again/)); // 12l jump → selects dragons_maw on the embark screen
    expect(screen.getByText(/breathe fire/)).toBeTruthy();
    fireEvent.click(screen.getAllByText(/\+ pack/)[0]!); // pack the antifire from the bank
    expect(screen.queryByText(/breathe fire/)).toBeNull(); // now packed → warning gone
  });

  describe('positionConcentration', () => {
    const pos = (itemId: string, value: number) => ({
      itemId, value, units: 0, avgCost: 0, mark: 0, marked: true, cost: 0, unrealized: 0, unrealizedPct: 0,
    });
    it('weights each holding by marked value, largest first; topPct is the max', () => {
      const c = positionConcentration([pos('a', 1000), pos('b', 3000)]);
      expect(c.count).toBe(2);
      expect(c.topPct).toBeCloseTo(0.75);
      expect(c.weights.map((w) => w.itemId)).toEqual(['b', 'a']); // 75% before 25%
      expect(c.weights[0]!.pct + c.weights[1]!.pct).toBeCloseTo(1);
    });
    it('empty book → zeros', () => {
      expect(positionConcentration([])).toEqual({ weights: [], topPct: 0, count: 0 });
    });
  });

  it('PositionsPanel shows the allocation concentration of your holdings', () => {
    const game = newGame(42);
    const A = DEFAULT_ITEMS[0]!;
    const B = DEFAULT_ITEMS[1]!;
    game.tradeBook = bookFromFills(
      [
        { tick: 0, itemId: A.id, side: 'buy', qty: 10, price: 100 },
        { tick: 0, itemId: B.id, side: 'buy', qty: 10, price: 100 },
      ],
      0.02,
    );
    const view = {
      markets: [
        { itemId: A.id, lastPrice: 300 }, // value 3000
        { itemId: B.id, lastPrice: 100 }, // value 1000 → A is 75% of the book
      ],
    } as unknown as PlayerView;
    render(<PositionsPanel game={game} view={view} items={DEFAULT_ITEMS} onSelect={() => {}} />);
    expect(screen.getByText(/2 positions/)).toBeTruthy();
    expect(screen.getByText(/75\.0%/)).toBeTruthy(); // top concentration
  });

  describe('worthBreakdown', () => {
    it('splits net worth into cash, buy-order escrow, and holdings (residual)', () => {
      const view = {
        gp: 1000,
        openOrders: [
          { side: 'buy', price: 50, remaining: 4 }, // 200 escrow
          { side: 'sell', price: 80, remaining: 3 }, // ignored — sell escrow lives in holdings
        ],
      } as unknown as PlayerView;
      const b = worthBreakdown(view, 1500);
      expect(b).toEqual({ cash: 1000, buyOrders: 200, holdings: 300, total: 1500 });
      expect(b.cash + b.buyOrders + b.holdings).toBe(b.total); // splits sum to the whole
    });
    it('clamps a negative residual to zero', () => {
      const view = { gp: 1000, openOrders: [] } as unknown as PlayerView;
      expect(worthBreakdown(view, 800).holdings).toBe(0);
    });
  });

  it('WealthPanel shows the net-worth composition by liquidity', () => {
    const game = newGame(42);
    const view = { gp: 1000, openOrders: [{ side: 'buy', price: 50, remaining: 4 }] } as unknown as PlayerView;
    render(<WealthPanel game={game} view={view} worth={2000} />); // cash 50% · offers 10% · goods 40%
    expect(screen.getByText(/net/)).toBeTruthy();
    expect(screen.getByText('cash', { exact: false })).toBeTruthy();
    expect(screen.getByText('40%')).toBeTruthy(); // goods share
  });

  describe('lootSpoils', () => {
    it('keeps gear out of the bulk dump', () => {
      const isGear = (id: string) => id === 'rune_2h_sword' || id === 'rune_platebody';
      expect(lootSpoils(['snapdragon_seed', 'rune_2h_sword', 'magic_seed', 'rune_platebody'], isGear)).toEqual([
        'snapdragon_seed',
        'magic_seed',
      ]);
    });
  });

  it('"sell the spoils" dumps loot but keeps your gear', () => {
    const game = newGame(42);
    for (let i = 0; i < 200; i++) tickWorld(game.world); // populate NPC bids so items are sellable
    const agent = game.world.agents[game.playerId]!;
    agent.inventory.snapdragon_seed = 50; // non-gear loot → dumped
    agent.inventory.magic_seed = 5; // non-gear loot → dumped (a second, so the bulk button shows)
    agent.inventory.rune_2h_sword = 1; // gear → KEPT
    const onCommand = vi.fn();
    const view = playerView(game.world, game.playerId)!;
    render(<PlayerPanel game={game} view={view} items={game.world.items} onCommand={onCommand} />);
    fireEvent.click(screen.getByText('sell the spoils'));
    const sold = onCommand.mock.calls.map((c) => (c[0] as { itemId: string }).itemId);
    expect(sold).toContain('snapdragon_seed');
    expect(sold).not.toContain('rune_2h_sword'); // your raiding kit survives the bulk sell
  });

  describe('tradeRecord', () => {
    it('counts winners/losers and pins best + worst by net profit', () => {
      const book = emptyTradeBook();
      book.realized = {
        a: { profit: 500, soldUnits: 5 },
        b: { profit: -200, soldUnits: 3 },
        c: { profit: 1200, soldUnits: 2 },
      };
      expect(tradeRecord(book)).toEqual({
        winners: 2,
        losers: 1,
        best: { itemId: 'c', profit: 1200 },
        worst: { itemId: 'b', profit: -200 },
      });
    });
    it('empty book → zeros and no standouts', () => {
      expect(tradeRecord(emptyTradeBook())).toEqual({ winners: 0, losers: 0, best: null, worst: null });
    });
  });

  it('ProfitPanel shows flip consistency (hit-rate + worst item)', () => {
    const game = newGame(42);
    const SECOND = DEFAULT_ITEMS[1]!;
    game.tradeBook = bookFromFills(
      [
        { tick: 0, itemId: FIRST.id, side: 'buy', qty: 10, price: 100 },
        { tick: 1, itemId: FIRST.id, side: 'sell', qty: 10, price: 200 }, // win
        { tick: 2, itemId: SECOND.id, side: 'buy', qty: 10, price: 200 },
        { tick: 3, itemId: SECOND.id, side: 'sell', qty: 10, price: 100 }, // loss
      ],
      0.02,
    );
    const view = { markets: [] } as unknown as PlayerView;
    render(<ProfitPanel game={game} view={view} items={DEFAULT_ITEMS} onSelect={() => {}} />);
    expect(screen.getByText(/of 2 items/)).toBeTruthy(); // both flips scored
    expect(screen.getByText(/worst/)).toBeTruthy(); // the loss is surfaced
  });

  it('loadCorruptSave / discardCorruptSave round-trip the quarantine', () => {
    expect(loadCorruptSave()).toBeNull();
    localStorage.setItem(CORRUPT_SAVE_KEY, 'broken{{{');
    expect(loadCorruptSave()).toBe('broken{{{');
    discardCorruptSave();
    expect(loadCorruptSave()).toBeNull();
  });

  it('surfaces a recovery banner for a quarantined save and discards it on demand', () => {
    localStorage.setItem(CORRUPT_SAVE_KEY, '{"half":"baked"}');
    render(<App initial={newGame(42)} />);
    expect(screen.getByText(/preserved, not lost/i)).toBeTruthy();
    fireEvent.click(screen.getByText('discard'));
    expect(localStorage.getItem(CORRUPT_SAVE_KEY)).toBeNull(); // quarantine cleared
    expect(screen.queryByText(/preserved, not lost/i)).toBeNull(); // banner dismissed
  });

  it('shows no recovery banner when there is no quarantine', () => {
    render(<App initial={newGame(42)} />);
    expect(screen.queryByText(/preserved, not lost/i)).toBeNull();
  });

  describe('rankFlips', () => {
    const TAX = 0.02;
    const mk = (itemId: string, bestBid: number | null, bestAsk: number | null) => ({ itemId, bestBid, bestAsk });
    it('ranks profitable two-sided books by net margin, excluding thin + one-sided', () => {
      const picks = rankFlips(
        [
          mk('a', 100, 110), // buy 101, sell 109, tax 2 → margin 6
          mk('b', 1000, 1100), // buy 1001, sell 1099, tax 21 → margin 77
          mk('c', 50, 51), // buy 51, sell 50 → margin -2, excluded
          mk('d', 200, null), // one-sided book → excluded
        ],
        TAX,
      );
      expect(picks.map((p) => p.id)).toEqual(['b', 'a']); // best margin first
      expect(picks[0]).toMatchObject({ id: 'b', buy: 1001, sell: 1099, margin: 77 });
      expect(picks[1]!.margin).toBe(6);
    });
    it('returns [] when no spread clears the tax, and respects the limit', () => {
      expect(rankFlips([mk('c', 50, 51)], TAX)).toEqual([]);
      const many = Array.from({ length: 6 }, (_, i) => mk(`i${i}`, 100, 200)); // all margin 95
      expect(rankFlips(many, TAX, 4)).toHaveLength(4);
    });
  });

  it('TopFlips renders profitable rows and loads the flip (id + buy price) on click', () => {
    const onSelect = vi.fn();
    const view = { markets: [{ itemId: 'gold_bar', bestBid: 1000, bestAsk: 1100 }] } as unknown as PlayerView;
    const items = [{ id: 'gold_bar', name: 'Gold bar' }] as unknown as ItemDef[];
    render(<TopFlips view={view} items={items} onSelect={onSelect} />);
    expect(screen.getByText('+77')).toBeTruthy();
    fireEvent.click(screen.getByText('Gold bar'));
    expect(onSelect).toHaveBeenCalledWith('gold_bar', 1001); // bestBid + 1 → buy leg prefill
  });

  it('TopFlips shows the empty state when nothing clears the tax', () => {
    const view = { markets: [{ itemId: 'x', bestBid: 50, bestAsk: 51 }] } as unknown as PlayerView;
    render(<TopFlips view={view} items={[] as unknown as ItemDef[]} onSelect={() => {}} />);
    expect(screen.getByText(/no profitable flips right now/i)).toBeTruthy();
  });

  it('rankFlips carries return-on-cost and the GE buy limit (null = unlimited)', () => {
    const limited = rankFlips([{ itemId: 'a', bestBid: 1000, bestAsk: 1100, buyRemaining: 500 }], 0.02);
    expect(limited[0]!.margin).toBe(77); // buy 1001, sell 1099, tax 21
    expect(limited[0]!.limit).toBe(500);
    expect(limited[0]!.roi).toBeCloseTo(77 / 1001, 5);
    const unlimited = rankFlips([{ itemId: 'a', bestBid: 1000, bestAsk: 1100 }], 0.02);
    expect(unlimited[0]!.limit).toBeNull();
  });

  it('TopFlips renders the buy limit and return-on-cost on a flip row', () => {
    const view = { markets: [{ itemId: 'gold_bar', bestBid: 1000, bestAsk: 1100, buyRemaining: 500 }] } as unknown as PlayerView;
    const items = [{ id: 'gold_bar', name: 'Gold bar' }] as unknown as ItemDef[];
    render(<TopFlips view={view} items={items} onSelect={() => {}} />);
    expect(screen.getByText(/≤500/)).toBeTruthy(); // buy limit badge
    expect(screen.getByText('7.7%')).toBeTruthy(); // 77/1001 return-on-cost
  });

  describe('lockedUpgrades', () => {
    // Atk 1 / Def 8: holds two better pieces it can't wear yet (dragon longsword
    // req 20, rune platebody req 12) over what it can (adamant dart, rune chainbody).
    const INV = { adamant_dart: 1, dragon_longsword: 1, rune_chainbody: 1, rune_platebody: 1, rune_full_helm: 1 };
    it('surfaces held-but-unusable upgrades, skipping already-usable slots', () => {
      const worn = equipped(INV, { atk: 1, def: 8 });
      expect(worn.weapon).toBe('adamant_dart');
      expect(worn.body).toBe('rune_chainbody');
      const lock = lockedUpgrades(INV, { atk: 1, def: 8 }, worn);
      expect(lock.weapon).toMatchObject({ id: 'dragon_longsword', req: 20, skill: 'atk' });
      expect(lock.body).toMatchObject({ id: 'rune_platebody', req: 12, skill: 'def' });
      expect(lock.helm).toBeUndefined(); // rune_full_helm already usable, nothing better held
    });
    it('yields no locks once levels meet every requirement', () => {
      const worn = equipped(INV, { atk: 99, def: 99 });
      expect(lockedUpgrades(INV, { atk: 99, def: 99 }, worn)).toEqual({});
      expect(worn.weapon).toBe('dragon_longsword'); // now the best is actually worn
    });
  });

  describe('fmtCompact', () => {
    it('keeps sub-10k exact, compacts larger aggregates to 3 sig figs', () => {
      expect(fmtCompact(0)).toBe('0');
      expect(fmtCompact(9_999)).toBe('9,999');
      expect(fmtCompact(10_000)).toBe('10K');
      expect(fmtCompact(12_345)).toBe('12.3K');
      expect(fmtCompact(1_234_567)).toBe('1.23M');
      expect(fmtCompact(-45_678)).toBe('-45.7K');
      expect(fmtCompact(1_500_000_000)).toBe('1.5B');
    });
  });

  it('shows a net-worth trajectory sparkline once history accrues', () => {
    freshApp(); // one worth sample at boot → no trajectory yet
    expect(screen.queryByLabelText('net worth trend')).toBeNull();
    fireEvent.click(screen.getByText('+1k')); // +1000 ticks → a 2nd worth sample
    expect(screen.getByLabelText('net worth trend')).toBeTruthy();
  });

  it('compacts the masthead rate cue for large earning rates', () => {
    const game = newGame(42);
    game.lastSeenMs = Date.now();
    // +1,000,000 over 600 ticks = +100,000/min → compacted
    game.worthHistory = [
      { tick: 0, worth: 55_000 },
      { tick: 600, worth: 1_055_000 },
    ];
    render(<App initial={game} />);
    expect(screen.getByText(/\+100K gp\/min/)).toBeTruthy();
  });

  describe('worthRate', () => {
    it('needs ≥2 samples spanning real ticks', () => {
      expect(worthRate([])).toBeNull();
      expect(worthRate([{ tick: 0, worth: 55_000 }])).toBeNull();
      // only the last sample falls inside the window → no measurable span
      expect(worthRate([{ tick: 0, worth: 55_000 }, { tick: 1_000, worth: 56_000 }], 600)).toBeNull();
    });
    it('reports gp/min slope over the window (60 ticks = 1 min)', () => {
      expect(worthRate([{ tick: 0, worth: 55_000 }, { tick: 600, worth: 61_000 }], 600)).toEqual({
        perMin: 600, // +6000 over 600 ticks = +10/tick = +600/min
        spanTicks: 600,
      });
      expect(worthRate([{ tick: 0, worth: 60_000 }, { tick: 300, worth: 57_000 }], 600)!.perMin).toBe(-600);
    });
    it('measures only samples within the window, ignoring older ones', () => {
      const h = [
        { tick: 0, worth: 50_000 }, // outside a 600-tick window ending at 1000
        { tick: 500, worth: 50_000 },
        { tick: 1_000, worth: 56_000 },
      ];
      expect(worthRate(h, 600)).toEqual({ perMin: 720, spanTicks: 500 }); // +6000 over 500 ticks
    });
  });

  it('shows the earning-rate cue in the masthead from worth history', () => {
    const game = newGame(42);
    game.lastSeenMs = Date.now(); // no offline accrual to perturb the history
    game.worthHistory = [
      { tick: 0, worth: 55_000 },
      { tick: 600, worth: 61_000 },
    ];
    render(<App initial={game} />);
    expect(screen.getByText(/\+600 gp\/min/)).toBeTruthy();
  });

  describe('recordRows', () => {
    it('reads stats with zero defaults and hides sellsword rows until used', () => {
      const rows = recordRows({ contractsFilled: 3, bountiesClaimed: 5 } as unknown as SimStats);
      const byLabel = Object.fromEntries(rows.map((r) => [r.label, r.value]));
      expect(byLabel['Bounties claimed']).toBe('5');
      expect(byLabel['Contracts filled']).toBe('3');
      expect(byLabel['Monsters slain']).toBe('0'); // absent → 0
      expect(rows.some((r) => r.label.startsWith('Sellsword'))).toBe(false);
    });
    it('appends compacted sellsword rows once the hireling has banked gp', () => {
      const rows = recordRows({ sellswordKills: 4, sellswordBanked: 1_234_567 } as unknown as SimStats);
      const banked = rows.find((r) => r.label === 'Sellsword gp banked')!;
      expect(banked.value).toBe('1.23M'); // compacted
      expect(banked.title).toBe('1,234,567 gp'); // exact in the tooltip
      expect(rows.find((r) => r.label === 'Sellsword kills')!.value).toBe('4');
    });
  });

  describe('depthSplit', () => {
    it('splits the resting book into bid/ask percentages, null when empty', () => {
      expect(depthSplit(100, 100)).toEqual({ bidPct: 50, askPct: 50 });
      expect(depthSplit(75, 25)).toEqual({ bidPct: 75, askPct: 25 });
      expect(depthSplit(30, 0)).toEqual({ bidPct: 100, askPct: 0 });
      expect(depthSplit(0, 50)).toEqual({ bidPct: 0, askPct: 100 });
      expect(depthSplit(0, 0)).toBeNull();
    });
  });

  it('the ticket shows an order-book liquidity bar once the book has depth', () => {
    freshApp(); // seed 42, paused
    fireEvent.click(screen.getByText('+1k')); // run 1000 ticks → the book fills
    expect(document.querySelector('.depthbar')).toBeTruthy();
  });

  describe('realizedPnL', () => {
    const TAX = 0.02;
    const buy = (itemId: string, qty: number, price: number, tick = 0): Fill => ({ tick, itemId, side: 'buy', qty, price });
    const sell = (itemId: string, qty: number, price: number, tick = 1): Fill => ({ tick, itemId, side: 'sell', qty, price });
    it('matches a clean round-trip and nets the sell tax', () => {
      // sell 120, tax floor(2.4)=2 → proceeds 118/unit; (118-100)*10 = 180
      expect(realizedPnL([buy('rune', 10, 100), sell('rune', 10, 120)], TAX)).toEqual([
        { itemId: 'rune', profit: 180, soldUnits: 10 },
      ]);
    });
    it('FIFO-matches across buy lots and tolerates a loss leg', () => {
      // proceeds 147; 5@100 → +235, 3@200 → -159; net 76 over 8 units
      expect(realizedPnL([buy('x', 5, 100), buy('x', 5, 200), sell('x', 8, 150)], TAX)[0]).toEqual({
        itemId: 'x',
        profit: 76,
        soldUnits: 8,
      });
    });
    it('excludes open positions + cost-basis-less sells, sorts by profit', () => {
      const r = realizedPnL(
        [
          buy('win', 1, 100),
          sell('win', 1, 200), // 196-100 = +96
          buy('lose', 1, 200),
          sell('lose', 1, 100), // 98-200 = -102
          buy('open', 5, 50), // never sold → excluded
          sell('orphan', 3, 90), // no cost basis → excluded
        ],
        TAX,
      );
      expect(r.map((p) => p.itemId)).toEqual(['win', 'lose']); // profit-descending
      expect(r.find((p) => p.itemId === 'win')!.profit).toBe(96);
      expect(r.find((p) => p.itemId === 'lose')!.profit).toBe(-102);
    });
  });

  it('ProfitPanel shows realized profit per item and selects on click', () => {
    const game = newGame(42);
    game.tradeBook = bookFromFills(
      [
        { tick: 0, itemId: FIRST.id, side: 'buy', qty: 10, price: 100 },
        { tick: 1, itemId: FIRST.id, side: 'sell', qty: 10, price: 120 },
      ],
      0.02,
    );
    const onSelect = vi.fn();
    const view = { markets: [] } as unknown as PlayerView;
    render(<ProfitPanel game={game} view={view} items={DEFAULT_ITEMS} onSelect={onSelect} />);
    expect(screen.getAllByText('+180').length).toBeGreaterThan(0); // row + header realized total
    expect(screen.getByText(/realized/)).toBeTruthy(); // scorecard header
    fireEvent.click(screen.getByText(FIRST.name));
    expect(onSelect).toHaveBeenCalledWith(FIRST.id);
  });

  it('ProfitPanel shows the empty state before any completed flip', () => {
    const view = { markets: [] } as unknown as PlayerView;
    render(<ProfitPanel game={newGame(42)} view={view} items={DEFAULT_ITEMS} onSelect={() => {}} />);
    expect(screen.getByText(/no completed flips yet/i)).toBeTruthy();
  });

  describe('heldPositions', () => {
    const mk = (lots: Record<string, { price: number; qty: number }[]>) => ({ lots, realized: {} });
    it('marks each held position to a live price, best paper P&L first', () => {
      const book = mk({ a: [{ price: 100, qty: 10 }], b: [{ price: 50, qty: 5 }] });
      const mark: Record<string, number> = { a: 130, b: 40 }; // a +300 (+30%), b -50 (-20%)
      const pos = heldPositions(book, (id) => mark[id] ?? 0);
      expect(pos.map((p) => p.itemId)).toEqual(['a', 'b']); // +300 sorts before -50
      expect(pos[0]).toMatchObject({
        itemId: 'a',
        units: 10,
        avgCost: 100,
        mark: 130,
        marked: true,
        value: 1300,
        cost: 1000,
        unrealized: 300,
      });
      expect(pos[0]!.unrealizedPct).toBeCloseTo(0.3);
      expect(pos[1]).toMatchObject({ itemId: 'b', unrealized: -50 });
    });
    it('an unmarked position (no live price) is listed flat, not a fake total loss', () => {
      const [p] = heldPositions(mk({ a: [{ price: 100, qty: 4 }] }), () => 0);
      expect(p).toMatchObject({ marked: false, mark: 100, value: 400, cost: 400, unrealized: 0, unrealizedPct: 0 });
    });
    it('empty book → no positions', () => {
      expect(heldPositions(emptyTradeBook(), () => 100)).toEqual([]);
    });
  });

  it('PositionsPanel shows held positions with paper P&L and selects on click', () => {
    const game = newGame(42);
    game.tradeBook = bookFromFills([{ tick: 0, itemId: FIRST.id, side: 'buy', qty: 10, price: 100 }], 0.02);
    const onSelect = vi.fn();
    const view = { markets: [{ itemId: FIRST.id, lastPrice: 130 }] } as unknown as PlayerView; // +300 paper
    render(<PositionsPanel game={game} view={view} items={DEFAULT_ITEMS} onSelect={onSelect} />);
    expect(screen.getByText('100→130')).toBeTruthy(); // avg → mark on the row
    expect(screen.getAllByText(/\+300/).length).toBeGreaterThan(0); // row + header paper total
    fireEvent.click(screen.getByText(FIRST.name));
    expect(onSelect).toHaveBeenCalledWith(FIRST.id);
  });

  it('PositionsPanel shows the empty state with no holdings', () => {
    const view = { markets: [] } as unknown as PlayerView;
    render(<PositionsPanel game={newGame(42)} view={view} items={DEFAULT_ITEMS} onSelect={() => {}} />);
    expect(screen.getByText(/no open positions/i)).toBeTruthy();
  });

  describe('blendBuy (average-down preview)', () => {
    it('blends the new buy into your held cost basis, signed by direction', () => {
      const hold = { units: 10, avgCost: 100 };
      expect(blendBuy(hold, 10, 80)).toEqual({ units: 20, avgCost: 90, prevUnits: 10, prevAvg: 100, delta: -10 }); // down
      expect(blendBuy(hold, 5, 200)).toEqual({ units: 15, avgCost: 133, prevUnits: 10, prevAvg: 100, delta: 33 }); // up (round 133.3)
      expect(blendBuy(hold, 10, 100)).toEqual({ units: 20, avgCost: 100, prevUnits: 10, prevAvg: 100, delta: 0 }); // flat
    });
    it('null when there is nothing to blend or the add is empty', () => {
      expect(blendBuy(null, 5, 80)).toBeNull(); // a fresh buy has no average to move
      expect(blendBuy({ units: 10, avgCost: 100 }, 0, 80)).toBeNull(); // empty add
    });
  });

  it('the ticket previews how a buy moves your average cost (averaging down)', () => {
    const game = newGame(42);
    game.tradeBook = bookFromFills([{ tick: 0, itemId: FIRST.id, side: 'buy', qty: 10, price: 100 }], 0.02);
    render(<App initial={game} />); // FIRST selected, position 10 @ 100, buy side default
    fireEvent.change(screen.getByLabelText(/price/i), { target: { value: '80' } }); // buy 1 @ 80 → avg 98
    expect(screen.getByText(/after this buy/i)).toBeTruthy();
    expect(screen.getByText(/averaging down/i)).toBeTruthy();
  });

  describe('breakEvenSell', () => {
    it('is the least integer price clearing avg cost after the floor-rounded 2% tax', () => {
      expect(breakEvenSell(100, 0.02)).toBe(102); // 102 − floor(2.04)=2 → 100, exactly cost
      expect(breakEvenSell(50, 0.02)).toBe(51);
      expect(breakEvenSell(1000, 0.02)).toBe(1020);
    });
    it('the returned price recovers cost; one gp under does not', () => {
      const tax = 0.02;
      for (const cost of [37, 100, 250, 999, 5000]) {
        const be = breakEvenSell(cost, tax);
        expect(be - Math.floor(be * tax)).toBeGreaterThanOrEqual(cost);
        expect(be - 1 - Math.floor((be - 1) * tax)).toBeLessThan(cost);
      }
    });
    it('zero basis → zero', () => {
      expect(breakEvenSell(0, 0.02)).toBe(0);
    });
  });

  it('the ticket shows the break-even sell floor for a held position, and warns below it', () => {
    const game = newGame(42);
    game.tradeBook = bookFromFills([{ tick: 0, itemId: FIRST.id, side: 'buy', qty: 10, price: 100 }], 0.02);
    render(<App initial={game} />); // FIRST selected, position 10 @ 100
    fireEvent.click(screen.getByText('sell')); // flip the ticket to the sell side
    expect(screen.getByText(/break-even ≥/)).toBeTruthy();
    expect(screen.getByText('102')).toBeTruthy(); // avg 100 grossed up past the floor tax
    fireEvent.change(screen.getByLabelText(/price/i), { target: { value: '50' } }); // under break-even
    expect(screen.getByText(/below break-even/)).toBeTruthy();
  });

  describe('openPosition', () => {
    const buy = (itemId: string, qty: number, price: number, tick = 0): Fill => ({ tick, itemId, side: 'buy', qty, price });
    const sell = (itemId: string, qty: number, price: number, tick = 1): Fill => ({ tick, itemId, side: 'sell', qty, price });
    it('leftover buy lots are the open position, quantity-weighted avg cost', () => {
      // buy 10@100, sell 4 → 6 held @ 100
      expect(openPosition([buy('a', 10, 100), sell('a', 4, 150)], 'a')).toEqual({ units: 6, avgCost: 100 });
      // buy 5@100 + 5@200, sell 3 (eats first lot) → 2@100 + 5@200 = 7 @ avg 171
      expect(openPosition([buy('a', 5, 100), buy('a', 5, 200), sell('a', 3, 150)], 'a')).toEqual({
        units: 7,
        avgCost: 171, // round(1200/7)
      });
    });
    it('null when fully sold or never bought, and ignores other items', () => {
      expect(openPosition([buy('a', 5, 100), sell('a', 5, 999)], 'a')).toBeNull();
      expect(openPosition([sell('a', 3, 100)], 'a')).toBeNull(); // loot/orphan sell, no basis
      expect(openPosition([buy('b', 5, 100)], 'a')).toBeNull(); // different item
    });
  });

  it('the ticket shows your open-position cost basis for held buys', () => {
    const game = newGame(42);
    game.tradeBook = bookFromFills([{ tick: 0, itemId: FIRST.id, side: 'buy', qty: 10, price: 100 }], 0.02);
    render(<App initial={game} />); // FIRST is the default-selected item
    expect(screen.getByText(/position:/)).toBeTruthy();
    expect(screen.getByText(/@ avg 100/)).toBeTruthy();
  });

  it('the position line one-click loads a sell for your whole holding', () => {
    const game = newGame(42);
    game.tradeBook = bookFromFills([{ tick: 0, itemId: FIRST.id, side: 'buy', qty: 7, price: 100 }], 0.02);
    render(<App initial={game} />); // FIRST selected, open position 7 @ 100
    fireEvent.click(screen.getByText('sell 7'));
    expect(screen.getByText('sell').className).toContain('active'); // side toggled to sell
    expect((screen.getByLabelText(/qty/i) as HTMLInputElement).value).toBe('7'); // full position
  });

  describe('lifetime trade book', () => {
    const buy = (itemId: string, qty: number, price: number, tick = 0): Fill => ({ tick, itemId, side: 'buy', qty, price });
    const sell = (itemId: string, qty: number, price: number, tick = 1): Fill => ({ tick, itemId, side: 'sell', qty, price });
    it('applyFillToBook accrues realized + open lots incrementally', () => {
      const book = emptyTradeBook();
      [buy('a', 10, 100), sell('a', 4, 120), buy('b', 5, 50)].forEach((f) => applyFillToBook(book, f, 0.02));
      // a: sold 4 @ proceeds 118 → +72 realized; 6 left @ 100 open. b: 5 open @ 50.
      expect(realizedFromBook(book)).toEqual([{ itemId: 'a', profit: 72, soldUnits: 4 }]);
      expect(openFromBook(book, 'a')).toEqual({ units: 6, avgCost: 100 });
      expect(openFromBook(book, 'b')).toEqual({ units: 5, avgCost: 50 });
    });
    it('survives the fills window: realized accrues even after fills are capped out', () => {
      const game = newGame(42);
      // simulate a completed round-trip recorded long ago, then 60 unrelated fills
      applyFillToBook(game.tradeBook, buy('gold', 1, 100), 0.02);
      applyFillToBook(game.tradeBook, sell('gold', 1, 200), 0.02); // +96 realized, banked
      game.fills = Array.from({ length: 60 }, (_, i) => buy('filler', 1, 1, i)); // window full of noise
      // the lifetime book still remembers the gold flip even though it's gone from fills
      expect(realizedFromBook(game.tradeBook).find((p) => p.itemId === 'gold')!.profit).toBe(96);
    });
    it('totalRealized + totalUnrealized are the trading scorecard', () => {
      const book = emptyTradeBook();
      // a: +72 realized, 6 left @ 100. b: 5 left @ 50, never sold.
      [buy('a', 10, 100), sell('a', 4, 120), buy('b', 5, 50)].forEach((f) => applyFillToBook(book, f, 0.02));
      expect(totalRealized(book)).toBe(72);
      // mark a @ 130 (+30/unit × 6 = +180), b @ 40 (−10/unit × 5 = −50) → +130 paper
      const price: Record<string, number> = { a: 130, b: 40 };
      expect(totalUnrealized(book, (id) => price[id] ?? 0)).toBe(130);
      // an item with no price (0) contributes nothing
      expect(totalUnrealized(book, () => 0)).toBe(0);
    });
    it('normalizeGame rebuilds the book from fills for pre-book saves', () => {
      const stale = { ...newGame(42), fills: [buy('x', 3, 100), sell('x', 3, 130)] } as unknown as Game;
      delete (stale as { tradeBook?: unknown }).tradeBook; // old save: no book
      const fixed = normalizeGame(stale);
      expect(realizedFromBook(fixed.tradeBook)[0]).toMatchObject({ itemId: 'x', soldUnits: 3 });
    });
  });

  describe('resolveShortcut', () => {
    it('maps cockpit keys and ignores everything else', () => {
      expect(resolveShortcut('1')).toEqual({ kind: 'room', room: 'exchange' });
      expect(resolveShortcut('2')).toEqual({ kind: 'room', room: 'adventure' });
      expect(resolveShortcut('3')).toEqual({ kind: 'room', room: 'hall' });
      expect(resolveShortcut('p')).toEqual({ kind: 'pause' });
      expect(resolveShortcut('?')).toEqual({ kind: 'help' });
      expect(resolveShortcut(' ')).toBeNull(); // space stays for buttons
      expect(resolveShortcut('x')).toBeNull();
    });
  });

  it('keyboard 1/2/3 switch rooms, but not while typing in a field', () => {
    freshApp();
    fireEvent.keyDown(document.body, { key: '1' });
    expect(screen.getByRole('tab', { name: /Exchange/ }).getAttribute('aria-selected')).toBe('true');
    fireEvent.keyDown(document.body, { key: '2' });
    expect(screen.getByRole('tab', { name: /Adventure/ }).getAttribute('aria-selected')).toBe('true');
    // a digit typed into the market filter must NOT be hijacked as a room jump
    fireEvent.keyDown(screen.getByPlaceholderText(/filter items/i), { key: '1' });
    expect(screen.getByRole('tab', { name: /Adventure/ }).getAttribute('aria-selected')).toBe('true');
  });

  it('keyboard p toggles pause/play', () => {
    freshApp(); // world starts paused (❚❚ active)
    fireEvent.keyDown(document.body, { key: 'p' });
    expect(screen.getByText('1×').className).toContain('active'); // resumed to 1×
    fireEvent.keyDown(document.body, { key: 'p' });
    expect(screen.getByText('❚❚').className).toContain('active'); // paused again
  });

  it('keyboard b / s pick the ticket side', () => {
    freshApp(); // exchange room active; ticket defaults to buy
    fireEvent.keyDown(document.body, { key: 's' });
    expect(screen.getByText('sell').className).toContain('active');
    fireEvent.keyDown(document.body, { key: 'b' });
    expect(screen.getByText('buy').className).toContain('active');
  });

  describe('regionDanger', () => {
    it('reports the hardest-hitting foe in a region (pool + elite)', () => {
      const wild = REGIONS.find((r) => r.id === 'wilderness_ruins')!;
      // Skarn elite (atk24/def13/hp130) out-threats the fire_giant pool (atk19/def11)
      expect(regionDanger(wild)).toEqual({ atk: 24, def: 13, hp: 130, elite: true });
      const maw = REGIONS.find((r) => r.id === 'dragons_maw')!;
      expect(regionDanger(maw).elite).toBe(true); // Vorkanth stalks the Maw
      expect(regionDanger(maw).atk).toBeGreaterThanOrEqual(30); // the Elder out-hits the dragons
    });
  });

  it('the expedition panel warns how hard a region hits before you embark', () => {
    freshApp(); // Adventure room mounted; lumbridge selected; fresh player (eff ⚔5 🛡2)
    expect(screen.getByText(/danger: foes up to/)).toBeTruthy();
    // lumbridge goblin atk 4 > your def 2 → red; def 1 < your atk 5 → green
    expect(screen.getByText('⚔4').className).toContain('down');
    expect(screen.getByText('🛡1').className).toContain('up');
  });

  it('RecordsPanel renders the adventurer record in the hall', () => {
    render(<RecordsPanel game={newGame(42)} />);
    expect(screen.getByText(/Adventurer.s Record/)).toBeTruthy();
    expect(screen.getByText('Bounties claimed')).toBeTruthy();
    expect(screen.getByText('Bestiary met')).toBeTruthy();
  });

  it('CharacterPanel renders the "train to unlock" hints for gated gear', () => {
    const agent = {
      inventory: { adamant_dart: 1, dragon_longsword: 1, rune_chainbody: 1, rune_platebody: 1, rune_full_helm: 1 },
      combatXp: { atk: 0, def: xpForLevel(8), hp: 0 },
    } as unknown as AgentState;
    render(<CharacterPanel agent={agent} names={new Map()} />);
    expect(screen.getByText(/🔒 Atk 20/)).toBeTruthy();
    expect(screen.getByText(/🔒 Def 12/)).toBeTruthy();
    // each worn slot (weapon/body/helm here) shows a gear icon
    expect(document.querySelectorAll('.equipicon').length).toBeGreaterThan(0);
    // effective combat stats (levels + equipped gear) shown for direct compare
    expect(screen.getByText(/in battle:/)).toBeTruthy();
    expect(document.querySelector('.effstats')!.textContent).toMatch(/⚔\d+ 🛡\d+/);
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
      tradeBook: emptyTradeBook(),
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

  it('checkMilestones stamps the tick a deed was earned', () => {
    const game = newGame(42);
    game.world.tick = 1234;
    game.world.stats.monstersSlain = 1; // achieves 'first-blood'
    const view = playerView(game.world, game.playerId)!;
    const newly = checkMilestones(game, view, 0);
    expect(newly.map((m) => m.id)).toContain('first-blood');
    expect(game.milestoneTicks!['first-blood']).toBe(1234);
  });

  it('BountyBoard shows reward-per-kill and a progress bar', () => {
    const game = newGame(42);
    game.world.bounties = [{ id: 1, monsterId: 'goblin', qty: 4, rewardGp: 2_000, baseline: 0, expiresTick: 5_000 }];
    game.world.stats.killsByMonster = { goblin: 2 };
    game.world.tick = 100;
    render(<BountyBoard game={game} onCommand={() => {}} />);
    expect(screen.getByText(/≈500\/kill/)).toBeTruthy(); // 2,000 / 4
    const fill = document.querySelector('.bountybar > span') as HTMLElement;
    expect(fill).toBeTruthy();
    expect(fill.style.width).toBe('50%'); // 2 of 4 slain
  });

  describe('contractPremium', () => {
    it('is the fraction over market price, null without a mark', () => {
      expect(contractPremium(120, 100)).toBeCloseTo(0.2, 5);
      expect(contractPremium(90, 100)).toBeCloseTo(-0.1, 5); // market spiked past the deal
      expect(contractPremium(120, 0)).toBeNull();
    });
  });

  it('ContractsBoard shows each contract premium and flags fillable rows', () => {
    const view = {
      contracts: [{ id: 1, itemId: 'a', qty: 2, unitPrice: 120, expiresTick: 1000 }],
      inventory: { a: 5 }, // enough to fill
      markets: [{ itemId: 'a', lastPrice: 100 }],
    } as unknown as PlayerView;
    const items = [{ id: 'a', name: 'Item A' }] as unknown as ItemDef[];
    render(<ContractsBoard view={view} items={items} tick={0} onCommand={() => {}} />);
    expect(screen.getByText(/\+20%/)).toBeTruthy(); // premium over market
    expect(document.querySelector('.contract.ready')).toBeTruthy(); // fillable highlight
  });

  describe('offlineRatePerMin', () => {
    it('converts an offline worth delta into gp/min (60 ticks = 1 min)', () => {
      expect(offlineRatePerMin(60_000, 600)).toBe(6_000); // 60k over 10 min
      expect(offlineRatePerMin(-1_200, 120)).toBe(-600); // losses too
      expect(offlineRatePerMin(500, 0)).toBe(0); // no time passed
    });
  });

  describe('nextRoundTarget', () => {
    it('finds the next 1/2/5 × 10^k above n', () => {
      expect(nextRoundTarget(55_000)).toBe(100_000);
      expect(nextRoundTarget(1_200_000)).toBe(2_000_000);
      expect(nextRoundTarget(6_000_000)).toBe(10_000_000);
      expect(nextRoundTarget(150_000)).toBe(200_000);
      expect(nextRoundTarget(0.5)).toBe(1);
    });
  });

  it('WorthChart projects an ETA to the next round number when growing', () => {
    const history = [
      { tick: 0, worth: 100_000 },
      { tick: 600, worth: 150_000 }, // +50k over 600 ticks = +5,000/min
    ];
    render(<WorthChart history={history} startGp={100_000} ghost={null} />);
    // last 150k → target 200k; (200k − 150k) / 5,000 = 10 min
    expect(screen.getByText(/≈10m to 200K/)).toBeTruthy();
  });

  it('WorthChart marks earned deeds on the curve, skipping off-range ticks', () => {
    const history = [
      { tick: 0, worth: 50_000 },
      { tick: 100, worth: 60_000 },
      { tick: 200, worth: 55_000 },
    ];
    render(
      <WorthChart
        history={history}
        startGp={50_000}
        ghost={null}
        milestones={[
          { tick: 100, name: 'Dragon Slayer' }, // within [0,200] → marked
          { tick: 500, name: 'Too Late' }, // beyond maxT 200 → skipped
        ]}
      />,
    );
    const marks = document.querySelectorAll('.deedmark');
    expect(marks.length).toBe(1);
    expect(marks[0]!.querySelector('title')!.textContent).toContain('Dragon Slayer');
  });

  describe('firstSteps / Getting Started', () => {
    const allDone = (): Game => {
      const game = newGame(42);
      game.fills = [{ tick: 0, itemId: FIRST.id, side: 'buy', qty: 1, price: 1 }];
      applyCommand(game.world, game.playerId, { type: 'buyUpgrade', upgradeId: 'autoFlip' }); // real path
      game.world.stats.monstersSlain = 1;
      game.world.tick = SPRINT_TICKS;
      return game;
    };
    it('derives each step from game state', () => {
      const fresh = newGame(42);
      expect(firstSteps(fresh, playerView(fresh.world, fresh.playerId)!).every((s) => !s.done)).toBe(true);
      const done = allDone();
      expect(firstSteps(done, playerView(done.world, done.playerId)!).every((s) => s.done)).toBe(true);
    });
    it('guides new players, hides when dismissed', () => {
      const game = newGame(42);
      render(<FirstSteps game={game} view={playerView(game.world, game.playerId)!} />);
      expect(screen.getByText('Getting Started')).toBeTruthy();
      fireEvent.click(screen.getByText('dismiss'));
      expect(screen.queryByText('Getting Started')).toBeNull();
    });
    it('hides once every step is done', () => {
      const game = allDone();
      render(<FirstSteps game={game} view={playerView(game.world, game.playerId)!} />);
      expect(screen.queryByText('Getting Started')).toBeNull();
    });
  });

  it('MilestonesPanel shows the latest earned deed with its timing', () => {
    const game = newGame(42);
    game.world.tick = 600; // 10 min after earning
    game.milestones = ['first-blood'];
    game.milestoneTicks = { 'first-blood': 0 };
    const view = playerView(game.world, game.playerId)!;
    render(<MilestonesPanel unlocked={game.milestones} game={game} view={view} worth={0} />);
    expect(screen.getByText(/🏅 latest:/)).toBeTruthy();
    expect(screen.getByText(/10m ago/)).toBeTruthy();
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

  it('itemIcon categorizes items and the inventory shows icons', () => {
    expect(itemIcon('rune_2h_sword').name).toBe('skill-attack'); // weapon → sword
    expect(itemIcon('rune_platebody').name).toBe('skill-defence'); // armor → shield
    expect(itemIcon('shark').name).toBe('item-food'); // pure food
    expect(itemIcon('super_antifire_potion_4').name).toBe('item-potion'); // potion
    expect(itemIcon('superior_dragon_bones').name).toBe('item-bone');
    expect(itemIcon('blood_rune').name).toBe('item-rune');
    const game = newGame(42);
    game.world.agents[game.playerId]!.inventory['shark'] = 2;
    render(<App initial={game} />);
    const player = document.querySelector('.player') as HTMLElement;
    expect(player.querySelector('.itemicon')).toBeTruthy(); // inventory rows carry an icon
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

  it('the ticket shows a suggested flip with margin, and the chips load a side', () => {
    const game = newGame(42);
    // Rest a bid and an ask on FIRST so the flip helper has a spread.
    const other = addAgent(game.world, 'player', 80_000, { [FIRST.id]: 5 });
    other.policy = 'idle';
    applyCommand(game.world, other.id, { type: 'place', itemId: FIRST.id, side: 'buy', price: 100, qty: 2 });
    applyCommand(game.world, other.id, { type: 'place', itemId: FIRST.id, side: 'sell', price: 200, qty: 2 });
    render(<App initial={game} />);
    fireEvent.click(document.querySelectorAll('.market tbody tr')[0]!); // select FIRST
    const ticket = document.querySelector('.ticket') as HTMLElement;
    const flip = ticket.querySelector('.flipline') as HTMLElement;
    expect(flip).toBeTruthy();
    expect(flip.textContent).toMatch(/buy 101/); // bestBid 100 + 1
    expect(flip.textContent).toMatch(/sell 199/); // bestAsk 200 − 1
    // Clicking the buy chip loads that price into the form.
    fireEvent.click(within(flip).getByText(/buy 101/));
    expect((within(ticket).getByLabelText(/price/i) as HTMLInputElement).value).toBe('101');
  });

  it('the ticket shows a fair-value band (cheap/fair/rich) for the selected item', () => {
    const game = newGame(42);
    const item = game.world.items[0]!;
    const book = game.world.books[item.id]!;
    book.lastPrice = item.baseCost; // bottom of the band → cheap
    render(<App initial={game} />);
    fireEvent.click(document.querySelectorAll('.market tbody tr')[0]!);
    const ticket = document.querySelector('.ticket') as HTMLElement;
    expect(ticket.querySelector('.valueband.cheap')).toBeTruthy();
    // Pushed to the top of the band, it reads rich.
    book.lastPrice = item.consumeValue;
    fireEvent.click(document.querySelectorAll('.market tbody tr')[1]!); // reselect to re-render
    fireEvent.click(document.querySelectorAll('.market tbody tr')[0]!);
    expect(ticket.querySelector('.valueband.rich')).toBeTruthy();
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

  it('abort all cancels every resting offer at once', () => {
    const game = newGame(42);
    applyCommand(game.world, game.playerId, { type: 'place', itemId: FIRST.id, side: 'buy', price: 1, qty: 1 });
    applyCommand(game.world, game.playerId, { type: 'place', itemId: LAST.id, side: 'buy', price: 1, qty: 1 });
    render(<App initial={game} />);
    const player = document.querySelector('.player') as HTMLElement;
    expect(within(player).getAllByText('abort').length).toBe(2); // two resting
    fireEvent.click(within(player).getByText('abort all'));
    expect(within(player).getByText('no open offers')).toBeTruthy();
    expect(within(player).queryByText('abort all')).toBeNull(); // hidden at ≤1 order
  });

  it('the masthead market pulse shows breadth once the market has traded', () => {
    const game = newGame(42);
    for (let t = 0; t < 400; t++) tickWorld(game.world);
    render(<App initial={game} />);
    const pulse = document.querySelector('.pulse') as HTMLElement;
    expect(pulse).toBeTruthy();
    expect(pulse.textContent).toMatch(/▲\d+/); // advancers
    expect(pulse.textContent).toMatch(/▼\d+/); // decliners
  });

  it('price alert: set a buy-below threshold, it fires once when the price drops to it', () => {
    localStorage.setItem('ew-watch', JSON.stringify([FIRST.id]));
    localStorage.setItem('ew-alerts', JSON.stringify({ [FIRST.id]: 999_999 })); // always-met threshold
    const game = newGame(42);
    render(<App initial={game} />);
    fireEvent.click(screen.getByText('+1k')); // advance ticks → refreshProgress runs alert checks
    // The watchlist row shows the triggered bell once price ≤ threshold.
    const watch = document.querySelector('.watchlist') as HTMLElement;
    expect(watch.querySelector('.mover.alerted')).toBeTruthy();
    localStorage.removeItem('ew-watch');
    localStorage.removeItem('ew-alerts');
  });

  describe('alertHit', () => {
    it('below fires at/under the threshold, above fires at/over', () => {
      expect(alertHit(90, 100, 'below')).toBe(true);
      expect(alertHit(100, 100, 'below')).toBe(true);
      expect(alertHit(110, 100, 'below')).toBe(false);
      expect(alertHit(110, 100, 'above')).toBe(true);
      expect(alertHit(100, 100, 'above')).toBe(true);
      expect(alertHit(90, 100, 'above')).toBe(false);
    });
  });

  it('price alert: a sell-above (take-profit) threshold fires when the price climbs to it', () => {
    localStorage.setItem('ew-watch', JSON.stringify([FIRST.id]));
    localStorage.setItem('ew-sell-alerts', JSON.stringify({ [FIRST.id]: 1 })); // any price ≥ 1 → always met
    render(<App initial={newGame(42)} />);
    fireEvent.click(screen.getByText('+1k')); // advance → refreshProgress runs the sell-alert checks
    const watch = document.querySelector('.watchlist') as HTMLElement;
    expect(watch.querySelector('.mover.alerted')).toBeTruthy();
    localStorage.removeItem('ew-watch');
    localStorage.removeItem('ew-sell-alerts');
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
    expect(panel.querySelector('.monsterglyph')).toBeTruthy(); // met monsters show a portrait
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

  describe('myRank', () => {
    const rows = [{ handle: 'alice' }, { handle: 'bob' }, { handle: 'carol' }];
    it('finds your 1-based rank by sanitized handle', () => {
      expect(myRank(rows, 'bob')).toBe(2);
      expect(myRank(rows, 'bob@example.com')).toBe(2); // email-shaped → local part
      expect(myRank(rows, 'dave')).toBeNull(); // not on this board
    });
    it('never matches anonymous or an unset handle', () => {
      expect(myRank([{ handle: 'anonymous trader' }], '')).toBeNull();
      expect(myRank([{ handle: 'anonymous trader' }], '   ')).toBeNull();
    });
  });

  it('the Sprint Board highlights your own row and rank', async () => {
    localStorage.setItem('ew-handle', 'gertrude'); // your handle
    fetchRoutes = (url) =>
      url.includes('/rest/v1/leaderboard')
        ? jsonResponse([
            { handle: 'topdog', worth: 99_999, deepest: 0 },
            { handle: 'gertrude', worth: 77_777, deepest: 2 },
          ])
        : null;
    render(<LeaderboardPanel game={newGame(42)} session={{} as Session} onToast={vi.fn()} />);
    await waitFor(() => expect(screen.getByText('Sprint Board')).toBeTruthy());
    expect(screen.getByText(/← you/)).toBeTruthy();
    expect(screen.getByText(/you're #2 on this seed/)).toBeTruthy();
  });

  it('the board reframes as the Daily Board on today\'s seed', async () => {
    fetchRoutes = (url) => (url.includes('/rest/v1/leaderboard') ? jsonResponse([]) : null);
    render(<LeaderboardPanel game={newGame(dailySeed())} session={{} as Session} onToast={vi.fn()} />);
    await waitFor(() => expect(screen.getByText('🗓 Daily Board')).toBeTruthy());
    expect(screen.getByText(/everyone racing the daily/)).toBeTruthy();
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
