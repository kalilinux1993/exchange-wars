import type { ItemDef, Trade } from '@exchange-wars/engine';
import { useState } from 'react';
import type { Fill } from '../game';

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
  const [mode, setMode] = useState<'tape' | 'mine'>('tape');
  const names = new Map(items.map((i) => [i.id, i.name]));
  return (
    <section className="panel feed">
      <h2>
        Tape{' '}
        <button className={mode === 'tape' ? 'chip active' : 'chip'} onClick={() => setMode('tape')}>
          tape
        </button>{' '}
        <button className={mode === 'mine' ? 'chip active' : 'chip'} onClick={() => setMode('mine')}>
          mine
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
                  <span>{names.get(t.itemId) ?? t.itemId}</span>
                  <span className="num">
                    {t.qty} @ {t.price.toLocaleString('en-US')}
                  </span>
                  {mine && <span className="mine">◆</span>}
                </li>
              );
            })}
          {trades.length === 0 && <li className="dim">no trades yet — press play</li>}
        </ul>
      ) : (
        <ul className="rows small">
          {[...fills].reverse().map((f, i) => (
            <li key={`${f.tick}-${i}`}>
              <span className="dim num">t{f.tick.toLocaleString('en-US')}</span>
              <span className={`badge ${f.side}`}>{f.side}</span>
              <span>{names.get(f.itemId) ?? f.itemId}</span>
              <span className="num">
                {f.qty} @ {f.price.toLocaleString('en-US')}
              </span>
            </li>
          ))}
          {fills.length === 0 && <li className="dim">no fills yet — your trades will land here</li>}
        </ul>
      )}
    </section>
  );
}
