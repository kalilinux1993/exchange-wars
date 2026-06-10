// Game bootstrap + persistence. The human is an idle-policy player agent:
// engine-inert unless automation is purchased, acting only via UI commands.
import { addAgent, createWorld, playerView, runTicks } from '@exchange-wars/engine';
import type { PlayerView, WorldState } from '@exchange-wars/engine';

export interface Game {
  world: WorldState;
  playerId: number;
  /** What the human started with — session profit is measured against this. */
  startGp: number;
  /** Throttled net-worth samples for the Fortune chart (persisted). */
  worthHistory: { tick: number; worth: number }[];
  /** Wall-clock ms at last save — drives offline accrual on reopen. */
  lastSeenMs?: number;
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
export const HUMAN_START_GP = 30_000;

export function newGame(seed: number): Game {
  const world = createWorld({ seed });
  const human = addAgent(world, 'player', HUMAN_START_GP, {});
  human.policy = 'idle';
  return {
    world,
    playerId: human.id,
    startGp: HUMAN_START_GP,
    worthHistory: [{ tick: 0, worth: HUMAN_START_GP }],
  };
}

export const OFFLINE_TPS = 1;
export const OFFLINE_CAP_TICKS = 50_000;
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
    return { ...game, startGp: game.startGp ?? HUMAN_START_GP, worthHistory: game.worthHistory ?? [] };
  } catch {
    return null;
  }
}

export function clearSave(): void {
  localStorage.removeItem(SAVE_KEY);
}
