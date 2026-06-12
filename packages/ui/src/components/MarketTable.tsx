import { GEAR, GE_TAX_RATE } from '@exchange-wars/engine';
import type { ItemDef, ItemId, PlayerView, Trade } from '@exchange-wars/engine';
import { useEffect, useRef, useState } from 'react';
import { nextRowIndex } from '../game';

const SPARK_POINTS = 20;

type SortKey = 'name' | 'bid' | 'ask' | 'last' | 'vol' | 'margin';

/** After-tax flip margin per unit (undercut the spread one tick each way), or
 *  null when there's no two-sided book — the same sum TopFlips ranks, per row,
 *  so the whole market is sortable by flippability, not just the top few. */
function flipMargin(m: { bestBid: number | null; bestAsk: number | null }): number | null {
  if (m.bestBid === null || m.bestAsk === null) return null;
  const buy = m.bestBid + 1;
  const sell = m.bestAsk - 1;
  if (buy <= 0 || sell <= 0) return null;
  return sell - buy - Math.floor(sell * GE_TAX_RATE);
}

/** Tiny price history from the engine's recent-trades window (display-only read). */
function Spark({ prices }: { prices: number[] }) {
  if (prices.length < 2) return <span className="dim">·</span>;
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range = Math.max(1, max - min);
  const pts = prices
    .map((p, i) => `${((i / (prices.length - 1)) * 40).toFixed(1)},${(11 - ((p - min) / range) * 10).toFixed(1)}`)
    .join(' ');
  const up = prices[prices.length - 1]! >= prices[0]!;
  return (
    <svg className={`spark ${up ? 'up' : 'down'}`} width="40" height="12" viewBox="0 0 40 12" aria-hidden="true">
      <polyline points={pts} fill="none" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  );
}

/** The wiki generator pins exotic-track items at vol 0.13; staples top out at 0.10. */
const EXOTIC_VOL = 0.13;

export function MarketTable({
  view,
  items,
  trades,
  selected,
  onSelect,
  eventItems,
  active = true,
}: {
  view: PlayerView;
  items: ItemDef[];
  trades: Trade[];
  selected: ItemId;
  onSelect: (id: ItemId) => void;
  /** Items with an active world event — marked ⚡ in their row. */
  eventItems: ReadonlySet<string>;
  /** Whether the Exchange tab is the visible room — gates the j/k keyboard nav so
   *  the hotkeys don't move the (hidden, still-mounted) market on other tabs. */
  active?: boolean;
}) {
  const [filter, setFilter] = useState('');
  const [track, setTrack] = useState<'all' | 'staples' | 'exotics' | 'gear'>('all');
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 } | null>(null);
  const toggleSort = (key: SortKey): void =>
    setSort((s) => (s && s.key === key ? { key, dir: (s.dir * -1) as 1 | -1 } : { key, dir: 1 }));
  const defs = new Map(items.map((i) => [i.id, i]));
  const sparks = new Map<ItemId, number[]>();
  for (const t of trades) {
    const arr = sparks.get(t.itemId) ?? [];
    arr.push(t.price);
    sparks.set(t.itemId, arr);
  }
  const needle = filter.trim().toLowerCase();
  const inTrack = (id: ItemId): boolean => {
    if (track === 'all') return true;
    if (track === 'gear') return GEAR[id] !== undefined; // the equippable items only
    const exotic = (defs.get(id)?.volatility ?? 0) >= EXOTIC_VOL;
    return track === 'exotics' ? exotic : !exotic;
  };
  const shown = view.markets.filter(
    (m) =>
      inTrack(m.itemId) &&
      (needle === '' || (defs.get(m.itemId)?.name ?? m.itemId).toLowerCase().includes(needle)),
  );
  const numOf = (m: (typeof shown)[number]): number | null => {
    if (sort === null) return null;
    if (sort.key === 'bid') return m.bestBid;
    if (sort.key === 'ask') return m.bestAsk;
    if (sort.key === 'last') return m.lastPrice;
    if (sort.key === 'margin') return flipMargin(m);
    return m.volume;
  };
  const sorted =
    sort === null
      ? shown
      : [...shown].sort((a, b) => {
          if (sort.key === 'name') {
            const an = defs.get(a.itemId)?.name ?? a.itemId;
            const bn = defs.get(b.itemId)?.name ?? b.itemId;
            return (an < bn ? -1 : an > bn ? 1 : 0) * sort.dir;
          }
          const av = numOf(a);
          const bv = numOf(b);
          if (av === null && bv === null) return 0;
          if (av === null) return 1; // empty books sink to the bottom either way
          if (bv === null) return -1;
          return (av - bv) * sort.dir;
        });
  // Keyboard nav (j/k or ↑/↓ walk the selection through the *displayed* order, so
  // it always matches the on-screen sort/filter). Refs keep the once-bound window
  // listener reading current state without re-binding every render.
  const navRef = useRef({ sorted, selected, onSelect, active });
  navRef.current = { sorted, selected, onSelect, active };
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      const { sorted: list, selected: sel, onSelect: pick, active: on } = navRef.current;
      if (!on || e.ctrlKey || e.metaKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      if (t && (['INPUT', 'SELECT', 'TEXTAREA', 'BUTTON'].includes(t.tagName) || t.isContentEditable)) return;
      const delta = e.key === 'j' || e.key === 'ArrowDown' ? 1 : e.key === 'k' || e.key === 'ArrowUp' ? -1 : 0;
      if (delta === 0) return;
      const cur = list.findIndex((m) => m.itemId === sel);
      const next = nextRowIndex(cur, delta, list.length);
      if (next >= 0) {
        e.preventDefault();
        pick(list[next]!.itemId);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  // Keep the selected row visible — on a long/filtered list, j/k can walk it off
  // screen. `block: 'nearest'` only scrolls when it isn't already in view. The
  // typeof guard sidesteps jsdom (no real layout) without a crash.
  const bodyRef = useRef<HTMLTableSectionElement>(null);
  useEffect(() => {
    const row = bodyRef.current?.querySelector('tr.selected') as HTMLElement | null;
    if (row && typeof row.scrollIntoView === 'function') row.scrollIntoView({ block: 'nearest' });
  }, [selected]);
  const arrow = (key: SortKey): string => (sort?.key === key ? (sort.dir === 1 ? ' ▲' : ' ▼') : '');
  return (
    <section className="panel market">
      <h2>
        Grand Exchange{' '}
        <input
          className="filter"
          placeholder="filter items…"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
        {(['all', 'staples', 'exotics', 'gear'] as const).map((t) => (
          <button key={t} className={track === t ? 'chip active' : 'chip'} onClick={() => setTrack(t)}>
            {t}
          </button>
        ))}{' '}
        <span className="dim small">
          {shown.length}/{view.markets.length}
        </span>
      </h2>
      <table>
        <thead>
          <tr>
            <th className="sortable" onClick={() => toggleSort('name')}>
              item{arrow('name')}
            </th>
            <th className="num sortable" onClick={() => toggleSort('bid')}>
              bid{arrow('bid')}
            </th>
            <th className="num sortable" onClick={() => toggleSort('ask')}>
              ask{arrow('ask')}
            </th>
            <th className="num sortable" onClick={() => toggleSort('last')}>
              last{arrow('last')}
            </th>
            <th className="num sortable" onClick={() => toggleSort('margin')} title="after-tax flip margin per unit — undercut the spread one tick each way. Sort to find the whole market's flippable items, not just the top few.">
              margin{arrow('margin')}
            </th>
            <th aria-label="trend" />
            <th className="num sortable" onClick={() => toggleSort('vol')}>
              volume{arrow('vol')}
            </th>
          </tr>
        </thead>
        <tbody ref={bodyRef}>
          {sorted.map((m) => (
            <tr
              key={m.itemId}
              className={m.itemId === selected ? 'selected' : ''}
              onClick={() => onSelect(m.itemId)}
            >
              <td className="name">
                {defs.get(m.itemId)?.wikiId !== undefined && (
                  <img
                    className="icon"
                    src={`${import.meta.env.BASE_URL}icons/${defs.get(m.itemId)!.wikiId}.png`}
                    alt=""
                  />
                )}
                {defs.get(m.itemId)?.name ?? m.itemId}
                {GEAR[m.itemId] !== undefined && (
                  <span
                    className="gearmark"
                    title={`equippable ${GEAR[m.itemId]!.slot} — needs ${
                      GEAR[m.itemId]!.slot === 'weapon' ? 'Attack' : 'Defence'
                    } ${GEAR[m.itemId]!.req}`}
                  >
                    {' '}
                    {GEAR[m.itemId]!.slot === 'weapon' ? '⚔' : '🛡'}
                  </span>
                )}
                {eventItems.has(m.itemId) && (
                  <span className="event-mark" title="active event — see the newsbar">
                    {' '}
                    ⚡
                  </span>
                )}
                {(m.bestBidIsMine || m.bestAskIsMine) && (
                  <span className="mine" title="your offer is best">
                    {' '}
                    ◆
                  </span>
                )}
              </td>
              <td className="num bid">{m.bestBid?.toLocaleString('en-US') ?? '—'}</td>
              <td className="num ask">{m.bestAsk?.toLocaleString('en-US') ?? '—'}</td>
              <td className={`num ${m.lastPrice >= m.ema ? 'up' : 'down'}`}>
                {m.lastPrice.toLocaleString('en-US')}
              </td>
              {(() => {
                const mg = flipMargin(m);
                return (
                  <td className={`num ${mg !== null && mg > 0 ? 'up' : 'dim'}`}>
                    {mg === null ? '—' : `${mg > 0 ? '+' : ''}${mg.toLocaleString('en-US')}`}
                  </td>
                );
              })()}
              <td className="sparkcell">
                <Spark prices={(sparks.get(m.itemId) ?? []).slice(-SPARK_POINTS)} />
              </td>
              <td className="num dim">{m.volume.toLocaleString('en-US')}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="dim small">click a row — or press j / k (↑ / ↓) — to load it into the offer ticket</p>
    </section>
  );
}
