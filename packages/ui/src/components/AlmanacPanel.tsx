import { levelsOf, maxHpFor, MONSTERS, REGIONS } from '@exchange-wars/engine';
import type { Game } from '../game';

const fmt = (n: number): string => n.toLocaleString('en-US');

/**
 * The Almanac: the realm's figures and yours, read straight from the stats
 * and the conservation ledger. Display only — the engine already booked
 * every one of these facts; this page just opens the book.
 */
export function AlmanacPanel({ game }: { game: Game }) {
  const st = game.world.stats;
  const l = game.world.ledger;
  const lv = levelsOf(game.world.agents[game.playerId]?.combatXp);
  const met = Object.keys(st.killsByMonster ?? {}).length;
  const itemsMinted = Object.values(l.itemsMinted).reduce((a, b) => a + b, 0);
  const itemsBurned = Object.values(l.itemsBurned).reduce((a, b) => a + b, 0);
  return (
    <section className="panel almanac">
      <h2>Almanac</h2>
      <h3>The realm</h3>
      <ul className="rows small">
        <li>
          <span>trades settled</span>
          <span className="num">{fmt(st.tradesTotal)}</span>
        </li>
        <li>
          <span>offers placed / rejected</span>
          <span className="num">
            {fmt(st.ordersPlaced)} / {fmt(st.ordersRejected)}
          </span>
        </li>
        <li>
          <span>events weathered</span>
          <span className="num">{fmt(st.eventsSpawned)}</span>
        </li>
        <li>
          <span>contracts honoured</span>
          <span className="num">{fmt(st.contractsFilled)}</span>
        </li>
        <li title="near-broke speculators quietly re-funded by the realm — it keeps the market alive">
          <span>traders bailed out</span>
          <span className="num">{fmt(st.npcBailouts)}</span>
        </li>
        <li title="every coin and item enters or leaves the world through the audited ledger">
          <span>gp minted / burned</span>
          <span className="num">
            {fmt(l.gpMinted)} / {fmt(l.gpBurned)}
          </span>
        </li>
        <li>
          <span>items minted / burned</span>
          <span className="num">
            {fmt(itemsMinted)} / {fmt(itemsBurned)}
          </span>
        </li>
      </ul>
      <h3>Your saga</h3>
      <ul className="rows small">
        <li>
          <span>levels (⚔ / 🛡 / ♥)</span>
          <span className="num">
            {lv.atk} / {lv.def} / {lv.hp} ({maxHpFor(lv.hp)} max hp)
          </span>
        </li>
        <li>
          <span>monsters slain</span>
          <span className="num">
            {fmt(st.monstersSlain ?? 0)}
            {(st.eliteSlain ?? 0) > 0 ? ` (★${st.eliteSlain})` : ''}
          </span>
        </li>
        <li>
          <span>bestiary</span>
          <span className="num">
            {met}/{MONSTERS.length} met
          </span>
        </li>
        <li>
          <span>caches pried / dice won</span>
          <span className="num">
            {fmt(st.cacheFinds ?? 0)} / {fmt(st.diceWon ?? 0)}
          </span>
        </li>
        <li>
          <span>deepest tread</span>
          <span className="num">{REGIONS[st.deepestRegion ?? 0]?.name ?? '—'}</span>
        </li>
        <li>
          <span>deaths</span>
          <span className="num">{fmt(st.deaths ?? 0)}†</span>
        </li>
        <li>
          <span>deeds done</span>
          <span className="num">{fmt(game.milestones.length)}</span>
        </li>
      </ul>
    </section>
  );
}
