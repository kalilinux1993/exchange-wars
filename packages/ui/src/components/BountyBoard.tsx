import { monsterById } from '@exchange-wars/engine';
import type { PlayerCommand } from '@exchange-wars/engine';
import type { Game } from '../game';

/**
 * The bounty board: the realm posts kill orders on its own schedule and pays
 * in freshly struck coin. Progress counts only kills made AFTER the posting
 * (the baseline) — old corpses earn no new paper.
 */
export function BountyBoard({ game, onCommand }: { game: Game; onCommand: (cmd: PlayerCommand) => void }) {
  const open = (game.world.bounties ?? []).filter((b) => b.expiresTick > game.world.tick);
  return (
    <section className="panel bounties">
      <h2>Bounty Board</h2>
      {open.length === 0 && <p className="dim small">no bounties posted — the realm is quiet, for now</p>}
      <ul className="rows small">
        {open.map((b) => {
          const m = monsterById(b.monsterId);
          const kills = Math.max(0, (game.world.stats.killsByMonster?.[b.monsterId] ?? 0) - b.baseline);
          const done = kills >= b.qty;
          const left = b.expiresTick - game.world.tick;
          return (
            <li key={b.id}>
              <span>
                {m.elite ? '★ ' : ''}
                {m.name} × {b.qty}
              </span>
              <span className="dim small">
                {Math.min(kills, b.qty)}/{b.qty} slain · {b.rewardGp.toLocaleString('en-US')} gp ·{' '}
                {left.toLocaleString('en-US')} ticks left
              </span>
              {done ? (
                <button className="chip" onClick={() => onCommand({ type: 'claimBounty', bountyId: b.id })}>
                  claim
                </button>
              ) : (
                <span className="dim small">hunting…</span>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
