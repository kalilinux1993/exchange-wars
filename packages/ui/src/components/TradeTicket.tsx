import { GE_TAX_RATE, MONSTERS, REGIONS } from '@exchange-wars/engine';
import type { CommandResult, ItemDef, ItemId, PlayerCommand, PlayerView, Side } from '@exchange-wars/engine';
import { useEffect, useRef, useState } from 'react';
import { Sparkline } from './Sparkline';
import { BandMeter } from './BandMeter';
import { askWalk, bidWalk, blendBuy, breakEvenSell, buyConcentration, gearDelta, itemSources, priceSwing, valueBand, type Game } from '../game';

/**
 * Split the resting book into bid/ask proportions for the liquidity bar —
 * bidDepth is your exit (what the resting bids will absorb), askDepth is your
 * entry (what's there to lift). null when the book is empty. Pure.
 */
export function depthSplit(bidDepth: number, askDepth: number): { bidPct: number; askPct: number } | null {
  const total = bidDepth + askDepth;
  if (total <= 0) return null;
  const bidPct = Math.round((bidDepth / total) * 100);
  return { bidPct, askPct: 100 - bidPct };
}

export interface TicketPrefill {
  side: Side;
  price: number;
  n: number; // nonce — repeat clicks on the same level still apply
}

export function TradeTicket({
  game,
  view,
  selected,
  items,
  lvls,
  prefill,
  onCommand,
  lastResult,
  eventNote,
  recentPrices,
  position,
  watched,
  onToggleWatch,
  onHunt,
  active = true,
}: {
  /** The world, for display reads only (ask-depth walk on the buy preview); mutations go through onCommand.
   * Optional — omitted in isolated render tests, in which case the buy fill-preview line just doesn't show. */
  game?: Game;
  view: PlayerView;
  selected: ItemId;
  items: ItemDef[];
  /** Player combat levels — gates the "needs Atk N" note on a gear buy. Omitted
   * in isolated render tests; the upgrade delta still shows without it. */
  lvls?: { atk: number; def: number };
  prefill: TicketPrefill | null;
  onCommand: (cmd: PlayerCommand) => void;
  /** The last command's result, tagged with the command so a resting place is distinguishable from a
   * non-place command's empty-trades result (18h). */
  lastResult: { result: CommandResult; cmd: PlayerCommand } | null;
  /** Active-event line for the selected item (formatted by App), or null. */
  eventNote: string | null;
  /** Recent trade prices for the selected item (oldest→newest), for the sparkline. */
  recentPrices: number[];
  /** Your open bought position (units + avg cost) in this item, or null. */
  position: { units: number; avgCost: number } | null;
  watched: boolean;
  onToggleWatch: () => void;
  /** Jump to the Adventure tab with a region pre-selected — powers the farm line's "hunt" action (18m). */
  onHunt?: (regionId: string) => void;
  /** Whether the Exchange tab is the visible room — gates the b/s side hotkeys. */
  active?: boolean;
}) {
  const [side, setSide] = useState<Side>('buy');
  const [price, setPrice] = useState('');
  const [qty, setQty] = useState('1');
  const appliedPrefill = useRef(0);
  useEffect(() => {
    if (prefill && prefill.n !== appliedPrefill.current) {
      appliedPrefill.current = prefill.n;
      setSide(prefill.side);
      setPrice(String(prefill.price));
    }
  }, [prefill]);
  // Keyboard: b / s pick the side (pairs with the market's j/k row nav, 12g).
  // Gated to the Exchange tab and ignored while typing, so the keys never fire
  // on a hidden ticket or hijack a field.
  const activeRef = useRef(active);
  activeRef.current = active;
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (!activeRef.current || e.ctrlKey || e.metaKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      if (t && (['INPUT', 'SELECT', 'TEXTAREA', 'BUTTON'].includes(t.tagName) || t.isContentEditable)) return;
      if (e.key === 'b') setSide('buy');
      else if (e.key === 's') setSide('sell');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  const market = view.markets.find((m) => m.itemId === selected);
  const def = items.find((i) => i.id === selected);
  const p = Number(price);
  const q = Number(qty);
  const valid = Number.isInteger(p) && p >= 1 && Number.isInteger(q) && q >= 1;
  const total = valid ? p * q : 0;
  const proceeds = valid ? total - Math.floor(total * GE_TAX_RATE) : 0;
  // Advisory only — the engine stays the authority on rejections (and slots /
  // buy limits can still reject an offer this check can't predict).
  const held = view.inventory[selected] ?? 0;
  // Selling under this price loses money after the 2% tax (vs your average cost).
  // Tint the price field red so a loss-making sell is caught at the input, not
  // just in the readout below it.
  const sellFloor = side === 'sell' && position ? breakEvenSell(position.avgCost, GE_TAX_RATE) : null;
  const belowFloor = sellFloor !== null && valid && p < sellFloor;
  const shortGp = side === 'buy' && valid && total > view.gp;
  const shortItems = side === 'sell' && valid && q > held;

  // Fair value: where lastPrice sits in the item's own [baseCost..consumeValue]
  // band — cheap to accumulate vs rich to offload, which the spread can't say.
  const valueLabel = market ? valueBand(def, market.lastPrice) : null;

  // Suggested flip: undercut the spread one tick each way; margin nets the 2%
  // sell tax. The flipper's core sum, surfaced — green if a flip clears profit.
  const ema = Math.round(market?.ema ?? 0);
  const flipBuy = market?.bestBid != null ? market.bestBid + 1 : ema;
  const flipSell = market?.bestAsk != null ? market.bestAsk - 1 : ema;
  const flipMargin = flipSell > 0 && flipBuy > 0 ? flipSell - flipBuy - Math.floor(flipSell * GE_TAX_RATE) : 0;
  const loadSide = (s: Side, price: number): void => {
    setSide(s);
    setPrice(String(Math.max(1, price)));
  };

  const useMarketPrice = (): void => {
    if (!market) return;
    const ref =
      side === 'buy'
        ? market.bestBid !== null
          ? market.bestBid + 1
          : Math.round(market.ema)
        : market.bestAsk !== null
          ? market.bestAsk - 1
          : Math.round(market.ema);
    setPrice(String(Math.max(1, ref)));
  };

  return (
    <section className="panel ticket">
      <h2>
        Offer · {selected.replace(/_/g, ' ')}
        <button
          className="watchstar"
          aria-pressed={watched}
          title={watched ? 'unstar — stop watching' : 'star — add to watchlist'}
          onClick={onToggleWatch}
        >
          {watched ? '★' : '☆'}
        </button>
      </h2>
      {def?.wikiPrice !== undefined && (
        <p className="dim small">
          wiki snapshot {def.wikiPrice.toLocaleString('en-US')} gp
          {market?.buyRemaining !== null && market?.buyRemaining !== undefined
            ? ` · buy limit left ${market.buyRemaining.toLocaleString('en-US')}`
            : ''}
          {' · '}
          {def.volatility >= 0.13
            ? 'exotic — human-only'
            : def.volatility >= 0.12
              ? 'big staple — senior clerks'
              : 'staple — all clerks'}
        </p>
      )}
      {(() => {
        // Cross-economy context: this item is also a monster drop — you can FARM it
        // on a dive instead of buying it. Shown only for drop-items (most staples
        // have no source), near the item context rather than among the trade math.
        const sources = itemSources(selected, MONSTERS, REGIONS);
        if (sources.length === 0) return null;
        const top = sources[0]!;
        return (
          <p className="dim small huntable" title="this item is a monster drop — you can farm it on a dive instead of buying it (best source shown)">
            🗡 farm: <b>{top.monsterName}</b> {Math.round(top.chance * 100)}%
            {top.regionName && <span className="dim"> · {top.regionName}</span>}
            {sources.length > 1 && <span className="dim"> +{sources.length - 1} more</span>}
            {onHunt && top.regionId && (
              // Make the farm hint actionable: jump to the Adventure tab with that region pre-picked —
              // "farm it instead of buying it" (18m, the trade→farm sibling of the bounty hunt 18f).
              <button className="chip" title={`hunt ${top.monsterName}${top.regionName ? ` in ${top.regionName}` : ''} — farm it instead of buying`} onClick={() => onHunt(top.regionId!)}>
                {' '}hunt
              </button>
            )}
          </p>
        );
      })()}
      {eventNote && <p className="warn small">{eventNote}</p>}
      <Sparkline prices={recentPrices} />
      {(() => {
        const sw = priceSwing(recentPrices);
        if (!sw) return null;
        const pct = Math.round(sw.swingPct * 100);
        const tag = sw.read === 'steady' ? '🟢 steady' : sw.read === 'choppy' ? '🟡 choppy' : '🔴 wild';
        return (
          <p
            className="dim small swing"
            title="how much this item's traded price has actually swung over the recent trades the chart shows — the live counterpart to its volatility tier. A wild swing means the spread can vanish before both legs of your flip fill."
          >
            recent {sw.lo.toLocaleString('en-US')}–{sw.hi.toLocaleString('en-US')} ·{' '}
            <b className={sw.read === 'wild' ? 'down' : sw.read === 'steady' ? 'up' : undefined}>
              swing {pct}% · {tag}
            </b>
          </p>
        );
      })()}
      {flipBuy > 0 && flipSell > 0 && (
        <p className="dim small flipline" title="undercut the spread one tick each way; margin is per unit after the 2% sell tax">
          flip:{' '}
          <button className="chip" onClick={() => loadSide('buy', flipBuy)} title="load this buy price">
            buy {flipBuy.toLocaleString('en-US')}
          </button>{' '}
          <button className="chip" onClick={() => loadSide('sell', flipSell)} title="load this sell price">
            sell {flipSell.toLocaleString('en-US')}
          </button>{' '}
          <span className={flipMargin > 0 ? 'pct up' : 'pct down'}>
            {flipMargin >= 0 ? '+' : ''}
            {flipMargin.toLocaleString('en-US')}/ea
          </span>
          {valueLabel && (
            <span
              className={`valueband ${valueLabel}`}
              title="where the price sits in this item's cost→value band: cheap = good to accumulate, rich = good to offload"
            >
              {' '}· {valueLabel === 'cheap' ? '🟢 cheap' : valueLabel === 'rich' ? '🟡 rich' : '⚪ fair'}
            </span>
          )}
        </p>
      )}
      {market && <BandMeter def={def} lastPrice={market.lastPrice} />}
      {market &&
        (() => {
          const d = depthSplit(market.bidDepth, market.askDepth);
          if (!d) return null;
          return (
            <div
              className="depth"
              title="resting liquidity — bids are your exit (what you can sell into right now), asks are your entry (what's there to buy)"
            >
              <span className="dim small">
                book: <b className="up">{market.bidDepth.toLocaleString('en-US')} bid</b> ·{' '}
                <b className="down">{market.askDepth.toLocaleString('en-US')} ask</b>
              </span>
              <div className="depthbar" aria-hidden="true">
                <span className="dseg bid" style={{ width: `${d.bidPct}%` }} />
                <span className="dseg ask" style={{ width: `${d.askPct}%` }} />
              </div>
            </div>
          );
        })()}
      {position &&
        (() => {
          const cur = market?.lastPrice ?? 0;
          const pct = position.avgCost > 0 && cur > 0 ? (cur - position.avgCost) / position.avgCost : 0;
          return (
            <p
              className="dim small position"
              title="your average cost for the units you bought and still hold — green = unrealized profit at the current price, before the sell tax"
            >
              position: <b>{position.units.toLocaleString('en-US')}</b> @ avg{' '}
              {position.avgCost.toLocaleString('en-US')}
              {cur > 0 && (
                <span className={pct >= 0 ? 'pct up' : 'pct down'}>
                  {' '}· {pct >= 0 ? '+' : ''}
                  {(pct * 100).toFixed(1)}% now
                </span>
              )}
              {market && (
                <button
                  className="chip"
                  title="load a sell order for your whole position, undercutting the ask one tick"
                  onClick={() => {
                    setSide('sell');
                    setPrice(String(Math.max(1, (market.bestAsk ?? market.lastPrice) - 1)));
                    setQty(String(position.units));
                  }}
                >
                  {' '}
                  sell {position.units.toLocaleString('en-US')}
                </button>
              )}
            </p>
          );
        })()}
      <div className="sides" title="pick a side — or press b / s on the keyboard">
        <button className={side === 'buy' ? 'side buy active' : 'side buy'} onClick={() => setSide('buy')}>
          buy
        </button>
        <button className={side === 'sell' ? 'side sell active' : 'side sell'} onClick={() => setSide('sell')}>
          sell
        </button>
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (valid) onCommand({ type: 'place', itemId: selected, side, price: p, qty: q });
        }}
      >
        <div className="fields">
          <label>
            price
            <input
              className={belowFloor ? 'belowbe' : undefined}
              title={belowFloor ? 'below your break-even — this sell loses money after the 2% tax' : undefined}
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              inputMode="numeric"
              placeholder={market ? String(market.lastPrice) : ''}
            />
          </label>
          <button type="button" className="chip" onClick={useMarketPrice}>
            {side === 'buy' ? 'bid+1' : 'ask−1'}
          </button>
          <label>
            qty
            <input value={qty} onChange={(e) => setQty(e.target.value)} inputMode="numeric" />
          </label>
          <button
            type="button"
            className="chip"
            title={side === 'buy' ? 'max affordable (limit-aware)' : 'all held'}
            onClick={() => {
              if (side === 'sell') {
                setQty(String(view.inventory[selected] ?? 0));
                return;
              }
              if (!Number.isInteger(p) || p < 1) return;
              const afford = Math.floor(view.gp / p);
              const limit = market?.buyRemaining ?? null;
              setQty(String(limit === null ? afford : Math.min(afford, limit)));
            }}
          >
            max
          </button>
        </div>
        <p className="sums">
          {side === 'buy' ? (
            <>
              cost <b>{total.toLocaleString('en-US')}</b> gp
            </>
          ) : (
            <>
              after 2% tax <b>{proceeds.toLocaleString('en-US')}</b> gp
            </>
          )}
          {shortGp && <span className="warn"> · exceeds your {view.gp.toLocaleString('en-US')} gp</span>}
          {shortItems && <span className="warn"> · you hold only {held.toLocaleString('en-US')}</span>}
        </p>
        {side === 'buy' &&
          valid &&
          game &&
          (() => {
            // What CROSSES the spread right now: a limit buy fills at the resting ask's price (≤ your
            // limit), so the real immediate cost is below the `cost` ceiling and only part may fill.
            const w = askWalk(game, selected, q, p);
            if (!w) return null;
            return (
              <p
                className="dim small fillpreview"
                title="how much of this buy crosses the spread RIGHT NOW — limit buys fill at the resting seller's price (≤ your limit), so you pay less than the escrow ceiling; the rest rests at your price. Buys are untaxed."
              >
                fills ≈<b>{w.qty.toLocaleString('en-US')}</b> now · ≈{w.gp.toLocaleString('en-US')} gp (avg{' '}
                {Math.round(w.gp / w.qty).toLocaleString('en-US')})
                {q > w.qty && <span className="dim"> · {(q - w.qty).toLocaleString('en-US')} rests at {p.toLocaleString('en-US')}</span>}
              </p>
            );
          })()}
        {side === 'sell' &&
          valid &&
          game &&
          (() => {
            // What CROSSES now: a limit sell fills against bids ≥ your price, at the resting BUYER's
            // (higher) price — so you net MORE than the "after tax" figure (which uses your limit), and
            // the rest rests. Net is after the 2% tax (bidWalk applies it per fill). Floor the walk at p.
            const w = bidWalk(game, selected, q, p);
            if (!w) return null;
            return (
              <p
                className="dim small fillpreview"
                title="how much of this sell crosses the spread RIGHT NOW — limit sells fill at the resting buyer's price (≥ your limit), so you net more than the 'after tax' figure; the rest rests at your price. Net is after the 2% tax."
              >
                fills ≈<b>{w.qty.toLocaleString('en-US')}</b> now · ≈{w.net.toLocaleString('en-US')} net (avg{' '}
                {Math.round(w.net / w.qty).toLocaleString('en-US')})
                {q > w.qty && <span className="dim"> · {(q - w.qty).toLocaleString('en-US')} rests at {p.toLocaleString('en-US')}</span>}
              </p>
            );
          })()}
        {side === 'buy' &&
          valid &&
          (() => {
            const blend = blendBuy(position, q, p);
            if (!blend) return null;
            const word = blend.delta < 0 ? '↓ averaging down' : blend.delta > 0 ? '↑ averaging up' : '· avg unchanged';
            return (
              <p
                className="dim small blend"
                title="how this buy reshapes the position you already hold — its new quantity-weighted average cost (buys are untaxed)"
              >
                after this buy: <b>{blend.units.toLocaleString('en-US')}</b> @ avg{' '}
                {blend.avgCost.toLocaleString('en-US')}{' '}
                <span className="dim">(was {blend.prevAvg.toLocaleString('en-US')})</span>{' '}
                <span className={blend.delta < 0 ? 'pct up' : 'dim'}>{word}</span>
              </p>
            );
          })()}
        {side === 'buy' &&
          valid &&
          (() => {
            // Concentration preview: how much of your liquid holdings this buy puts
            // in one item — the risk lens at the decision point (PositionsPanel shows
            // it only after the fill). Same thresholds as the allocation bar.
            const conc = buyConcentration(view, selected, total);
            if (!conc) return null;
            const pct = Math.round(conc.pct * 100);
            const cls = conc.pct > 0.5 ? 'pct down' : conc.pct >= 0.34 ? 'dim' : 'pct up';
            const name = def?.name ?? selected.replace(/_/g, ' ');
            return (
              <p
                className="dim small concentration"
                title="how much of your liquid holdings (cash + goods at last price) would sit in this one item if the buy fills — over half in a single item is concentration risk"
              >
                after fill:{' '}
                <b className={cls}>
                  {name} ≈ {pct}% of holdings
                </b>
                {conc.pct > 0.5 && <span className="warn"> · ⚠ concentrated</span>}
              </p>
            );
          })()}
        {side === 'buy' &&
          (() => {
            // Is this purchase a gear UPGRADE? Show it before you commit — the
            // governing-stat change vs what you currently wear (same math as the
            // satchel badge). lvls absent (isolated tests) → skip the req note.
            const gd = gearDelta(selected, view.worn, lvls ?? { atk: 99, def: 99 });
            if (!gd) return null;
            const sk = gd.skill === 'atk' ? 'Attack' : 'Defence';
            const glyph = gd.skill === 'atk' ? '⚔' : '🛡';
            const vsName = gd.vs ? items.find((i) => i.id === gd.vs)?.name ?? gd.vs : null;
            const cls = gd.delta > 0 ? 'pct up' : gd.delta < 0 ? 'pct down' : 'dim';
            return (
              <p
                className="dim small geardelta"
                title={`equipping this ${vsName ? `over your ${vsName}` : '(an empty slot)'} ${
                  gd.delta >= 0 ? 'gains' : 'loses'
                } ${Math.abs(gd.delta)} ${sk}; it needs ${sk} ${gd.req} to wear`}
              >
                equips as{' '}
                <span className={cls}>
                  {glyph}
                  {gd.delta > 0 ? '+' : ''}
                  {gd.delta} {sk}
                </span>{' '}
                <span className="dim">{vsName ? `vs your ${vsName}` : '(slot empty)'}</span>
                {lvls && !gd.usable && <span className="warn"> · needs {sk} {gd.req}</span>}
              </p>
            );
          })()}
        {side === 'sell' &&
          position &&
          (() => {
            const floor = breakEvenSell(position.avgCost, GE_TAX_RATE);
            const below = valid && p < floor;
            return (
              <p
                className="dim small breakeven"
                title="the lowest price that recovers your average cost after the 2% sell tax — sell under this and the tax turns the trade into a loss"
              >
                break-even ≥ <b>{floor.toLocaleString('en-US')}</b>/unit{' '}
                <span className="dim">(avg {position.avgCost.toLocaleString('en-US')} + 2% tax)</span>
                {below && <span className="warn"> · below break-even</span>}
              </p>
            );
          })()}
        <button type="submit" className={`submit ${side}`} disabled={!valid}>
          place {side} offer
        </button>
      </form>
      {lastResult && !lastResult.result.ok && <p className="reject">rejected: {lastResult.result.reason}</p>}
      {lastResult && lastResult.result.ok && lastResult.result.trades.length > 0 && (
        <p className="filled">filled {lastResult.result.trades.reduce((a, t) => a + t.qty, 0)} instantly</p>
      )}
      {lastResult && lastResult.result.ok && lastResult.result.trades.length === 0 && lastResult.cmd.type === 'place' && (
        // The third outcome: the offer succeeded but didn't cross — it's resting on the book now (18h).
        <p className="resting">✓ placed — resting on the book</p>
      )}
      <p className="dim small">
        {view.openOrders.length}/{view.slots} offer slots used
      </p>
    </section>
  );
}
