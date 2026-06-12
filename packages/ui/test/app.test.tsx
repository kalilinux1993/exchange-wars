// @vitest-environment jsdom
// Catalog-agnostic: everything derives from DEFAULT_ITEMS so `npm run
// gen:catalog` regens never break these tests.
import { addAgent, applyCommand, createWorld, DEFAULT_ITEMS, placeOrder, playerView, REGIONS, SPRINT_TICKS, tickWorld, xpForLevel } from '@exchange-wars/engine';
import type { AgentState, SimStats } from '@exchange-wars/engine';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ItemDef, PlayerView } from '@exchange-wars/engine';
import { App } from '../src/App';
import { ErrorBoundary } from '../src/components/ErrorBoundary';
import { Icon, itemIcon } from '../src/components/Icon';
import { MoversPanel } from '../src/components/MoversPanel';
import { CharacterPanel, equipped, lockedUpgrades } from '../src/components/CharacterPanel';
import { TopFlips, rankFlips, flipAffordability } from '../src/components/TopFlips';
import { RecordsPanel, recordRows } from '../src/components/RecordsPanel';
import { regionDanger } from '../src/components/ExpeditionPanel';
import { resolveShortcut } from '../src/keyboard';
import { ProfitPanel } from '../src/components/ProfitPanel';
import { PositionsPanel } from '../src/components/PositionsPanel';
import { ConquestPanel } from '../src/components/ConquestPanel';
import { RegionMap } from '../src/components/RegionMap';
import { CombatScene, arenaTheme } from '../src/components/CombatScene';
import { EmbarkPanel } from '../src/components/EmbarkPanel';
import { MarketTable } from '../src/components/MarketTable';
import { DelvePanel } from '../src/components/DelvePanel';
import { ExpeditionPanel } from '../src/components/ExpeditionPanel';
import { GearManager } from '../src/components/GearManager';
import { HelpOverlay } from '../src/components/HelpOverlay';
import { WealthPanel } from '../src/components/WealthPanel';
import { UpgradeShop } from '../src/components/UpgradeShop';
import { PlayerPanel } from '../src/components/PlayerPanel';
import { depthSplit, TradeTicket } from '../src/components/TradeTicket';
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
  planOfflineProgress,
  finishOfflineProgress,
  biggestMover,
  bumpStreak,
  checkMilestones,
  MILESTONES,
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
  priceSwing,
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
  underwaterSummary,
  lootSpoils,
  gearDelta,
  bestAffordableUpgrade,
  worthBreakdown,
  returnOnStake,
  sessionPnL,
  restartStakes,
  parseChallengeSeed,
  realizedFromBook,
  tradeRecord,
  recordFills,
  recentFlips,
  leveledUp,
  healEta,
  fillSummary,
  fillToastFlavor,
  realizedPnL,
  streakAtRisk,
  recordDailyBest,
  dailyBestView,
  beatRecord,
  regionRoster,
  regionMastery,
  expectedHit,
  combatForecast,
  healFromPack,
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

  describe('leveledUp', () => {
    it('lists the skills that rose, with their new level', () => {
      const ups = leveledUp({ atk: 4, def: 9, hp: 3 }, { atk: 5, def: 9, hp: 4 });
      expect(ups.map((u) => u.skill)).toEqual(['atk', 'hp']); // def unchanged
      expect(ups.find((u) => u.skill === 'atk')).toMatchObject({ name: 'Attack', glyph: '⚔', level: 5 });
    });
    it('is empty when nothing rose (or a skill somehow dropped)', () => {
      expect(leveledUp({ atk: 5, def: 5, hp: 5 }, { atk: 5, def: 5, hp: 5 })).toEqual([]);
      expect(leveledUp({ atk: 5, def: 5, hp: 5 }, { atk: 4, def: 5, hp: 5 })).toEqual([]);
    });
  });

  it('a combat level-up pops a celebration toast', () => {
    const game = freshApp();
    fireEvent.click(screen.getByText('+1k')); // trigger #1: prevLevels latches at 1/1/1
    game.world.agents[game.playerId]!.combatXp = { atk: xpForLevel(2), def: 0, hp: 0 }; // Attack 1 → 2 (combat level still 1, no deed crosses)
    fireEvent.click(screen.getByText('+1k')); // trigger #2: detects the jump (human is inert → no stray milestone)
    expect(screen.getByText(/Attack up/)).toBeTruthy();
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

  describe('biggestMover (while-you-were-away headline)', () => {
    const mk = (itemId: string, lastPrice: number) => ({ itemId, lastPrice });
    it('picks the largest absolute % move above the 3% news floor', () => {
      const mv = biggestMover({ a: 100, b: 200, c: 50 }, [mk('a', 110), mk('b', 160), mk('c', 51)]);
      expect(mv).toMatchObject({ itemId: 'b', startPrice: 200, endPrice: 160 }); // -20% beats a's +10%, c's +2%
      expect(Math.round(mv!.pct * 100)).toBe(-20);
    });
    it('is null when nothing cleared 3% — a flat market is not news', () => {
      expect(biggestMover({ a: 100, b: 200 }, [mk('a', 101), mk('b', 198)])).toBeNull(); // +1% / -1%
    });
    it('skips items with no/zero start or end price', () => {
      const mv = biggestMover({ a: 0, b: 100 }, [mk('a', 999), mk('b', 130), mk('z', 500)]);
      expect(mv?.itemId).toBe('b'); // a's start is 0, z has no captured start → only b (+30%) qualifies
      expect(biggestMover({}, [])).toBeNull();
    });
  });

  it('finishOfflineProgress diffs the captured pre-away prices to report the top mover', () => {
    const game = newGame(42);
    game.lastSeenMs = 1_000;
    const plan = planOfflineProgress(game, 1_000 + 600_000)!; // captures pricesBefore
    // No ticks ran → after == before → nothing moved → no headline.
    expect(finishOfflineProgress(game, plan).topMover).toBeNull();
    // Pretend one item was half the price before → finish sees a ~+100% rise → it's the mover.
    const id = game.world.items[0]!.id;
    const planLow = { ...plan, pricesBefore: { ...plan.pricesBefore, [id]: (plan.pricesBefore[id] ?? 100) / 2 } };
    const mv = finishOfflineProgress(game, planLow).topMover;
    expect(mv?.itemId).toBe(id);
    expect(mv!.pct).toBeGreaterThan(0.4);
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

  describe('beatRecord (daily-record celebration trigger)', () => {
    it('fires only with a real prior record that worth exceeds', () => {
      expect(beatRecord(null, 999_999)).toBe(false); // no record carried in
      expect(beatRecord(1000, 999)).toBe(false); // not beaten
      expect(beatRecord(1000, 1000)).toBe(false); // a tie isn't a new record
      expect(beatRecord(1000, 1001)).toBe(true); // beaten
    });
  });

  it('celebrates a new daily record when worth passes your prior best', () => {
    localStorage.setItem('ew-daily-best', JSON.stringify({ day: dailySeed(), best: HUMAN_START_GP + 1000 }));
    const game = newGame(dailySeed());
    game.world.agents[game.playerId]!.gp = HUMAN_START_GP + 50_000; // worth now far above the record
    render(<App initial={game} />);
    expect(screen.getByText(/new daily record/i)).toBeTruthy();
  });

  it('does not celebrate without a prior record to beat', () => {
    const game = newGame(dailySeed()); // no ew-daily-best seeded
    game.world.agents[game.playerId]!.gp = HUMAN_START_GP + 50_000;
    render(<App initial={game} />);
    expect(screen.queryByText(/new daily record/i)).toBeNull();
  });

  it('the help overlay documents the keyboard trading shortcuts (j/k, b/s)', () => {
    render(<HelpOverlay onClose={() => {}} />);
    expect(screen.getByText(/walk the market/i)).toBeTruthy(); // j/k nav
    expect(screen.getByText(/pick buy or sell/i)).toBeTruthy(); // b/s side
  });

  it('MilestonesPanel shows a progress bar on the closest unearned deeds', () => {
    const game = newGame(42);
    const view = playerView(game.world, game.playerId)!;
    // worth = start → the 100k-worth deed sits at 50%, so a bar renders
    const { container } = render(<MilestonesPanel unlocked={[]} game={game} view={view} worth={HUMAN_START_GP} />);
    expect(container.querySelectorAll('.deedbar').length).toBeGreaterThan(0);
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

  it('the roster strip lights exactly the foes slain, dims the rest', () => {
    const game = newGame(42);
    // Slay one distinct foe from region 0's roster; the rest stay unmet.
    const r0 = REGIONS[0]!;
    const roster = [...new Set(r0.elite ? [...r0.monsters, r0.elite] : r0.monsters)];
    game.world.stats.killsByMonster = { [roster[0]!]: 3 };
    const { container } = render(<ConquestPanel game={game} />);
    const r0row = container.querySelectorAll('.conquest-row')[0]!;
    expect(r0row.querySelectorAll('.roster-foe.slain').length).toBe(1); // the one we killed
    expect(r0row.querySelectorAll('.roster-foe.unmet').length).toBe(roster.length - 1); // the rest
    // total glyphs == roster size (deduped)
    expect(r0row.querySelectorAll('.roster-foe').length).toBe(roster.length);
  });

  describe('arenaTheme (region combat backdrop)', () => {
    it('gives distinct palettes per region and a neutral default for unknown/absent ids', () => {
      const plains = arenaTheme('lumbridge_plains');
      const abyss = arenaTheme('the_abyss');
      expect(plains).not.toEqual(abyss); // the journey is visibly different end to end
      expect(arenaTheme('not_a_region')).toEqual(arenaTheme(undefined)); // unknown falls back
      expect(plains.from).toMatch(/^#[0-9a-f]{6}$/i); // well-formed colour stops
    });
  });

  it('CombatScene paints the region-themed backdrop gradient', () => {
    const kit = { weapon: false, helm: false, body: false, legs: false, shield: false };
    const { container } = render(
      <CombatScene monsterId="goblin" monsterHp={10} playerHp={20} playerMaxHp={20} logLen={1} kit={kit} regionId="the_abyss" />,
    );
    const bg = container.querySelector('rect.arena-bg');
    expect(bg).toBeTruthy();
    expect(bg!.getAttribute('fill')).toBe('url(#arena-sky)');
    const stop = container.querySelector('#arena-sky stop');
    expect(stop!.getAttribute('stop-color')).toBe(arenaTheme('the_abyss').from); // themed by the region
  });

  it('RegionMap pulses the node when the selection changes, but not on first mount', () => {
    const a = REGIONS[0]!.id;
    const b = REGIONS[1]!.id;
    const { container, rerender } = render(<RegionMap progress={5} selected={a} onSelect={() => {}} />);
    expect(container.querySelector('.mapnode.flash')).toBeNull(); // static initial region — no pulse
    rerender(<RegionMap progress={5} selected={b} onSelect={() => {}} />);
    const flashed = container.querySelector('.mapnode.flash');
    expect(flashed).toBeTruthy(); // the newly-picked node pulses
    expect(flashed!.classList.contains('selected')).toBe(true); // and it's the selected one
  });

  it('EmbarkPanel: ←/→ move the region and Enter embarks, gated to the active tab', () => {
    const game = newGame(42);
    game.world.agents[game.playerId]!.questProgress = 5; // several regions unlocked
    const view = playerView(game.world, game.playerId)!;
    const onCommand = vi.fn();
    const { rerender } = render(
      <EmbarkPanel game={game} view={view} items={game.world.items} onCommand={onCommand} active />,
    );
    expect(screen.getByText('soft hills, soft monsters')).toBeTruthy(); // region 0 selected
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    expect(screen.getByText('it smells like XP down here')).toBeTruthy(); // moved to region 1
    fireEvent.keyDown(window, { key: 'Enter' });
    expect(onCommand).toHaveBeenCalledWith(expect.objectContaining({ type: 'startExpedition' }));

    onCommand.mockClear();
    rerender(<EmbarkPanel game={game} view={view} items={game.world.items} onCommand={onCommand} active={false} />);
    fireEvent.keyDown(window, { key: 'Enter' });
    expect(onCommand).not.toHaveBeenCalled(); // an inactive tab ignores the keys
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

    it('scrolls the selected row into view when the selection moves', () => {
      const orig = Element.prototype.scrollIntoView;
      const spy = vi.fn();
      Element.prototype.scrollIntoView = spy; // jsdom has no layout — stub it
      try {
        const { rerender } = render(
          <MarketTable view={view} items={DEFAULT_ITEMS} trades={[]} selected={ids[0]!} onSelect={() => {}} eventItems={new Set()} active />,
        );
        spy.mockClear(); // ignore the initial-mount scroll
        rerender(
          <MarketTable view={view} items={DEFAULT_ITEMS} trades={[]} selected={ids[1]!} onSelect={() => {}} eventItems={new Set()} active />,
        );
        expect(spy).toHaveBeenCalled();
      } finally {
        Element.prototype.scrollIntoView = orig;
      }
    });

    it('the "gear" track isolates equippable items, each marked', () => {
      const view = { markets: DEFAULT_ITEMS.map((i) => mkt(i.id)) } as unknown as PlayerView;
      const { container } = render(
        <MarketTable view={view} items={DEFAULT_ITEMS} trades={[]} selected="rune_2h_sword" onSelect={() => {}} eventItems={new Set()} active />,
      );
      // gear rows carry a ⚔/🛡 marker even in the "all" view
      expect(container.querySelectorAll('.gearmark').length).toBeGreaterThan(0);
      const allRows = container.querySelectorAll('tbody tr').length;
      fireEvent.click(within(container).getByRole('button', { name: 'gear' }));
      const gearRows = container.querySelectorAll('tbody tr').length;
      expect(gearRows).toBeGreaterThan(0);
      expect(gearRows).toBeLessThan(allRows); // filtered to the equippable subset
      // every visible row is now gear (one marker each)
      expect(container.querySelectorAll('tbody tr .gearmark').length).toBe(gearRows);
    });

    it('shows a sortable flip-margin column (after-tax, per row)', () => {
      const row = (itemId: string, bid: number, ask: number) => ({
        itemId, bestBid: bid, bestAsk: ask, lastPrice: bid, ema: bid, volume: 0, bestBidIsMine: false, bestAskIsMine: false,
      });
      const view = { markets: [row('a', 1000, 1100)] } as unknown as PlayerView;
      const items = [{ id: 'a', name: 'Item A' }] as unknown as ItemDef[];
      render(<MarketTable view={view} items={items} trades={[]} selected="a" onSelect={() => {}} eventItems={new Set()} active />);
      expect(screen.getByRole('columnheader', { name: /margin/ })).toBeTruthy();
      expect(screen.getByText('+77')).toBeTruthy(); // 1000/1100 → buy 1001, sell 1099, +77 after 2% tax
    });

    it('the "flippable" track keeps only items with a positive after-tax margin', () => {
      const row = (itemId: string, bid: number, ask: number) => ({
        itemId, bestBid: bid, bestAsk: ask, lastPrice: bid, ema: bid, volume: 0, bestBidIsMine: false, bestAskIsMine: false,
      });
      const view = { markets: [row('wide', 1000, 1100), row('thin', 100, 101)] } as unknown as PlayerView;
      const items = [{ id: 'wide', name: 'Wide Spread' }, { id: 'thin', name: 'Thin Spread' }] as unknown as ItemDef[];
      const { container } = render(<MarketTable view={view} items={items} trades={[]} selected="wide" onSelect={() => {}} eventItems={new Set()} active />);
      expect(container.querySelectorAll('tbody tr').length).toBe(2); // both shown in "all"
      fireEvent.click(within(container).getByRole('button', { name: 'flippable' }));
      const rows = container.querySelectorAll('tbody tr');
      expect(rows.length).toBe(1); // only the wide spread clears the tax
      expect(rows[0]!.textContent).toContain('Wide Spread');
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
    const startDive = (sellsword: boolean) => {
      const game = newGame(42);
      const agent = game.world.agents[game.playerId]!;
      agent.sellsword = sellsword;
      (agent as { expedition?: unknown }).expedition = {
        regionId: REGIONS[0]!.id,
        rngState: 1,
        hp: 30,
        pack: {},
        packGp: 500,
        cleared: 2,
        combat: { monsterId: 'goblin', monsterHp: 0, playerHp: 0, maxHp: 30, antifire: false, outcome: 'dead', lootGp: 0, lootItems: [], log: [] },
        journal: [],
      };
      return { game, agent };
    };
    it('a PLAYER dive that ends in combat logs the delve + death toast', () => {
      const { game, agent } = startDive(false); // sellsword off → this is the player's
      const onDelveEnd = vi.fn();
      const onToast = vi.fn();
      const view = playerView(game.world, game.playerId)!;
      const { rerender } = render(<ExpeditionPanel game={game} view={view} onCommand={() => {}} onToast={onToast} onDelveEnd={onDelveEnd} />);
      delete (agent as { expedition?: unknown }).expedition; // died mid-combat
      rerender(<ExpeditionPanel game={game} view={view} onCommand={() => {}} onToast={onToast} onDelveEnd={onDelveEnd} />);
      expect(onDelveEnd).toHaveBeenCalledTimes(1);
      expect(onToast).toHaveBeenCalled(); // "You died in …"
    });
    it('a SELLSWORD dive (sharing the slot) is NOT logged or toasted as the player', () => {
      const { game, agent } = startDive(true); // the hunt is on → the slot is the sellsword's
      const onDelveEnd = vi.fn();
      const onToast = vi.fn();
      const view = playerView(game.world, game.playerId)!;
      const { rerender } = render(<ExpeditionPanel game={game} view={view} onCommand={() => {}} onToast={onToast} onDelveEnd={onDelveEnd} />);
      delete (agent as { expedition?: unknown }).expedition; // the sellsword's dive ended
      rerender(<ExpeditionPanel game={game} view={view} onCommand={() => {}} onToast={onToast} onDelveEnd={onDelveEnd} />);
      expect(onDelveEnd).not.toHaveBeenCalled(); // no spurious Delve Log entry
      expect(onToast).not.toHaveBeenCalled(); // no false "You died" attributed to the player
    });
    it('a sellsword-owned dive is clearly flagged so the player does not mistake it for their own', () => {
      const { game } = startDive(true); // hunt on + the slot occupied → the sellsword's
      const view = playerView(game.world, game.playerId)!;
      render(<ExpeditionPanel game={game} view={view} onCommand={() => {}} onToast={() => {}} onDelveEnd={() => {}} />);
      expect(screen.getByText(/your sellsword is on this dive/i)).toBeTruthy();
    });
    it('no sellsword banner on the player\'s own dive', () => {
      const { game } = startDive(false);
      const view = playerView(game.world, game.playerId)!;
      render(<ExpeditionPanel game={game} view={view} onCommand={() => {}} onToast={() => {}} onDelveEnd={() => {}} />);
      expect(screen.queryByText(/your sellsword is on this dive/i)).toBeNull();
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

  describe('healFromPack', () => {
    it('sums consumable heal × qty, ignores gear and zero-qty entries', () => {
      expect(healFromPack({ shark: 2, cooked_karambwan: 1 })).toBe(58); // 20*2 + 18
      expect(healFromPack({ shark: 1, rune_2h_sword: 3 })).toBe(20); // gear restores no hp
      expect(healFromPack({ shark: 0 })).toBe(0); // zero-qty contributes nothing
      expect(healFromPack({})).toBe(0);
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

  it('"prep me" fixes every embark warning in one tap', () => {
    const game = newGame(42);
    const inv = game.world.agents[game.playerId]!.inventory;
    inv.super_antifire_potion_4 = 2; // antifire fix — owned, not packed
    inv.shark = 3; // food fix (distinct item) — owned, not packed
    game.delves = [{ tick: 0, regionId: 'dragons_maw', kills: 1, lootGp: 0, died: false }]; // fiery + a hard fight for a fresh fighter
    render(<App initial={game} />);
    fireEvent.click(screen.getByTitle(/raid here again/)); // select dragons_maw on the embark screen
    expect(screen.getByText(/breathe fire/)).toBeTruthy(); // antifire warning
    expect(screen.getByText(/no food packed/)).toBeTruthy(); // food warning
    fireEvent.click(screen.getByText(/prep me/)); // one tap fixes both
    expect(screen.queryByText(/breathe fire/)).toBeNull();
    expect(screen.queryByText(/no food packed/)).toBeNull();
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

  describe('returnOnStake', () => {
    it('reports gain over the starting stake as gp and fraction', () => {
      expect(returnOnStake(1000, 1250)).toEqual({ delta: 250, pct: 0.25, up: true });
    });
    it('reports a loss as negative, up=false', () => {
      const r = returnOnStake(1000, 600);
      expect(r.delta).toBe(-400);
      expect(r.pct).toBeCloseTo(-0.4, 5);
      expect(r.up).toBe(false);
    });
    it('treats break-even as up (delta 0)', () => {
      expect(returnOnStake(1000, 1000)).toEqual({ delta: 0, pct: 0, up: true });
    });
    it('guards a zero stake (no divide-by-zero)', () => {
      expect(returnOnStake(0, 500)).toEqual({ delta: 500, pct: 0, up: true });
    });
  });

  describe('sessionPnL', () => {
    it('reports worth change vs the session baseline as gp and fraction', () => {
      expect(sessionPnL(1250, 1000)).toEqual({ delta: 250, pct: 0.25, up: true });
    });
    it('reports a drawdown as negative, up=false', () => {
      const s = sessionPnL(800, 1000);
      expect(s.delta).toBe(-200);
      expect(s.pct).toBeCloseTo(-0.2, 5);
      expect(s.up).toBe(false);
    });
    it('flat session is up with delta 0; a zero baseline guards the divide', () => {
      expect(sessionPnL(1000, 1000)).toEqual({ delta: 0, pct: 0, up: true });
      expect(sessionPnL(500, 0)).toEqual({ delta: 500, pct: 0, up: true });
    });
  });

  describe('restartStakes', () => {
    it('flags something at stake once you have a deed or have grown past your stake', () => {
      expect(restartStakes({ milestones: [], startGp: 10_000 }, 10_000)).toEqual({ worth: 10_000, deeds: 0, atStake: false }); // fresh run
      expect(restartStakes({ milestones: ['first-blood'], startGp: 10_000 }, 10_000).atStake).toBe(true); // a deed earned
      expect(restartStakes({ milestones: [], startGp: 10_000 }, 12_000).atStake).toBe(true); // worth grew
      expect(restartStakes({ startGp: 10_000 }, 9_000).atStake).toBe(false); // underwater, no deeds — nothing earned to lose
      expect(restartStakes({ milestones: ['a', 'b', 'c'], startGp: 10_000 }, 50_000).deeds).toBe(3);
    });
  });

  it('the new-game seed form warns what restarting abandons, only with progress at stake', () => {
    const fresh = newGame(42);
    const r1 = render(<App initial={fresh} />);
    fireEvent.click(screen.getByRole('button', { name: 'new game' }));
    expect(r1.container.querySelector('.restartwarn')).toBeNull(); // a fresh run → no alarm
    r1.unmount();

    const earned = newGame(42);
    earned.milestones = ['first-blood', 'six-figures']; // 2 deeds earned
    render(<App initial={earned} />);
    fireEvent.click(screen.getByRole('button', { name: 'new game' }));
    const warn = document.querySelector('.restartwarn');
    expect(warn).toBeTruthy();
    expect(warn!.textContent).toMatch(/wipes this run/);
    expect(warn!.textContent).toMatch(/2 deeds/);
  });

  it('WealthPanel shows the value of equipped kit', () => {
    const game = newGame(42);
    const npc = game.world.agents.find((a) => a.kind !== 'player')!;
    npc.gp = 100_000;
    // A low resting bid (won't match any seeded sell) gives the worn gear a
    // liquidation value, so the kit note has something to show.
    placeOrder(game.world, npc, 'rune_2h_sword', 'buy', 5, 1);
    game.world.agents[game.playerId]!.worn = { weapon: 'rune_2h_sword' };
    const view = playerView(game.world, game.playerId)!;
    const { container } = render(<WealthPanel game={game} view={view} worth={50_000} />);
    expect(container.textContent).toContain('equipped kit'); // the worn weapon's value is surfaced
  });

  it('WealthPanel shows this-session P&L vs the load-time baseline, omits it when flat', () => {
    const game = newGame(42);
    const view = { gp: 1000, openOrders: [{ side: 'buy', price: 50, remaining: 4 }] } as unknown as PlayerView;
    // worth 2000 vs a session baseline of 1500 → +500 (+33%) this session
    const up = render(<WealthPanel game={game} view={view} worth={2000} sessionStartWorth={1500} />);
    const line = up.container.querySelector('p.session');
    expect(line).toBeTruthy();
    expect(line!.textContent).toMatch(/this session/);
    expect(line!.textContent).toMatch(/↑ \+/);
    expect(line!.textContent).toMatch(/\(\+33%\)/);
    up.unmount();
    // baseline == worth → no movement → the line is omitted
    const flat = render(<WealthPanel game={game} view={view} worth={2000} sessionStartWorth={2000} />);
    expect(flat.container.querySelector('p.session')).toBeNull();
  });

  it('WealthPanel shows return on the starting stake', () => {
    const game = newGame(42);
    game.startGp = 1000;
    const view = { gp: 1000, openOrders: [{ side: 'buy', price: 50, remaining: 4 }] } as unknown as PlayerView;
    render(<WealthPanel game={game} view={view} worth={2000} />); // +1000 over the 1000 stake = +100%
    expect(screen.getByText(/\+100%/)).toBeTruthy();
  });

  it('UpgradeShop shows the purse and how far short you are of an upgrade', () => {
    const view = {
      gp: 100, // way short of any upgrade
      slots: 1,
      nextSlotCost: 5000,
      upgrades: {},
      botConfig: { maxVolatility: null, capitalFraction: null, focusItemId: null },
    } as unknown as PlayerView;
    render(<UpgradeShop view={view} items={[]} onCommand={() => {}} />);
    expect(screen.getByText(/^100 gp$/)).toBeTruthy(); // spendable purse in the header
    expect(screen.getByText(/need \+4,900/)).toBeTruthy(); // slot shortfall (5,000 − 100)
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

  describe('gearDelta', () => {
    const maxed = { atk: 99, def: 99 };
    it('reports the full stat as the gain when the slot is empty', () => {
      const d = gearDelta('rune_2h_sword', {}, maxed); // weapon atk 45, req 14
      expect(d).toMatchObject({ slot: 'weapon', delta: 45, skill: 'atk', usable: true, vs: null });
    });
    it('reports the upgrade over what is worn on the governing stat', () => {
      // worn adamant_dart (atk 10); rune_2h_sword (atk 45) → +35 Attack
      const d = gearDelta('rune_2h_sword', { weapon: 'adamant_dart' }, maxed);
      expect(d).toMatchObject({ delta: 35, skill: 'atk', vs: 'adamant_dart' });
    });
    it('reports a downgrade as negative', () => {
      const d = gearDelta('adamant_dart', { weapon: 'rune_2h_sword' }, maxed); // 10 - 45
      expect(d!.delta).toBe(-35);
    });
    it('marks a piece unusable below its level requirement', () => {
      const d = gearDelta('rune_2h_sword', {}, { atk: 5, def: 5 }); // req 14
      expect(d).toMatchObject({ usable: false, req: 14, skill: 'atk' });
    });
    it('uses Defence as the governing stat for armor', () => {
      const d = gearDelta('rune_platebody', { body: 'rune_chainbody' }, maxed); // def 28 - 22
      expect(d).toMatchObject({ slot: 'body', delta: 6, skill: 'def', vs: 'rune_chainbody' });
    });
    it('returns null for non-gear', () => {
      expect(gearDelta('shark', {}, maxed)).toBeNull();
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

  it('PlayerPanel equips gear from the satchel', () => {
    const game = newGame(42);
    game.world.agents[game.playerId]!.inventory['rune_2h_sword'] = 1;
    const onCommand = vi.fn();
    const view = playerView(game.world, game.playerId)!;
    render(<PlayerPanel game={game} view={view} items={game.world.items} onCommand={onCommand} />);
    fireEvent.click(screen.getByRole('button', { name: 'equip' }));
    expect(onCommand).toHaveBeenCalledWith({ type: 'equip', itemId: 'rune_2h_sword' });
  });

  describe('bestAffordableUpgrade', () => {
    const mk = (itemId: string, bestAsk: number | null) => ({ itemId, bestAsk });
    it('picks the biggest affordable, usable, non-owned gear upgrade', () => {
      const pick = bestAffordableUpgrade({}, { atk: 99, def: 99 }, 100_000, [mk('rune_2h_sword', 25_000), mk('adamant_dart', 100)], {});
      expect(pick).toMatchObject({ itemId: 'rune_2h_sword', delta: 45, price: 25_000, skill: 'atk' }); // atk 45 beats the dart's 10
    });
    it('falls back to what the purse can actually afford', () => {
      const pick = bestAffordableUpgrade({}, { atk: 99, def: 99 }, 200, [mk('rune_2h_sword', 25_000), mk('adamant_dart', 100)], {});
      expect(pick?.itemId).toBe('adamant_dart'); // the rune is out of budget
    });
    it('skips gear you already own and items with no live ask to buy into', () => {
      const pick = bestAffordableUpgrade({}, { atk: 99, def: 99 }, 100_000, [mk('rune_2h_sword', 25_000), mk('adamant_dart', null)], { rune_2h_sword: 1 });
      expect(pick).toBeNull(); // rune owned (equip it); dart has no ask
    });
    it('skips gear above your level and returns null when nothing qualifies', () => {
      expect(bestAffordableUpgrade({}, { atk: 1, def: 1 }, 100_000, [mk('rune_2h_sword', 25_000)], {})).toBeNull(); // req 14 > Attack 1
      expect(bestAffordableUpgrade({}, { atk: 99, def: 99 }, 100_000, [], {})).toBeNull(); // empty market
    });
  });

  describe('GearManager (Adventure-tab equipment manager)', () => {
    it('recommends the best affordable upgrade from the market, and omits it without a view', () => {
      const agent = { inventory: {}, worn: {}, combatXp: { atk: xpForLevel(99), def: xpForLevel(99), hp: 0 } } as unknown as AgentState;
      const items = [{ id: 'rune_2h_sword', name: 'Rune 2h sword' }] as unknown as ItemDef[];
      const view = { gp: 100_000, markets: [{ itemId: 'rune_2h_sword', bestAsk: 25_000 }] } as unknown as PlayerView;
      const withView = render(<GearManager agent={agent} items={items} onCommand={() => {}} view={view} />);
      const line = withView.container.querySelector('.bestbuy');
      expect(line!.textContent).toMatch(/best buy:.*Rune 2h sword/);
      expect(line!.textContent).toMatch(/⚔\+45/);
      expect(line!.textContent).toMatch(/25,000 gp/);
      withView.unmount();
      const noView = render(<GearManager agent={agent} items={items} onCommand={() => {}} />);
      expect(noView.container.querySelector('.bestbuy')).toBeNull(); // no markets → no recommendation
    });

    it('the best-buy "→ buy" chip jumps to that item (calls onBuy), and is absent without onBuy', () => {
      const agent = { inventory: {}, worn: {}, combatXp: { atk: xpForLevel(99), def: xpForLevel(99), hp: 0 } } as unknown as AgentState;
      const items = [{ id: 'rune_2h_sword', name: 'Rune 2h sword' }] as unknown as ItemDef[];
      const view = { gp: 100_000, markets: [{ itemId: 'rune_2h_sword', bestAsk: 25_000 }] } as unknown as PlayerView;
      const onBuy = vi.fn();
      const withBuy = render(<GearManager agent={agent} items={items} onCommand={() => {}} view={view} onBuy={onBuy} />);
      fireEvent.click(within(withBuy.container.querySelector('.bestbuy') as HTMLElement).getByRole('button', { name: '→ buy' }));
      expect(onBuy).toHaveBeenCalledWith('rune_2h_sword');
      withBuy.unmount();
      // No onBuy → the recommendation still shows, but there's no buy chip
      const noBuy = render(<GearManager agent={agent} items={items} onCommand={() => {}} view={view} />);
      expect(noBuy.container.querySelector('.bestbuy')).toBeTruthy();
      expect(within(noBuy.container.querySelector('.bestbuy') as HTMLElement).queryByRole('button')).toBeNull();
    });

    it('shows each gear piece stats, its requirement, and the upgrade verdict vs what is worn', () => {
      const agent = {
        inventory: { rune_2h_sword: 1 }, // weapon, atk 45, req 14
        worn: { weapon: 'adamant_dart' }, // wearing atk 10
        combatXp: { atk: xpForLevel(99), def: xpForLevel(99), hp: 0 },
      } as unknown as AgentState;
      const items = [
        { id: 'rune_2h_sword', name: 'Rune 2h sword' },
        { id: 'adamant_dart', name: 'Adamant dart' },
      ] as unknown as ItemDef[];
      const onCommand = vi.fn();
      render(<GearManager agent={agent} items={items} onCommand={onCommand} />);
      expect(screen.getByText(/⚔\+45 · needs Attack 14/)).toBeTruthy(); // stats + requirement
      expect(screen.getByText(/↑ \+35 atk/)).toBeTruthy(); // upgrade vs worn (45 − 10)
      fireEvent.click(screen.getByRole('button', { name: 'equip' }));
      expect(onCommand).toHaveBeenCalledWith({ type: 'equip', itemId: 'rune_2h_sword' });
    });

    it('marks an under-level piece locked, and a weaker piece a downgrade', () => {
      const agent = {
        inventory: { rune_2h_sword: 1, adamant_dart: 1 }, // req 14 (locked) + req 1
        worn: { weapon: 'rune_dart' }, // atk 16 worn (rune_dart req 4)
        combatXp: { atk: xpForLevel(5), def: xpForLevel(5), hp: 0 }, // Attack 5
      } as unknown as AgentState;
      const items = [
        { id: 'rune_2h_sword', name: 'Rune 2h sword' },
        { id: 'adamant_dart', name: 'Adamant dart' },
        { id: 'rune_dart', name: 'Rune dart' },
      ] as unknown as ItemDef[];
      render(<GearManager agent={agent} items={items} onCommand={() => {}} />);
      expect(screen.getByText(/🔒 Attack 14/)).toBeTruthy(); // rune_2h_sword too high a level
      expect(screen.getByText(/↓ -6 atk/)).toBeTruthy(); // adamant dart (10) below worn rune_dart (16)
    });

    it('lists worn gear with an unequip action', () => {
      const agent = { inventory: {}, worn: { weapon: 'rune_2h_sword' }, combatXp: { atk: 0, def: 0, hp: 0 } } as unknown as AgentState;
      const items = [{ id: 'rune_2h_sword', name: 'Rune 2h sword' }] as unknown as ItemDef[];
      const onCommand = vi.fn();
      render(<GearManager agent={agent} items={items} onCommand={onCommand} />);
      fireEvent.click(screen.getByRole('button', { name: 'unequip' }));
      expect(onCommand).toHaveBeenCalledWith({ type: 'unequip', slot: 'weapon' });
    });

    it('orders owned gear with the biggest upgrade first', () => {
      const agent = {
        inventory: { rune_dart: 1, dragon_longsword: 1, rune_2h_sword: 1 }, // atk 16 / 50 / 45
        worn: {}, // empty weapon slot → delta = full atk
        combatXp: { atk: xpForLevel(99), def: xpForLevel(99), hp: 0 },
      } as unknown as AgentState;
      const items = [
        { id: 'rune_dart', name: 'Rune dart' },
        { id: 'dragon_longsword', name: 'Dragon longsword' },
        { id: 'rune_2h_sword', name: 'Rune 2h sword' },
      ] as unknown as ItemDef[];
      const { container } = render(<GearManager agent={agent} items={items} onCommand={() => {}} />);
      const names = Array.from(container.querySelectorAll('li')).map((r) => r.textContent ?? '');
      const at = (n: string) => names.findIndex((t) => t.includes(n));
      expect(at('Dragon longsword')).toBeLessThan(at('Rune 2h sword')); // +50 above +45
      expect(at('Rune 2h sword')).toBeLessThan(at('Rune dart')); // +45 above +16
    });
  });

  it('PlayerPanel equips your best gear in one click', () => {
    const game = newGame(42);
    game.world.agents[game.playerId]!.inventory['rune_2h_sword'] = 1; // a satchel gear upgrade
    const onCommand = vi.fn();
    const view = playerView(game.world, game.playerId)!;
    render(<PlayerPanel game={game} view={view} items={game.world.items} onCommand={onCommand} />);
    fireEvent.click(screen.getByRole('button', { name: 'equip best' }));
    expect(onCommand).toHaveBeenCalledWith({ type: 'equipBest' });
  });

  it('PlayerPanel shows the upgrade delta on a satchel gear stack', () => {
    const game = newGame(42);
    const agent = game.world.agents[game.playerId]!;
    agent.combatXp = { atk: xpForLevel(99), def: xpForLevel(99), hp: 0 }; // can wear anything
    agent.inventory['rune_2h_sword'] = 1; // weapon atk 45
    agent.worn = { weapon: 'adamant_dart' }; // currently wielding atk 10
    const onCommand = vi.fn();
    const view = playerView(game.world, game.playerId)!;
    render(<PlayerPanel game={game} view={view} items={game.world.items} onCommand={onCommand} />);
    expect(screen.getByText('⚔+35')).toBeTruthy(); // 45 − 10 = +35 Attack over what's worn
  });

  it('PlayerPanel shows equipped gear with an unequip button', () => {
    const game = newGame(42);
    const onCommand = vi.fn();
    const view = playerView(game.world, game.playerId)!;
    view.worn = { weapon: 'rune_2h_sword' };
    render(<PlayerPanel game={game} view={view} items={game.world.items} onCommand={onCommand} />);
    expect(screen.getByText('Equipped')).toBeTruthy();
    fireEvent.click(screen.getByText('unequip'));
    expect(onCommand).toHaveBeenCalledWith({ type: 'unequip', slot: 'weapon' });
  });

  // Edge cases probed by the brick-125 adversarial review — pinned so the
  // verified-sound behaviour can't silently regress. (FINDINGS #159.)
  describe('helper edge cases (adversarial-review regression pins)', () => {
    it('expectedHit never returns 0, so combatForecast never divides by zero/Infinity', () => {
      expect(expectedHit(0, 999)).toBeGreaterThanOrEqual(1);
      expect(expectedHit(1, 1_000_000)).toBeGreaterThanOrEqual(1);
      const f = combatForecast({ atk: 0, def: 0, hp: 10 }, { atk: 999, def: 0, hp: 999 }, 999);
      expect(Number.isFinite(f.roundsToKill)).toBe(true);
      expect(Number.isFinite(f.roundsToFall)).toBe(true);
    });
    it('breakEvenSell terminates and stays exact at the boundaries', () => {
      expect(breakEvenSell(0, 0.02)).toBe(0); // zero basis
      expect(breakEvenSell(1, 0.02)).toBe(1); // 1 − floor(0.02)=0 → recovers exactly
      const be = breakEvenSell(1_000_000, 0.02); // huge basis: terminates, finite, exact
      expect(Number.isFinite(be)).toBe(true);
      expect(be - Math.floor(be * 0.02)).toBeGreaterThanOrEqual(1_000_000);
      expect(be - 1 - Math.floor((be - 1) * 0.02)).toBeLessThan(1_000_000);
    });
    it('portfolio + raid aggregates handle empty inputs without NaN', () => {
      expect(positionConcentration([])).toEqual({ weights: [], topPct: 0, count: 0 });
      expect(raidTotals(undefined)).toEqual({ runs: 0, deaths: 0, banked: 0, lost: 0 });
    });
    it('priceSwing reads the realized lo/hi range and buckets the choppiness', () => {
      expect(priceSwing([])).toBeNull(); // no trades
      expect(priceSwing([1000])).toBeNull(); // one point can't swing
      expect(priceSwing([100, 100, 100])).toMatchObject({ lo: 100, hi: 100, swingPct: 0, read: 'steady' }); // flat
      expect(priceSwing([100, 103])).toMatchObject({ lo: 100, hi: 103, read: 'steady' }); // +3% < 4%
      expect(priceSwing([100, 108, 95])).toMatchObject({ lo: 95, hi: 108, read: 'wild' }); // (108-95)/95 ≈ 13.7% ≥ 10%
      expect(priceSwing([100, 106])!.read).toBe('choppy'); // 6% in the [4%,10%) band
      expect(priceSwing([100, 130])!.read).toBe('wild'); // +30% -> wild
    });
    it('worthBreakdown clamps an over-escrowed residual to 0 (torn-snapshot display guard)', () => {
      const view = { gp: 1000, openOrders: [{ side: 'buy', price: 100, remaining: 10 }] } as unknown as PlayerView;
      expect(worthBreakdown(view, 1500).holdings).toBe(0); // residual 1500−1000−1000 = −500 → clamped
    });
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

  describe('flipAffordability', () => {
    it('counts units your gp can buy, capped by the GE limit', () => {
      // buy 1001, gp 10,000 → 9 affordable; under the 500 limit, so gp is the bind
      expect(flipAffordability(1001, 10_000, 500)).toEqual({ units: 9, affordable: true, limited: false });
    });
    it('caps at the GE buy limit when gp would allow more', () => {
      expect(flipAffordability(100, 100_000, 50)).toEqual({ units: 50, affordable: true, limited: true });
    });
    it('is unaffordable when one unit exceeds your gp', () => {
      expect(flipAffordability(1001, 500, null)).toEqual({ units: 0, affordable: false, limited: false });
    });
    it('treats a null limit as unlimited', () => {
      expect(flipAffordability(100, 1_000, null)).toEqual({ units: 10, affordable: true, limited: false });
    });
    it('does not flag a zero buy limit as "limited" — that is unaffordable, not capped', () => {
      expect(flipAffordability(100, 1_000, 0)).toEqual({ units: 0, affordable: false, limited: false });
    });
  });

  it('TopFlips marks a flip the GE buy limit caps (gp to spare)', () => {
    const view = {
      gp: 1_000_000, // plenty — the GE limit, not your purse, is the cap
      markets: [{ itemId: 'a', bestBid: 100, bestAsk: 200, buyRemaining: 5 }],
    } as unknown as PlayerView;
    const items = [{ id: 'a', name: 'Item A' }] as unknown as ItemDef[];
    const { container } = render(<TopFlips view={view} items={items} onSelect={() => {}} />);
    expect(container.querySelector('.gecap')).toBeTruthy(); // "GE" marker on the ×N badge
  });

  it('TopFlips shows the affordability badge and a "fits purse" filter', () => {
    const view = {
      gp: 1_500, // covers the cheap flip (×30) but not one unit of the rich one
      markets: [
        { itemId: 'rich', bestBid: 10_000, bestAsk: 11_000 }, // buy 10,001 — unaffordable
        { itemId: 'cheap', bestBid: 50, bestAsk: 120 }, // buy 51 — ×29 affordable, smaller margin
      ],
    } as unknown as PlayerView;
    const items = [{ id: 'rich', name: 'Rich item' }, { id: 'cheap', name: 'Cheap item' }] as unknown as ItemDef[];
    render(<TopFlips view={view} items={items} onSelect={() => {}} />);
    // the rich (top-margin) flip is marked unaffordable, the cheap one shows ×N
    expect(screen.getByText('✕')).toBeTruthy();
    expect(screen.getByText(/^×\d+$/)).toBeTruthy();
    // flip to "fits purse": the unaffordable rich flip drops out
    fireEvent.click(screen.getByRole('button', { name: 'fits purse' }));
    expect(screen.queryByText('Rich item')).toBeNull();
    expect(screen.getByText('Cheap item')).toBeTruthy();
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

  describe('equipped — persistent worn gear override', () => {
    it('shows the EQUIPPED piece even when a stronger one sits in the satchel (truthful, mirrors deriveStats)', () => {
      // The honest case: you hold the best weapon but have equipped a weak one —
      // combat fights in the worn piece, so the paperdoll must show it too.
      const kit = equipped({ dragon_longsword: 1 }, { atk: 99, def: 99 }, { weapon: 'adamant_dart' });
      expect(kit.weapon).toBe('adamant_dart');
    });
    it('fills a slot the satchel cannot (equipped gear has left the inventory)', () => {
      const kit = equipped({}, { atk: 99, def: 99 }, { body: 'rune_platebody' });
      expect(kit.body).toBe('rune_platebody');
    });
    it('without a worn arg, behaviour is unchanged — best usable from inventory', () => {
      const kit = equipped({ adamant_dart: 1, dragon_longsword: 1 }, { atk: 99, def: 99 });
      expect(kit.weapon).toBe('dragon_longsword');
    });
    it('breaks stat-ties by smaller itemId — same rule as equipBest, so the doll matches', () => {
      // rune_plateskirt vs rune_platelegs: identical stats; smaller itemId wins.
      const kit = equipped({ rune_plateskirt: 1, rune_platelegs: 1 }, { atk: 99, def: 99 });
      expect(kit.legs).toBe('rune_platelegs');
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

  it('TradeTicket previews the gear upgrade before you buy', () => {
    const game = newGame(42);
    const agent = game.world.agents[game.playerId]!;
    agent.worn = { weapon: 'adamant_dart' }; // currently wielding atk 10
    const view = playerView(game.world, game.playerId)!;
    render(
      <TradeTicket
        view={view}
        selected="rune_2h_sword" // weapon atk 45 → +35 over the worn dart
        items={game.world.items}
        lvls={{ atk: 99, def: 99 }}
        prefill={null}
        onCommand={() => {}}
        lastResult={null}
        eventNote={null}
        recentPrices={[]}
        position={null}
        watched={false}
        onToggleWatch={() => {}}
      />,
    );
    expect(screen.getByText(/equips as/)).toBeTruthy();
    expect(screen.getByText('⚔+35 Attack')).toBeTruthy();
  });

  it('TradeTicket shows no gear preview for a non-gear commodity', () => {
    const game = newGame(42);
    const view = playerView(game.world, game.playerId)!;
    render(
      <TradeTicket
        view={view}
        selected="shark" // not gear
        items={game.world.items}
        lvls={{ atk: 99, def: 99 }}
        prefill={null}
        onCommand={() => {}}
        lastResult={null}
        eventNote={null}
        recentPrices={[]}
        position={null}
        watched={false}
        onToggleWatch={() => {}}
      />,
    );
    expect(screen.queryByText(/equips as/)).toBeNull();
  });

  it('TradeTicket shows the realized price-swing readout when recent trades exist', () => {
    const game = newGame(42);
    const view = playerView(game.world, game.playerId)!;
    const { container } = render(
      <TradeTicket
        view={view}
        selected="gold_bar"
        items={game.world.items}
        lvls={{ atk: 99, def: 99 }}
        prefill={null}
        onCommand={() => {}}
        lastResult={null}
        eventNote={null}
        recentPrices={[100, 140, 110]} // lo 100, hi 140 → +40% swing → wild
        position={null}
        watched={false}
        onToggleWatch={() => {}}
      />,
    );
    const swing = container.querySelector('p.swing');
    expect(swing).toBeTruthy();
    expect(swing!.textContent).toMatch(/recent 100–140/);
    expect(swing!.textContent).toMatch(/swing 40% · 🔴 wild/);
  });

  it('TradeTicket omits the swing readout when there are too few trades', () => {
    const game = newGame(42);
    const view = playerView(game.world, game.playerId)!;
    const { container } = render(
      <TradeTicket
        view={view}
        selected="gold_bar"
        items={game.world.items}
        lvls={{ atk: 99, def: 99 }}
        prefill={null}
        onCommand={() => {}}
        lastResult={null}
        eventNote={null}
        recentPrices={[100]} // one trade — nothing to swing
        position={null}
        watched={false}
        onToggleWatch={() => {}}
      />,
    );
    expect(container.querySelector('p.swing')).toBeNull();
  });

  it('TradeTicket tints the price field red when a sell is below break-even', () => {
    const game = newGame(42);
    const view = playerView(game.world, game.playerId)!;
    const ticket = (price: number) => (
      <TradeTicket
        view={view}
        selected="gold_bar"
        items={game.world.items}
        lvls={{ atk: 1, def: 1 }}
        prefill={{ side: 'sell', price, n: 1 }}
        onCommand={() => {}}
        lastResult={null}
        eventNote={null}
        recentPrices={[]}
        position={{ units: 10, avgCost: 1000 }} // break-even ≈ 1,021 after the 2% tax
        watched={false}
        onToggleWatch={() => {}}
      />
    );
    const below = render(ticket(900)).container; // a sell at 900 loses money → tinted
    expect(below.querySelector('input.belowbe')).toBeTruthy();
    const above = render(ticket(1100)).container; // a sell at 1100 clears cost → not tinted
    expect(above.querySelector('input.belowbe')).toBeNull();
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

  describe('underwaterSummary', () => {
    const p = (itemId: string, unrealized: number, marked = true) => ({
      itemId, unrealized, marked, units: 0, avgCost: 0, mark: 0, value: 0, cost: 0, unrealizedPct: 0,
    });
    it('counts and sums only marked losers, finding the worst', () => {
      const u = underwaterSummary([p('a', 500), p('b', -200), p('c', -1000), p('d', -50, false)]);
      expect(u.count).toBe(2); // b + c; a is a winner, d is unmarked (no live price)
      expect(u.paperLoss).toBe(-1200);
      expect(u.worst).toEqual({ itemId: 'c', unrealized: -1000 });
    });
    it('is empty when nothing is underwater', () => {
      expect(underwaterSummary([p('a', 0), p('b', 300)])).toEqual({ count: 0, paperLoss: 0, worst: null });
    });
  });

  it('PositionsPanel flags positions trading below cost', () => {
    const game = newGame(42);
    game.tradeBook = bookFromFills([{ tick: 0, itemId: FIRST.id, side: 'buy', qty: 10, price: 100 }], 0.02);
    const view = { markets: [{ itemId: FIRST.id, lastPrice: 80 }] } as unknown as PlayerView; // −200 paper
    const { container } = render(<PositionsPanel game={game} view={view} items={DEFAULT_ITEMS} onSelect={() => {}} />);
    expect(screen.getByText(/underwater/)).toBeTruthy(); // the risk callout
    expect(container.querySelector('.mover.underwater')).toBeTruthy(); // the losing row is tinted
  });

  it('PositionsPanel cuts a loser with a two-tap market sell (arm, then confirm)', () => {
    const game = newGame(42);
    game.tradeBook = bookFromFills([{ tick: 0, itemId: FIRST.id, side: 'buy', qty: 10, price: 100 }], 0.02);
    const onCommand = vi.fn();
    const onSelect = vi.fn();
    // underwater (avg 100 → mark 80), with a resting best bid at 78 to sell into
    const view = { markets: [{ itemId: FIRST.id, lastPrice: 80, bestBid: 78 }] } as unknown as PlayerView;
    render(<PositionsPanel game={game} view={view} items={DEFAULT_ITEMS} onSelect={onSelect} onCommand={onCommand} />);
    fireEvent.click(screen.getByText('✂ cut')); // first tap ARMS — must not sell yet
    expect(onCommand).not.toHaveBeenCalled();
    fireEvent.click(screen.getByText('confirm ✓')); // confirm — market-sell the whole position
    expect(onCommand).toHaveBeenCalledWith({ type: 'place', itemId: FIRST.id, side: 'sell', price: 78, qty: 10 });
    expect(onSelect).not.toHaveBeenCalled(); // the chip stops the row's load-in-ticket click
  });

  it('PositionsPanel shows no cut chip without an onCommand handler', () => {
    const game = newGame(42);
    game.tradeBook = bookFromFills([{ tick: 0, itemId: FIRST.id, side: 'buy', qty: 10, price: 100 }], 0.02);
    const view = { markets: [{ itemId: FIRST.id, lastPrice: 80, bestBid: 78 }] } as unknown as PlayerView;
    render(<PositionsPanel game={game} view={view} items={DEFAULT_ITEMS} onSelect={() => {}} />);
    expect(screen.queryByText('✂ cut')).toBeNull();
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

  describe('fill notification', () => {
    it('fillSummary aggregates buys + sells, null when empty', () => {
      expect(fillSummary([])).toBeNull();
      expect(fillSummary([{ tick: 0, itemId: 'a', side: 'buy', qty: 5, price: 10 }])).toBe('bought 5');
      expect(
        fillSummary([
          { tick: 0, itemId: 'a', side: 'buy', qty: 5, price: 10 },
          { tick: 0, itemId: 'b', side: 'sell', qty: 3, price: 20 },
          { tick: 0, itemId: 'a', side: 'buy', qty: 2, price: 10 },
        ]),
      ).toBe('bought 7 · sold 3');
    });
    it('recordFills returns the newly-latched player fills', () => {
      const game = newGame(42);
      game.world.trades.push({
        tick: game.world.tick,
        itemId: FIRST.id,
        buyerId: game.playerId,
        sellerId: 999,
        qty: 5,
        price: 100,
      } as (typeof game.world.trades)[number]);
      const fresh = recordFills(game);
      expect(fresh).toHaveLength(1);
      expect(fresh[0]).toMatchObject({ itemId: FIRST.id, side: 'buy', qty: 5, price: 100 });
      // idempotent: a re-scan of the same trades window latches nothing new
      expect(recordFills(game)).toHaveLength(0);
    });
    it('fillToastFlavor names a single-item burst, aggregates a mixed one', () => {
      const name = (id: string) => (({ shark: 'Shark', bond: 'Bond' }) as Record<string, string>)[id] ?? id;
      expect(fillToastFlavor([], name)).toBeNull();
      expect(
        fillToastFlavor(
          [
            { tick: 0, itemId: 'shark', side: 'buy', qty: 30, price: 800 },
            { tick: 1, itemId: 'shark', side: 'buy', qty: 20, price: 810 },
          ],
          name,
        ),
      ).toBe('bought 50 Shark'); // one item, one side → named
      expect(
        fillToastFlavor(
          [
            { tick: 0, itemId: 'shark', side: 'buy', qty: 30, price: 800 },
            { tick: 0, itemId: 'bond', side: 'sell', qty: 5, price: 100 },
          ],
          name,
        ),
      ).toBe('bought 30 · sold 5'); // mixed items → aggregate
    });
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
      expect(regionDanger(wild)).toEqual({ atk: 24, def: 13, hp: 130, elite: true, leech: 0 });
      const maw = REGIONS.find((r) => r.id === 'dragons_maw')!;
      expect(regionDanger(maw).elite).toBe(true); // Vorkanth stalks the Maw
      expect(regionDanger(maw).atk).toBeGreaterThanOrEqual(30); // the Elder out-hits the dragons
    });
    it('reports the worst loot-drain (leech) — the Abyss bites, others do not', () => {
      const abyss = REGIONS.find((r) => r.id === 'the_abyss')!;
      expect(regionDanger(abyss).leech).toBeGreaterThan(0); // vessith/demon/leech drain loot
      const plains = REGIONS.find((r) => r.id === 'lumbridge_plains')!;
      expect(regionDanger(plains).leech).toBe(0);
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

  it('CharacterPanel paperdoll reflects ACTUAL worn gear, not the satchel-best preview', () => {
    // Holds a strong weapon but has equipped a weak one. The figure must show
    // what fights (worn adamant dart, atk 10), matching the equipment manager —
    // not the dragon longsword (atk 50) still sitting in the satchel.
    const agent = {
      inventory: { dragon_longsword: 1 },
      worn: { weapon: 'adamant_dart' },
      combatXp: { atk: xpForLevel(99), def: xpForLevel(99), hp: 0 },
    } as unknown as AgentState;
    render(<CharacterPanel agent={agent} names={new Map([['adamant_dart', 'Adamant dart'], ['dragon_longsword', 'Dragon longsword']])} />);
    const equiplist = document.querySelector('.equiplist')!;
    expect(equiplist.textContent).toContain('Adamant dart'); // the worn piece is shown
    expect(equiplist.textContent).not.toContain('Dragon longsword'); // the satchel-best is NOT
    // effective Attack = base 5 + (99-1) levels + worn atk 10 = 113 (worn, not the dragon's 50)
    expect(document.querySelector('.effstats')!.textContent).toMatch(/⚔113/);
  });

  describe('healEta', () => {
    it('ticks to full at +1 hp per regen window; null when full', () => {
      expect(healEta(40, 50, 3)).toBe(30); // 10 missing × 3 ticks
      expect(healEta(50, 50, 3)).toBeNull();
      expect(healEta(51, 50, 3)).toBeNull(); // over-full guard
    });
  });

  it('CharacterPanel shows a rest ETA when wounded out of the field, none at full', () => {
    const wounded = { inventory: {}, combatXp: { atk: 0, def: 0, hp: 0 }, hp: 40 } as unknown as AgentState;
    const { unmount } = render(<CharacterPanel agent={wounded} names={new Map()} />);
    expect(screen.getByText(/ticks to heal/)).toBeTruthy();
    unmount();
    const full = { inventory: {}, combatXp: { atk: 0, def: 0, hp: 0 } } as unknown as AgentState; // hp absent = full
    render(<CharacterPanel agent={full} names={new Map()} />);
    expect(screen.queryByText(/ticks to heal/)).toBeNull();
  });

  it('CharacterPanel "rest to full" fast-forwards the heal ETA', () => {
    const wounded = { inventory: {}, combatXp: { atk: 0, def: 0, hp: 0 }, hp: 40 } as unknown as AgentState;
    const onRest = vi.fn();
    render(<CharacterPanel agent={wounded} names={new Map()} onRest={onRest} />);
    fireEvent.click(screen.getByRole('button', { name: 'rest to full' }));
    expect(onRest).toHaveBeenCalledTimes(1);
    expect(onRest.mock.calls[0]![0]).toBeGreaterThan(0); // (trainedMax − 40) × REST_REGEN_TICKS
  });

  it('CharacterPanel flashes a skill cell the moment it levels up', () => {
    // The engine mutates the SAME agent in place on a level-up — mirror that
    // (a NEW agent object would be a save swap, which must NOT flash; see below).
    const agent = { inventory: {}, combatXp: { atk: 0, def: 0, hp: 0 } } as unknown as AgentState;
    const { container, rerender } = render(<CharacterPanel agent={agent} names={new Map()} />);
    expect(container.querySelector('.skillcell.flash')).toBeNull(); // first render = baseline, no flash
    agent.combatXp = { atk: xpForLevel(5), def: 0, hp: 0 }; // Attack 1 → 5, same object
    rerender(<CharacterPanel agent={agent} names={new Map()} />);
    expect(container.querySelector('.skillcell.flash')).toBeTruthy();
  });

  it('CharacterPanel does NOT flash on an agent SWAP (save load), only a real level-up', () => {
    const a1 = { inventory: {}, combatXp: { atk: 0, def: 0, hp: 0 } } as unknown as AgentState;
    const { container, rerender } = render(<CharacterPanel agent={a1} names={new Map()} />);
    // A DIFFERENT agent object at a higher level = adopting a save, not leveling.
    const a2 = { inventory: {}, combatXp: { atk: xpForLevel(20), def: 0, hp: 0 } } as unknown as AgentState;
    rerender(<CharacterPanel agent={a2} names={new Map()} />);
    expect(container.querySelector('.skillcell.flash')).toBeNull(); // re-baselined — no false celebration
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

  it('the Realm Conquered deed needs EVERY region mastered, with partial progress', () => {
    const game = newGame(42);
    const view = playerView(game.world, game.playerId)!;
    const deed = MILESTONES.find((m) => m.id === 'realm-conquered')!;
    const roster = (r: { monsters: string[]; elite?: string }) =>
      [...new Set(r.elite ? [...r.monsters, r.elite] : r.monsters)];

    // fresh world — nothing slain
    expect(deed.achieved(game, view, 0)).toBe(false);
    expect(deed.progress!(game, view, 0)).toBe(0);

    // master ONE region's full roster → partial credit, still not done
    game.world.stats.killsByMonster = Object.fromEntries(roster(REGIONS[0]!).map((id) => [id, 1]));
    expect(deed.achieved(game, view, 0)).toBe(false);
    expect(deed.progress!(game, view, 0)).toBeCloseTo(1 / REGIONS.length);

    // master EVERY region → achieved + progress 1, and it latches via checkMilestones
    const allFoes = new Set(REGIONS.flatMap((r) => roster(r)));
    game.world.stats.killsByMonster = Object.fromEntries([...allFoes].map((id) => [id, 1]));
    expect(deed.achieved(game, view, 0)).toBe(true);
    expect(deed.progress!(game, view, 0)).toBe(1);
    expect(checkMilestones(game, view, 0).map((m) => m.id)).toContain('realm-conquered');
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
    const panel = document.querySelector('.embark') as HTMLElement;
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

  it('the extract button shows the loot it would bank (the push-your-luck stake)', () => {
    const game = newGame(42);
    const agent = game.world.agents[game.playerId]!;
    agent.expedition = {
      regionId: 'lumbridge_plains',
      rngState: 1,
      hp: 50,
      pack: {},
      packGp: 5000, // 5,000 gp of loot gathered, no forced combat → free to extract
      cleared: 3,
      combat: null, // between fights — free to extract
    };
    render(<App initial={game} />);
    fireEvent.click(screen.getByRole('tab', { name: /Adventure/ }));
    const extract = screen.getByRole('button', { name: /extract · bank 5,000 gp/ });
    expect(extract.className).toContain('hasloot'); // emphasised as the payoff action
  });

  it('the dive shows an hp-aware "push read" that turns risky when wounded', () => {
    const game = newGame(42);
    const agent = game.world.agents[game.playerId]!;
    agent.expedition = {
      regionId: 'dragons_maw', // a hard, fiery region
      rngState: 1,
      hp: 8, // badly wounded — pushing is a gamble
      pack: {},
      packGp: 5000,
      cleared: 5,
      combat: null, // between fights → the push read shows
    };
    render(<App initial={game} />);
    fireEvent.click(screen.getByRole('tab', { name: /Adventure/ }));
    const read = document.querySelector('p.forecast');
    expect(read?.textContent).toMatch(/push read:/);
    expect(read?.textContent).toMatch(/risky/); // wounded vs the Maw's hardest
    expect(read?.textContent).toMatch(/bank your haul/); // nudges extract while loot's at stake
  });

  it('the push read shows the survival cushion packed food buys', () => {
    const game = newGame(42);
    const agent = game.world.agents[game.playerId]!;
    agent.expedition = {
      regionId: 'dragons_maw',
      rngState: 1,
      hp: 8, // same wounded setup as above, but now with food packed
      pack: { shark: 4 }, // 80 hp of cushion
      packGp: 5000,
      cleared: 5,
      combat: null,
    };
    render(<App initial={game} />);
    fireEvent.click(screen.getByRole('tab', { name: /Adventure/ }));
    const read = document.querySelector('p.forecast');
    expect(read?.textContent).toMatch(/push read:/);
    expect(read?.textContent).toMatch(/🍖 food \+≈/); // the cushion clause shows when food is packed
  });

  it('the combat view shows the foe stats with danger colour (know your enemy)', () => {
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
    const foeStats = screen.getByTitle(/out-matches/);
    // goblin atk 4 > your def 2 → red (.down); goblin def 1 < your atk 5 → green (.up)
    expect(foeStats.querySelector('.down')?.textContent).toBe('4');
    expect(foeStats.querySelector('.up')?.textContent).toBe('1');
  });

  it('the combat view warns when a foe drains loot (leech = gp-race)', () => {
    const game = newGame(42);
    const agent = game.world.agents[game.playerId]!;
    agent.expedition = {
      regionId: 'the_abyss',
      rngState: 1,
      hp: 50,
      pack: {},
      packGp: 1000,
      cleared: 0,
      combat: { monsterId: 'abyssal_leech', monsterHp: 60, playerHp: 50, antifire: false, maxHp: 50, outcome: 'fighting', lootGp: 0, lootItems: [], log: ['the dark stirs'] },
    };
    render(<App initial={game} />);
    fireEvent.click(screen.getByRole('tab', { name: /Adventure/ }));
    expect(screen.getByText(/40 gp\/round/)).toBeTruthy(); // abyssal_leech drains 40 loot gp/round
  });

  it('the bestiary lists a met monster with its combat stats', () => {
    const game = newGame(42);
    game.world.stats.monstersSlain = 3;
    game.world.stats.killsByMonster = { goblin: 3 };
    render(<App initial={game} />);
    fireEvent.click(screen.getByRole('tab', { name: /Adventure/ }));
    const bestiary = document.querySelector('.bestiary')!;
    expect(bestiary.textContent).toContain('12 hp'); // goblin hp
    expect(bestiary.textContent).toMatch(/⚔4 🛡1/); // goblin atk 4 / def 1
  });

  it('the dive stats reflect equipped gear (worn overrides the pack, matching combat)', () => {
    const game = newGame(42);
    const agent = game.world.agents[game.playerId]!;
    agent.combatXp = { atk: xpForLevel(99), def: xpForLevel(99), hp: 0 };
    agent.worn = { weapon: 'rune_2h_sword' }; // atk 45 — equipped, not packed
    agent.expedition = {
      regionId: 'lumbridge_plains',
      rngState: 1,
      hp: 50,
      pack: {},
      packGp: 0,
      cleared: 0,
      combat: null,
    };
    render(<App initial={game} />);
    fireEvent.click(screen.getByRole('tab', { name: /Adventure/ }));
    // base atk 5 + (99−1) levels + worn rune_2h_sword 45 = 148 (NOT 103 without the weapon)
    expect(screen.getByText(/atk 148/)).toBeTruthy();
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
    const panel = document.querySelector('.embark') as HTMLElement;
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
    const panel = document.querySelector('.embark') as HTMLElement;
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
    const panel = document.querySelector('.embark') as HTMLElement;
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
    const panel = document.querySelector('.embark') as HTMLElement;
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

  describe('recentFlips', () => {
    const f = (tick: number, side: 'buy' | 'sell', qty: number, price: number, itemId = 'a') => ({ tick, side, itemId, qty, price });
    it('FIFO-matches sells against earlier buys and nets the tax', () => {
      // buy 10 @ 100, sell 10 @ 150 → proceeds 150-floor(150*.02)=147; profit (147-100)*10 = 470
      const flips = recentFlips([f(1, 'buy', 10, 100), f(2, 'sell', 10, 150)], 0.02);
      expect(flips).toHaveLength(1);
      expect(flips[0]).toMatchObject({ itemId: 'a', qty: 10, buyAvg: 100, sellPrice: 150, profit: 470, tick: 2 });
    });
    it('drops a sell with no matching buy (dumped loot)', () => {
      expect(recentFlips([f(1, 'sell', 5, 100)], 0.02)).toEqual([]);
    });
    it('blends multiple buy lots into one flip and orders newest first', () => {
      const flips = recentFlips(
        [f(1, 'buy', 5, 100), f(2, 'buy', 5, 200), f(3, 'sell', 10, 300), f(4, 'sell', 1, 50, 'b'), f(4, 'buy', 1, 10, 'b')],
        0.02,
      );
      expect(flips[0]!.tick).toBe(3); // newest completed flip first
      expect(flips[0]!.buyAvg).toBe(150); // (5×100 + 5×200)/10
    });
  });

  it('TradeFeed "flips" mode shows completed round-trips with profit', () => {
    const fills = [
      { tick: 1, itemId: FIRST.id, side: 'buy' as const, qty: 10, price: 100 },
      { tick: 2, itemId: FIRST.id, side: 'sell' as const, qty: 10, price: 150 },
    ];
    const { container } = render(<TradeFeed trades={[]} fills={fills} items={[FIRST]} playerId={1} />);
    fireEvent.click(screen.getByRole('button', { name: 'flips' }));
    const text = container.querySelector('.feed')!.textContent ?? '';
    expect(text).toContain('100→150'); // the round-trip's buy→sell
    expect(text).toContain('+470'); // net profit after tax
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
