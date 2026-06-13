import { monsterById } from '@exchange-wars/engine';
import type { PlayerCommand } from '@exchange-wars/engine';
import { huntRegionId, monsterRegions, type Game } from '../game';

/**
 * The bounty board: the realm posts kill orders on its own schedule and pays
 * in freshly struck coin. Progress counts only kills made AFTER the posting
 * (the baseline) — old corpses earn no new paper.
 */
export function BountyBoard({
  game,
  onCommand,
  onHunt,
}: {
  game: Game;
  onCommand: (cmd: PlayerCommand) => void;
  /** Jump to the Adventure tab with the target's region pre-selected — powers the "hunt" action (18f). */
  onHunt?: (regionId: string) => void;
}) {
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
          const pct = Math.min(100, Math.round((kills / b.qty) * 100));
          return (
            <li key={b.id} className={done ? 'bounty done' : 'bounty'}>
              <span>
                {m.elite ? '★ ' : ''}
                {m.name} × {b.qty}
                {(() => {
                  // Where to hunt it (17x): the shallowest region the target spawns in, so the bounty is
                  // actionable without cross-checking the Bestiary. The rest (if any) ride the tooltip.
                  const regs = monsterRegions(b.monsterId);
                  if (regs.length === 0) return null;
                  return (
                    <span className="dim small bountywhere" title={regs.length > 1 ? `also in ${regs.slice(1).join(', ')}` : undefined}>
                      {' '}· {regs[0]}
                      {regs.length > 1 ? ` +${regs.length - 1}` : ''}
                    </span>
                  );
                })()}
              </span>
              <span className="dim small bountyinfo">
                {Math.min(kills, b.qty)}/{b.qty} slain · {b.rewardGp.toLocaleString('en-US')} gp (≈
                {Math.round(b.rewardGp / b.qty).toLocaleString('en-US')}/kill) · {left.toLocaleString('en-US')}t left
                <span className="bountybar" aria-hidden="true">
                  <span style={{ width: `${pct}%` }} />
                </span>
              </span>
              {done ? (
                <button className="chip" onClick={() => onCommand({ type: 'claimBounty', bountyId: b.id })}>
                  claim
                </button>
              ) : (() => {
                // Make the not-done state actionable (18f): jump to the Adventure tab with the target's
                // shallowest region pre-picked, the bounty sibling of the contract "buy {N}" (17y) and the
                // event-chip jump (15l). Falls back to the passive "hunting…" without onHunt / a placeable region.
                const where = onHunt ? huntRegionId(b.monsterId) : null;
                return where ? (
                  <button className="chip" title={`hunt ${m.name} — jump to ${monsterRegions(b.monsterId)[0]}`} onClick={() => onHunt!(where)}>
                    hunt
                  </button>
                ) : (
                  <span className="dim small">hunting…</span>
                );
              })()}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
