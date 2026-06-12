import type { SimStats } from '@exchange-wars/engine';
import { MONSTERS, REGIONS, regionIndex } from '@exchange-wars/engine';
import type { Game } from '../game';
import { diveRecords, fmtCompact } from '../game';

export interface RecordRow {
  label: string;
  value: string;
  /** Exact value for the tooltip when `value` is compacted. */
  title?: string;
}

/**
 * The player's lifetime adventuring record, derived from world stats. Pure so
 * it's testable without a render. The trading side is already heavily surfaced
 * (net/rate/chart/leaderboard); this consolidates the RPG accomplishments that
 * were unsurfaced or scattered across the expedition tally. Sellsword rows only
 * appear once the hireling has actually done something.
 */
export function recordRows(st: SimStats): RecordRow[] {
  const n = (v: number | undefined): string => (v ?? 0).toLocaleString('en-US');
  const met = Object.keys(st.killsByMonster ?? {}).length;
  const rows: RecordRow[] = [
    { label: 'Monsters slain', value: n(st.monstersSlain) },
    { label: 'Named elites felled', value: n(st.eliteSlain) },
    { label: 'Bounties claimed', value: n(st.bountiesClaimed) },
    { label: 'Bestiary met', value: `${met}/${MONSTERS.length}` },
    { label: 'Deepest region', value: REGIONS[st.deepestRegion ?? 0]?.name ?? '—' },
    { label: 'Caches pried open', value: n(st.cacheFinds) },
    { label: 'Dice games won', value: n(st.diceWon) },
    { label: 'Contracts filled', value: n(st.contractsFilled) },
    { label: 'Deaths', value: n(st.deaths) },
  ];
  const ssKills = st.sellswordKills ?? 0;
  const ssBanked = st.sellswordBanked ?? 0;
  if (ssKills > 0 || ssBanked > 0) {
    rows.push({ label: 'Sellsword kills', value: ssKills.toLocaleString('en-US') });
    rows.push({
      label: 'Sellsword gp banked',
      value: fmtCompact(ssBanked),
      title: `${ssBanked.toLocaleString('en-US')} gp`,
    });
  }
  return rows;
}

export function RecordsPanel({ game }: { game: Game }) {
  const rows = recordRows(game.world.stats);
  const peak = diveRecords(game.delves);
  const regionName = (id: string): string => REGIONS[regionIndex(id)]?.name ?? id;
  if (peak.bestHaul) {
    rows.push({
      label: 'Best single haul',
      value: `${fmtCompact(peak.bestHaul.lootGp)} (${regionName(peak.bestHaul.regionId)})`,
      title: `${peak.bestHaul.lootGp.toLocaleString('en-US')} gp banked from one dive in ${regionName(peak.bestHaul.regionId)}`,
    });
  }
  if (peak.mostKills) {
    rows.push({
      label: 'Most cleared in a dive',
      value: `${peak.mostKills.kills.toLocaleString('en-US')} (${regionName(peak.mostKills.regionId)})`,
    });
  }
  return (
    <section className="panel records">
      <h2>Adventurer's Record</h2>
      <ul className="rows small">
        {rows.map((r) => (
          <li key={r.label}>
            <span className="dim">{r.label}</span>
            <span className="num" title={r.title}>
              {r.value}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
