import { GE_TAX_RATE } from '@exchange-wars/engine';
import type { ItemDef, Trade } from '@exchange-wars/engine';
import { useEffect, useRef, useState } from 'react';
import { recentFlips, type Fill } from '../game';
import { ItemIcon } from './Icon';

/** Content key — unique in practice: recordFills dedupes identical fills. */
function fillKey(f: Fill): string {
  return `${f.tick}-${f.itemId}-${f.side}-${f.price}-${f.qty}`;
}

export function TradeFeed({
  trades,
  fills,
  items,
  playerId,
}: {
  trades: Trade[];
  fills: Fill[];
  items: ItemDef[];
  playerId: number;
}) {
  const [mode, setMode] = useState<'tape' | 'mine' | 'flips'>('tape');
  const names = new Map(items.map((i) => [i.id, i.name]));
  const wikiOf = new Map(items.map((i) => [i.id, i.wikiId]));

  // Glow the panel once whenever a NEW personal fill lands (works on either
  // tab). Lazy ref init: loading a save with old fills must not glow.
  const maxFillTick = fills.length > 0 ? fills[fills.length - 1]!.tick : -1;
  const prevMaxRef = useRef<number | null>(null);
  if (prevMaxRef.current === null) prevMaxRef.current = maxFillTick;
  const [glow, setGlow] = useState(false);
  useEffect(() => {
    if (maxFillTick > prevMaxRef.current!) {
      prevMaxRef.current = maxFillTick;
      setGlow(true);
      const t = setTimeout(() => setGlow(false), 1300);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [maxFillTick]);

  return (
    <section className={glow ? 'panel feed feed-flash' : 'panel feed'}>
      <h2>
        Tape{' '}
        <button className={mode === 'tape' ? 'chip active' : 'chip'} onClick={() => setMode('tape')}>
          tape
        </button>{' '}
        <button className={mode === 'mine' ? 'chip active' : 'chip'} onClick={() => setMode('mine')}>
          mine
        </button>{' '}
        <button className={mode === 'flips' ? 'chip active' : 'chip'} onClick={() => setMode('flips')} title="your recent completed round-trips, with net profit after tax">
          flips
        </button>
      </h2>
      {mode === 'tape' ? (
        <ul className="rows small">
          {trades
            .slice(-12)
            .reverse()
            .map((t, i) => {
              const mine = t.buyerId === playerId || t.sellerId === playerId;
              return (
                <li key={`${t.tick}-${i}`} className={mine ? 'mine-row' : ''}>
                  <span className="dim num">t{t.tick.toLocaleString('en-US')}</span>
                  <span>
                    <ItemIcon id={t.itemId} wikiId={wikiOf.get(t.itemId)} size={14} className="itemicon" /> {names.get(t.itemId) ?? t.itemId}
                  </span>
                  <span className="num">
                    {t.qty} @ {t.price.toLocaleString('en-US')}
                  </span>
                  {mine && <span className="mine">◆</span>}
                </li>
              );
            })}
          {trades.length === 0 && <li className="dim">no trades yet — press play</li>}
        </ul>
      ) : mode === 'mine' ? (
        // mine-list: stable keys mean a row's mount == a new fill, so the CSS
        // mount animation flashes each fill exactly once (rerenders reuse DOM).
        <ul className="rows small mine-list">
          {[...fills].reverse().map((f) => (
            <li key={fillKey(f)}>
              <span className="dim num">t{f.tick.toLocaleString('en-US')}</span>
              <span className={`badge ${f.side}`}>{f.side}</span>
              <span>
                <ItemIcon id={f.itemId} wikiId={wikiOf.get(f.itemId)} size={14} className="itemicon" /> {names.get(f.itemId) ?? f.itemId}
              </span>
              <span className="num">
                {f.qty} @ {f.price.toLocaleString('en-US')}
              </span>
            </li>
          ))}
          {fills.length === 0 && <li className="dim">no fills yet — your trades will land here</li>}
          {fills.length > 0 && (
            <li>
              <span className="dim">last {fills.length} fills</span>
              <span className="num">
                bought{' '}
                {fills
                  .filter((f) => f.side === 'buy')
                  .reduce((a, f) => a + f.qty * f.price, 0)
                  .toLocaleString('en-US')}{' '}
                · sold{' '}
                {fills
                  .filter((f) => f.side === 'sell')
                  .reduce((a, f) => a + f.qty * f.price, 0)
                  .toLocaleString('en-US')}{' '}
                gp
              </span>
            </li>
          )}
        </ul>
      ) : (
        // flips: the same fills, FIFO-matched into completed round-trips so you
        // can see which of your recent trades actually profited (after tax).
        <ul className="rows small">
          {recentFlips(fills, GE_TAX_RATE).map((fl) => (
            <li key={`${fl.tick}-${fl.itemId}-${fl.sellPrice}`}>
              <span className="dim num">t{fl.tick.toLocaleString('en-US')}</span>
              <span>
                <ItemIcon id={fl.itemId} wikiId={wikiOf.get(fl.itemId)} size={14} className="itemicon" /> {names.get(fl.itemId) ?? fl.itemId}
              </span>
              <span className="num dim">
                ×{fl.qty} {fl.buyAvg.toLocaleString('en-US')}→{fl.sellPrice.toLocaleString('en-US')}
              </span>
              <span className={fl.profit >= 0 ? 'pct up' : 'pct down'}>
                {fl.profit >= 0 ? '+' : ''}
                {fl.profit.toLocaleString('en-US')}
              </span>
            </li>
          ))}
          {recentFlips(fills, GE_TAX_RATE).length === 0 && (
            <li className="dim">no completed flips in the window — sell something you bought</li>
          )}
        </ul>
      )}
    </section>
  );
}
