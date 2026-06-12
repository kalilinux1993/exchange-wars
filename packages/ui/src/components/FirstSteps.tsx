import { SPRINT_TICKS } from '@exchange-wars/engine';
import type { PlayerView } from '@exchange-wars/engine';
import type { Game } from '../game';
import { usePref } from '../usePref';

export interface FirstStep {
  label: string;
  done: boolean;
  /** The tab where you'd do this step — makes an unfinished step a one-click jump (15b). */
  goto?: 'exchange' | 'adventure' | 'hall';
}

/**
 * The new-player "first four" — prospective guidance (what to DO next), distinct
 * from the retrospective Deeds. Each step's done-ness is derived from real game
 * state, so it self-checks as you play; the panel auto-hides once all four are
 * done. The actionable steps carry a `goto` so the panel can take you there. Pure.
 */
export function firstSteps(game: Game, view: PlayerView): FirstStep[] {
  return [
    { label: 'Place your first trade in the Grand Exchange', done: game.fills.length > 0, goto: 'exchange' },
    { label: 'Hire a clerk in the Hall to flip for you', done: (view.upgrades['autoFlip'] ?? 0) > 0, goto: 'hall' },
    { label: 'Delve on an Adventure — fell a monster', done: (game.world.stats.monstersSlain ?? 0) > 0, goto: 'adventure' },
    {
      // No `goto` — this is a time gate, not a place to go.
      label: `Reach tick ${SPRINT_TICKS.toLocaleString('en-US')} to enter the Sprint Board`,
      done: game.world.tick >= SPRINT_TICKS,
    },
  ];
}

/**
 * Getting Started (11v): a self-checking first-steps list for new players.
 * Hidden once every step is done, or when the player dismisses it (persisted).
 */
export function FirstSteps({
  game,
  view,
  onGo,
}: {
  game: Game;
  view: PlayerView;
  /** Jump to a tab — makes an unfinished step a one-click "take me there". */
  onGo?: ((room: 'exchange' | 'adventure' | 'hall') => void) | undefined;
}) {
  const [dismissed, setDismissed] = usePref<boolean>('ew-firststeps-dismissed', false);
  const steps = firstSteps(game, view);
  const got = steps.filter((s) => s.done).length;
  if (dismissed || got === steps.length) return null;
  return (
    <section className="panel firststeps">
      <h2>
        Getting Started <span className="dim">{got}/{steps.length}</span>
      </h2>
      <ul className="rows small">
        {steps.map((s, i) => {
          const linkable = !s.done && s.goto !== undefined && onGo !== undefined;
          return (
            <li key={i} className={s.done ? 'step done' : 'step'}>
              <span className={s.done ? 'up' : 'dim'}>{s.done ? '✓' : '○'}</span>
              {linkable ? (
                <button className="linkstep" title="take me there" onClick={() => onGo!(s.goto!)}>
                  {s.label}
                </button>
              ) : (
                <span className={s.done ? 'dim' : ''}>{s.label}</span>
              )}
            </li>
          );
        })}
      </ul>
      <button className="chip" title="hide this — you've got the idea" onClick={() => setDismissed(true)}>
        dismiss
      </button>
    </section>
  );
}
