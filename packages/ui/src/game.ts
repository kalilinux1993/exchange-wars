// Game bootstrap + persistence. The human is an idle-policy player agent:
// engine-inert unless automation is purchased, acting only via UI commands.
import { addAgent, createWorld, EVENT_LABELS, playerView, runTicks } from '@exchange-wars/engine';
import type { PlayerView, WorldEvent, WorldState } from '@exchange-wars/engine';

export interface Game {
  world: WorldState;
  playerId: number;
  /** What the human started with — session profit is measured against this. */
  startGp: number;
  /** Throttled net-worth samples for the Fortune chart (persisted). */
  worthHistory: { tick: number; worth: number }[];
  /** Wall-clock ms at last save — drives offline accrual on reopen. */
  lastSeenMs?: number;
  /** Latched milestone ids (persisted; never un-latch). */
  milestones: string[];
  /** The Chronicle: event begin/end headlines (capped, persisted). */
  newsLog: NewsEntry[];
  /** Events we've already headlined (so endings can be detected). */
  seenEvents: { id: string; itemId: string; kind: WorldEvent['kind'] }[];
}

export interface NewsEntry {
  tick: number;
  text: string;
  kind: WorldEvent['kind'] | 'ended';
}

const NEWS_CAP = 12;

/** Detect event begins/ends since the last check and append headlines. */
export function updateNews(game: Game): void {
  const tick = game.world.tick;
  const names = new Map(game.world.items.map((i) => [i.id, i.name]));
  const active = (game.world.events ?? []).filter((e) => e.startTick <= tick && e.endTick > tick);
  for (const e of active) {
    if (!game.seenEvents.some((s) => s.id === e.id)) {
      game.seenEvents.push({ id: e.id, itemId: e.itemId, kind: e.kind });
      game.newsLog.push({ tick, text: `${names.get(e.itemId) ?? e.itemId} ${EVENT_LABELS[e.kind]} begins`, kind: e.kind });
    }
  }
  for (let i = game.seenEvents.length - 1; i >= 0; i--) {
    const s = game.seenEvents[i]!;
    if (!active.some((e) => e.id === s.id)) {
      game.seenEvents.splice(i, 1);
      game.newsLog.push({ tick, text: `${names.get(s.itemId) ?? s.itemId} ${EVENT_LABELS[s.kind]} ends`, kind: 'ended' });
    }
  }
  if (game.newsLog.length > NEWS_CAP) game.newsLog.splice(0, game.newsLog.length - NEWS_CAP);
}

export interface Milestone {
  id: string;
  name: string;
  flavor: string;
  achieved: (game: Game, view: PlayerView, worth: number) => boolean;
}

export const MILESTONES: Milestone[] = [
  {
    id: 'first-offer',
    name: 'Open for Business',
    flavor: 'Your first offer rests on the books.',
    achieved: (_g, view) => view.openOrders.length > 0,
  },
  {
    id: 'first-goods',
    name: 'Goods in the Satchel',
    flavor: 'You hold actual merchandise.',
    achieved: (_g, view) => Object.values(view.inventory).some((q) => q > 0),
  },
  {
    id: 'hundred-k',
    name: 'Six Figures',
    flavor: 'The satchel jingles differently now.',
    achieved: (_g, _v, worth) => worth >= 100_000,
  },
  {
    id: 'doubled',
    name: 'Doubled Up',
    flavor: 'Twice what you walked in with.',
    achieved: (g, _v, worth) => worth >= g.startGp * 2,
  },
  {
    id: 'quarter-m',
    name: 'Merchant Prince',
    flavor: 'Clerks nod when you pass.',
    achieved: (_g, _v, worth) => worth >= 250_000,
  },
  {
    id: 'millionaire',
    name: 'gp Millionaire',
    flavor: 'The ledger needs wider columns.',
    achieved: (_g, _v, worth) => worth >= 1_000_000,
  },
  {
    id: 'full-counter',
    name: 'Full Counter',
    flavor: 'Every offer slot, bought and paid for.',
    achieved: (_g, view) => view.slots >= 8,
  },
  {
    id: 'hired-help',
    name: 'Hired Help',
    flavor: 'The clerk flips while you sleep.',
    achieved: (_g, view) => (view.upgrades['autoFlip'] ?? 0) >= 1,
  },
  {
    id: 'master-clerk',
    name: 'Master Clerk',
    flavor: 'Tier three. The counter runs itself.',
    achieved: (_g, view) => (view.upgrades['autoFlip'] ?? 0) >= 3,
  },
  {
    id: 'contractor',
    name: 'Royal Contractor',
    flavor: 'The quartermaster pays in full.',
    achieved: (g) => (g.world.stats.contractsFilled ?? 0) > 0,
  },
  {
    id: 'cornered',
    name: 'Market Corner',
    flavor: 'More than half of everything there is.',
    achieved: (g, view) => {
      const ledger = g.world.ledger;
      for (const item of g.world.items) {
        const sellEscrow = view.openOrders
          .filter((o) => o.itemId === item.id && o.side === 'sell')
          .reduce((a, o) => a + o.remaining, 0);
        const held = (view.inventory[item.id] ?? 0) + sellEscrow;
        if (held < 25) continue; // no trivial corners
        const circulating =
          (ledger.itemsInitial[item.id] ?? 0) +
          (ledger.itemsMinted[item.id] ?? 0) -
          (ledger.itemsBurned[item.id] ?? 0);
        if (circulating > 0 && held / circulating >= 0.5) return true;
      }
      return false;
    },
  },
];

/** Latch any newly-achieved milestones into the save; returns just the new ones. */
export function checkMilestones(game: Game, view: PlayerView, worth: number): Milestone[] {
  const newly: Milestone[] = [];
  for (const m of MILESTONES) {
    if (game.milestones.includes(m.id)) continue;
    if (m.achieved(game, view, worth)) {
      game.milestones.push(m.id);
      newly.push(m);
    }
  }
  return newly;
}

/** Liquid net worth from the view: gp + inventory and open orders at last price. */
export function viewNetWorth(view: PlayerView): number {
  const last = new Map(view.markets.map((m) => [m.itemId, m.lastPrice]));
  let total = view.gp;
  for (const [id, qty] of Object.entries(view.inventory)) total += qty * (last.get(id) ?? 0);
  for (const o of view.openOrders) {
    total += o.side === 'buy' ? o.price * o.remaining : o.remaining * (last.get(o.itemId) ?? 0);
  }
  return total;
}

const SAMPLE_EVERY_TICKS = 50;
const SAMPLE_CAP = 240;

/** Record a net-worth sample if enough ticks have passed since the last one. */
export function recordWorth(game: Game, worth: number): void {
  const h = game.worthHistory;
  const last = h.length > 0 ? h[h.length - 1]!.tick : Number.NEGATIVE_INFINITY;
  if (game.world.tick - last < SAMPLE_EVERY_TICKS) return;
  h.push({ tick: game.world.tick, worth });
  if (h.length > SAMPLE_CAP) h.splice(0, h.length - SAMPLE_CAP);
}

export const SAVE_KEY = 'exchange-wars-save-v1';
export const HUMAN_START_GP = 55_000;

export function newGame(seed: number): Game {
  const world = createWorld({ seed });
  const human = addAgent(world, 'player', HUMAN_START_GP, {});
  human.policy = 'idle';
  return {
    world,
    playerId: human.id,
    startGp: HUMAN_START_GP,
    worthHistory: [{ tick: 0, worth: HUMAN_START_GP }],
    milestones: [],
    newsLog: [],
    seenEvents: [],
  };
}

export const OFFLINE_TPS = 1;
export const OFFLINE_CAP_TICKS = 100_000; // ~28h at 1 tps — a full day away still pays
const OFFLINE_MIN_TICKS = 60; // ignore sub-minute blips (tab switches, reloads)

export interface OfflineResult {
  ticks: number;
  worthBefore: number;
  worthAfter: number;
}

/**
 * The idle-game contract: real time away advances the world at OFFLINE_TPS,
 * capped. Clock is injected so this stays unit-testable. Mutates the game
 * (fast-forwards + restamps lastSeenMs); returns null when nothing applied.
 */
export function applyOfflineProgress(game: Game, nowMs: number): OfflineResult | null {
  const last = game.lastSeenMs;
  game.lastSeenMs = nowMs;
  if (last === undefined || nowMs <= last) return null;
  const ticks = Math.min(OFFLINE_CAP_TICKS, Math.floor(((nowMs - last) / 1000) * OFFLINE_TPS));
  if (ticks < OFFLINE_MIN_TICKS) return null;
  const before = playerView(game.world, game.playerId);
  if (!before) return null;
  const worthBefore = viewNetWorth(before);
  runTicks(game.world, ticks);
  const after = playerView(game.world, game.playerId);
  const worthAfter = after ? viewNetWorth(after) : worthBefore;
  recordWorth(game, worthAfter);
  return { ticks, worthBefore, worthAfter };
}

export function saveGame(game: Game): void {
  game.lastSeenMs = Date.now();
  localStorage.setItem(SAVE_KEY, JSON.stringify(game));
}

export function loadGame(): Game | null {
  const raw = localStorage.getItem(SAVE_KEY);
  if (raw === null) return null;
  try {
    const game = JSON.parse(raw) as Game;
    // Default fields that predate older save formats.
    return {
      ...game,
      startGp: game.startGp ?? HUMAN_START_GP,
      worthHistory: game.worthHistory ?? [],
      milestones: game.milestones ?? [],
      newsLog: game.newsLog ?? [],
      seenEvents: game.seenEvents ?? [],
    };
  } catch {
    return null;
  }
}

export function clearSave(): void {
  localStorage.removeItem(SAVE_KEY);
}
