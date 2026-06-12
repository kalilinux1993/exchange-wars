import type { PlayerView } from '@exchange-wars/engine';
import type { Game } from '../game';
import { bidWalk, fmtCompact, returnOnStake, sessionPnL, worthBreakdown } from '../game';

/** Net-worth segments: liquid cash, gp tied up in buy offers, goods held. */
const SEGS = [
  { key: 'cash', label: 'cash', color: '#d4a937' },
  { key: 'buyOrders', label: 'in offers', color: '#2dd4bf' },
  { key: 'holdings', label: 'in goods', color: '#e07a5f' },
] as const;

/**
 * Wealth (12m): your net worth split by LIQUIDITY — cash on hand vs gp escrowed
 * in resting buy offers vs the liquidation value of goods you hold. The
 * higher-level companion to the by-item allocation bar (12k): answers "how liquid
 * am I / over-committed in offers / sitting on goods?". Expedition loot shows as
 * a separate "at risk" note — it isn't counted in worth until you bank it.
 */
export function WealthPanel({
  game,
  view,
  worth,
  sessionStartWorth,
}: {
  game: Game;
  view: PlayerView;
  worth: number;
  /** Net worth when this session began (App-owned baseline) — drives the "this session" P&L. */
  sessionStartWorth?: number;
}) {
  const b = worthBreakdown(view, worth);
  const atRisk = game.world.agents[game.playerId]?.expedition?.packGp ?? 0;
  // This-session worth change vs the load-time baseline — the short-term companion to
  // the lifetime stake result in the header (different horizons; shown apart, not merged).
  const session = sessionStartWorth !== undefined ? sessionPnL(worth, sessionStartWorth) : null;
  // Liquidation value of equipped gear — counted in your net worth since 14j, so
  // show how much of it is kit you're wearing (vs liquid goods in the satchel).
  const kit = Object.values(view.worn ?? {}).reduce((s, itemId) => s + (bidWalk(game, itemId, 1)?.gp ?? 0), 0);
  const pct = (n: number) => (b.total > 0 ? Math.round((n / b.total) * 100) : 0);
  const ret = returnOnStake(game.startGp, worth);
  return (
    <section className="panel wealth">
      <h2>
        Wealth <span className="dim small">{fmtCompact(b.total)} net</span>
        <span
          className={`stakeret ${ret.up ? 'pct up' : 'pct down'}`}
          title={`net worth vs your ${fmtCompact(game.startGp)} starting stake — your all-time trading result (excludes loot still at risk in the wild)`}
        >
          {ret.up ? '↑ +' : '↓ −'}
          {fmtCompact(Math.abs(ret.delta))} ({ret.up ? '+' : '−'}
          {Math.abs(Math.round(ret.pct * 100))}%)
        </span>
      </h2>
      {b.total > 0 ? (
        <>
          <div
            className="allocbar"
            aria-hidden="true"
            title="how your net worth splits: liquid cash, gp tied up in resting buy offers, and the liquidation value of the goods you hold"
          >
            {SEGS.map((s) => (
              <span
                key={s.key}
                className="alloc-seg"
                style={{ width: `${((b[s.key] / Math.max(1, b.total)) * 100).toFixed(2)}%`, background: s.color }}
                title={`${s.label} ${fmtCompact(b[s.key])} (${pct(b[s.key])}%)`}
              />
            ))}
          </div>
          <p className="dim small">
            {SEGS.map((s, i) => (
              <span key={s.key}>
                {i > 0 ? ' · ' : ''}
                <b style={{ color: s.color }}>{pct(b[s.key])}%</b> {s.label}
              </span>
            ))}
            {kit > 0 && (
              <span title="liquidation value of the gear you have equipped — part of your net worth (unequip & sell to free it)">
                {' · '}
                <b className="pct up">🛡 {fmtCompact(kit)}</b> equipped kit
              </span>
            )}
            {atRisk > 0 && (
              <span>
                {' · '}
                <b className="pct down">⚔ {fmtCompact(atRisk)}</b> at risk in the wild
              </span>
            )}
          </p>
          {session && session.delta !== 0 && (
            <p
              className="dim small session"
              title="change in your net worth since you opened the app this session — market drift plus your own trades. A short-term read, distinct from the all-time stake result up top."
            >
              this session{' '}
              <b className={session.up ? 'pct up' : 'pct down'}>
                {session.up ? '↑ +' : '↓ −'}
                {fmtCompact(Math.abs(session.delta))}
                {sessionStartWorth! > 0 ? ` (${session.up ? '+' : '−'}${Math.abs(Math.round(session.pct * 100))}%)` : ''}
              </b>
            </p>
          )}
        </>
      ) : (
        <p className="dim small">no wealth to speak of yet — buy low, sell high</p>
      )}
    </section>
  );
}
