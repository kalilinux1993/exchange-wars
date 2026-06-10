// Game bootstrap + persistence. The human is an idle-policy player agent:
// engine-inert unless automation is purchased, acting only via UI commands.
import { addAgent, createWorld } from '@exchange-wars/engine';
import type { WorldState } from '@exchange-wars/engine';

export interface Game {
  world: WorldState;
  playerId: number;
  /** What the human started with — session profit is measured against this. */
  startGp: number;
}

export const SAVE_KEY = 'exchange-wars-save-v1';
export const HUMAN_START_GP = 30_000;

export function newGame(seed: number): Game {
  const world = createWorld({ seed });
  const human = addAgent(world, 'player', HUMAN_START_GP, {});
  human.policy = 'idle';
  return { world, playerId: human.id, startGp: HUMAN_START_GP };
}

export function saveGame(game: Game): void {
  localStorage.setItem(SAVE_KEY, JSON.stringify(game));
}

export function loadGame(): Game | null {
  const raw = localStorage.getItem(SAVE_KEY);
  if (raw === null) return null;
  try {
    const game = JSON.parse(raw) as Game;
    return { ...game, startGp: game.startGp ?? HUMAN_START_GP }; // pre-startGp saves
  } catch {
    return null;
  }
}

export function clearSave(): void {
  localStorage.removeItem(SAVE_KEY);
}
