import { combatLevel } from '@exchange-wars/engine';
import { diveRecords, diveStreak, fmtCompact, type Game } from '../game';

/**
 * A shareable "Run Card" — your run as a styled trophy in the game's stone-and-gold livery: combat
 * level + net worth as the hero figures, your peak achievements (best haul / survival streak / deeds)
 * as a chip row (empty ones omitted, mirroring `bragText`), and the seed + site as a footer. A
 * screenshot-able visual artifact that complements the text/native brag (the picture to its link).
 * Pure display; reuses `combatLevel`/`diveStreak`/`diveRecords`/`fmtCompact`.
 */
export function BragCard({ game, worth }: { game: Game; worth: number }) {
  const xp = game.world.agents[game.playerId]?.combatXp;
  const cmb = combatLevel(xp);
  const streak = diveStreak(game.delves);
  const records = diveRecords(game.delves);
  const chips: { label: string; value: string }[] = [];
  if (records.bestHaul) chips.push({ label: 'best haul', value: `${fmtCompact(records.bestHaul.lootGp)} gp` });
  if (streak.best > 0) chips.push({ label: 'survival', value: `${streak.best} dives` });
  if (game.milestones.length > 0) chips.push({ label: 'deeds', value: String(game.milestones.length) });
  return (
    <section className="panel runcard">
      <h2>
        Run Card <span className="dim small">— screenshot &amp; share</span>
      </h2>
      <svg className="bragcard" viewBox="0 0 480 270" role="img" aria-label="your run card">
        <defs>
          <linearGradient id="bc-sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#241d12" />
            <stop offset="100%" stopColor="#0e0a05" />
          </linearGradient>
        </defs>
        <rect x={2} y={2} width={476} height={266} rx={10} fill="url(#bc-sky)" stroke="#d4a937" strokeWidth={2} />
        <text x={240} y={42} className="bc-title" textAnchor="middle">
          ⚔ EXCHANGE WARS
        </text>
        <line x1={44} y1={58} x2={436} y2={58} stroke="#5b4a25" strokeWidth={1} />
        {/* hero figures: combat level · net worth */}
        <text x={140} y={124} className="bc-hero" textAnchor="middle">
          {cmb}
        </text>
        <text x={140} y={146} className="bc-herolabel" textAnchor="middle">
          combat level
        </text>
        <text x={340} y={124} className="bc-hero gold" textAnchor="middle">
          {fmtCompact(worth)}
        </text>
        <text x={340} y={146} className="bc-herolabel" textAnchor="middle">
          net worth (gp)
        </text>
        {/* secondary achievement chips (centred row, empty ones omitted) */}
        {chips.map((c, i) => {
          const x = 240 + (i - (chips.length - 1) / 2) * 130;
          return (
            <g key={c.label}>
              <text x={x} y={196} className="bc-chipval" textAnchor="middle">
                {c.value}
              </text>
              <text x={x} y={214} className="bc-chiplabel" textAnchor="middle">
                {c.label}
              </text>
            </g>
          );
        })}
        <text x={240} y={252} className="bc-foot" textAnchor="middle">
          seed {game.world.seed} · kalilinux1993.github.io/exchange-wars
        </text>
      </svg>
    </section>
  );
}
