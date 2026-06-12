import type { ItemDef, PlayerCommand, PlayerView } from '@exchange-wars/engine';
import { useState } from 'react';
import type { Game } from '../game';
import { fmtCompact, heldPositions, positionConcentration, underwaterSummary, valueBand } from '../game';
import { ItemIcon } from './Icon';

/** Distinguishable, theme-fitting segment colours for the allocation bar. */
const ALLOC_COLORS = ['#d4a937', '#2dd4bf', '#e07a5f', '#81b29a', '#9a8cff', '#f2cc8f'];

/**
 * Open Positions (12c): every item you currently HOLD, marked at last price —
 * avg cost → now → paper P&L %. The ticket only ever showed cost basis for the
 * one selected item; this is the whole satchel at a glance, so "which position
 * is underwater / ripe to take profit" is one look, not N clicks. The unrealized
 * sibling of ProfitPanel's realized rows. Click a row to load it in the ticket.
 */
export function PositionsPanel({
  game,
  view,
  items,
  onSelect,
  onCommand,
  limit = 8,
}: {
  game: Game;
  view: PlayerView;
  items: ItemDef[];
  onSelect: (id: string) => void;
  /** When provided, underwater rows get a two-tap "cut" that market-sells the position. */
  onCommand?: (cmd: PlayerCommand) => void;
  limit?: number;
}) {
  const names = new Map(items.map((i) => [i.id, i.name]));
  const wikiOf = new Map(items.map((i) => [i.id, i.wikiId]));
  const defOf = new Map(items.map((i) => [i.id, i]));
  const priceOf = new Map(view.markets.map((m) => [m.itemId, m.lastPrice]));
  const bidOf = new Map(view.markets.map((m) => [m.itemId, m.bestBid]));
  // Which loser is armed for a cut — a tap arms, a second confirms (no accidental loss-lock).
  const [armed, setArmed] = useState<string | null>(null);
  const positions = heldPositions(game.tradeBook, (id) => priceOf.get(id) ?? 0);
  const shown = positions.slice(0, limit);
  const totalValue = positions.reduce((s, p) => s + p.value, 0);
  const totalPaper = positions.reduce((s, p) => s + p.unrealized, 0);
  const conc = positionConcentration(positions);
  const under = underwaterSummary(positions);
  const topName = conc.weights[0] ? (names.get(conc.weights[0].itemId) ?? conc.weights[0].itemId) : '';
  // >50% of your value in one item = concentrated (red); <34% = well spread (green).
  const riskClass = conc.topPct > 0.5 ? 'pct down' : conc.topPct >= 0.34 ? 'dim' : 'pct up';
  const pct = (n: number) => `${n >= 0 ? '+' : ''}${(n * 100).toFixed(1)}%`;
  return (
    <section className="panel positions">
      <h2>
        Open Positions{' '}
        {positions.length > 0 && (
          <span className="dim small" title="value = held units marked at last price; paper = unrealized P&L vs your average cost">
            {' '}
            value {fmtCompact(totalValue)} · paper{' '}
            <b className={totalPaper >= 0 ? 'pct up' : 'pct down'}>
              {totalPaper >= 0 ? '+' : ''}
              {fmtCompact(totalPaper)}
            </b>
          </span>
        )}
      </h2>
      {positions.length === 0 ? (
        <p className="dim small">no open positions — buy an item to open one (its cost basis shows up here)</p>
      ) : (
        <>
          <div className="allocbar" aria-hidden="true" title="how your held value splits across positions — one fat segment means you're concentrated in a single item">
            {conc.weights.map((w, i) => (
              <span
                key={w.itemId}
                className="alloc-seg"
                style={{ width: `${(w.pct * 100).toFixed(2)}%`, background: ALLOC_COLORS[i % ALLOC_COLORS.length] }}
                title={`${names.get(w.itemId) ?? w.itemId} ${(w.pct * 100).toFixed(0)}%`}
              />
            ))}
          </div>
          <p className="dim small" title="your single biggest exposure — a high share is concentration risk; spread across more items to reduce it">
            {conc.count} position{conc.count === 1 ? '' : 's'} · top <b className={riskClass}>{topName} {pct(conc.topPct).replace('+', '')}</b>
          </p>
          {under.count > 0 && (
            <p
              className="dim small"
              title={`positions trading below your average cost — paper losses you'd realise if you sold now${
                under.worst ? `; worst is ${names.get(under.worst.itemId) ?? under.worst.itemId}` : ''
              }`}
            >
              <b className="pct down">
                ⚠ {under.count} underwater {fmtCompact(under.paperLoss)} paper
              </b>
            </p>
          )}
          <ul className="rows small">
          {shown.map((p) => (
            <li
              key={p.itemId}
              className={`mover${p.marked && p.unrealized < 0 ? ' underwater' : ''}`}
              onClick={() => onSelect(p.itemId)}
              title={`${p.units.toLocaleString('en-US')} held · avg ${p.avgCost.toLocaleString('en-US')} → ${
                p.marked ? p.mark.toLocaleString('en-US') : 'no live price'
              } — load in the ticket`}
            >
              <span>
                <ItemIcon id={p.itemId} wikiId={wikiOf.get(p.itemId)} size={14} className="itemicon" /> {names.get(p.itemId) ?? p.itemId}
              </span>
              <span className="dim small">×{p.units.toLocaleString('en-US')}</span>
              <span className="dim small">
                {fmtCompact(p.avgCost)}→{p.marked ? fmtCompact(p.mark) : '·'}
                {p.marked &&
                  (() => {
                    const band = valueBand(defOf.get(p.itemId), p.mark);
                    if (!band) return null;
                    return (
                      <span
                        className="bandtag"
                        title={
                          band === 'rich'
                            ? 'near its cost→value ceiling — ripe to offload'
                            : band === 'cheap'
                              ? 'near its floor — room to run before fair value'
                              : 'mid-band'
                        }
                      >
                        {' '}
                        {band === 'cheap' ? '🟢' : band === 'rich' ? '🟡' : '⚪'}
                      </span>
                    );
                  })()}
              </span>
              <span className={p.unrealized >= 0 ? 'pct up' : 'pct down'}>
                {p.unrealized >= 0 ? '+' : ''}
                {fmtCompact(p.unrealized)}
                {p.marked && p.cost > 0 && <span className="dim small"> {pct(p.unrealizedPct)}</span>}
              </span>
              {onCommand && p.marked && p.unrealized < 0 && (
                armed === p.itemId ? (
                  <button
                    className="chip cut armed"
                    title={`sell all ${p.units.toLocaleString('en-US')} at ${(bidOf.get(p.itemId) ?? p.mark).toLocaleString('en-US')} now — books the loss`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onCommand({ type: 'place', itemId: p.itemId, side: 'sell', price: bidOf.get(p.itemId) ?? p.mark, qty: p.units });
                      setArmed(null);
                    }}
                  >
                    confirm ✓
                  </button>
                ) : (
                  <button
                    className="chip cut"
                    title="cut this loser — sell the whole position at the best bid (tap again to confirm)"
                    onClick={(e) => {
                      e.stopPropagation();
                      setArmed(p.itemId);
                    }}
                  >
                    ✂ cut
                  </button>
                )
              )}
            </li>
          ))}
          {positions.length > shown.length && (
            <li className="dim small">+{positions.length - shown.length} more held…</li>
          )}
          </ul>
        </>
      )}
    </section>
  );
}
