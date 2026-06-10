import { GE_TAX_RATE } from '@exchange-wars/engine';
import type { CommandResult, ItemDef, ItemId, PlayerCommand, PlayerView, Side } from '@exchange-wars/engine';
import { useEffect, useRef, useState } from 'react';

export interface TicketPrefill {
  side: Side;
  price: number;
  n: number; // nonce — repeat clicks on the same level still apply
}

export function TradeTicket({
  view,
  selected,
  items,
  prefill,
  onCommand,
  lastResult,
}: {
  view: PlayerView;
  selected: ItemId;
  items: ItemDef[];
  prefill: TicketPrefill | null;
  onCommand: (cmd: PlayerCommand) => void;
  lastResult: CommandResult | null;
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
  const market = view.markets.find((m) => m.itemId === selected);
  const def = items.find((i) => i.id === selected);
  const p = Number(price);
  const q = Number(qty);
  const valid = Number.isInteger(p) && p >= 1 && Number.isInteger(q) && q >= 1;
  const total = valid ? p * q : 0;
  const proceeds = valid ? total - Math.floor(total * GE_TAX_RATE) : 0;

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
      <h2>Offer · {selected.replace(/_/g, ' ')}</h2>
      {def?.wikiPrice !== undefined && (
        <p className="dim small">
          wiki snapshot {def.wikiPrice.toLocaleString('en-US')} gp
          {market?.buyRemaining !== null && market?.buyRemaining !== undefined
            ? ` · buy limit left ${market.buyRemaining.toLocaleString('en-US')}`
            : ''}
        </p>
      )}
      <div className="sides">
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
        </p>
        <button type="submit" className={`submit ${side}`} disabled={!valid}>
          place {side} offer
        </button>
      </form>
      {lastResult && !lastResult.ok && <p className="reject">rejected: {lastResult.reason}</p>}
      {lastResult && lastResult.ok && lastResult.trades.length > 0 && (
        <p className="filled">filled {lastResult.trades.reduce((a, t) => a + t.qty, 0)} instantly</p>
      )}
      <p className="dim small">
        {view.openOrders.length}/{view.slots} offer slots used
      </p>
    </section>
  );
}
