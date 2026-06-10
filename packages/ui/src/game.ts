// Game bootstrap + persistence. The human is an idle-policy player agent:
// engine-inert unless automation is purchased, acting only via UI commands.
import { addAgent, createWorld } from '@exchange-wars/engine';
import type { WorldState } from '@exchange-wars/engine';

export interface Game {
  world: WorldState;
  playerId: number;
  /** What the human started with — session profit is measured against this. */
  startGp: number;
  /** Throttled net-worth samples for the Fortune chart (persisted). */
  worthHistory: { tick: number; worth: number }[];
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

export function saveGame(game: Game): void {
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
