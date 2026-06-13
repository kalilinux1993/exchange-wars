import { GEAR } from '@exchange-wars/engine';
import type { ItemDef, ItemId, PlayerView, Trade } from '@exchange-wars/engine';
import { useEffect, useRef, useState } from 'react';
import { bandPosition, flipMargin, marketMood, nextRowIndex, priceSwing, valueBand } from '../game';
import { usePref } from '../usePref';

const SPARK_POINTS = 20;

type SortKey = 'name' | 'bid' | 'ask' | 'last' | 'vol' | 'margin' | 'band' | 'swing' | 'mom';

/** After-tax flip margin per unit (undercut the spread one tick each way), or
 *  null when there's no two-sided book — the same sum TopFlips ranks, per row,
 *  so the whole market is sortable by flippability, not just the top few. */
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
  onToggleWatch,
  watched,
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
  /** Toggle the watchlist on the selected item — bound to the `w` key (17c) and the per-row ★ (17d). */
  onToggleWatch?: (id: ItemId) => void;
  /** The watched item ids — drives the per-row ★ marker (17d). */
  watched?: ReadonlySet<ItemId>;
}) {
  const [filter, setFilter] = useState('');
  const [compact, setCompact] = usePref<boolean>('ew-market-compact', false); // hide the analysis columns (17r)
  const [track, setTrack] = useState<'all' | 'staples' | 'exotics' | 'gear' | 'flippable' | 'cheap' | 'watched' | 'steady'>('all');
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
  // Recent realized volatility per item, from the SAME window the sparkline draws — computed once
  // so the sortable swing column and its cell share it (untraded items are absent → null → '—').
  const swings = new Map<ItemId, ReturnType<typeof priceSwing>>();
  for (const [id, arr] of sparks) swings.set(id, priceSwing(arr.slice(-SPARK_POINTS)));
  const needle = filter.trim().toLowerCase();
  const inTrack = (m: { itemId: ItemId; bestBid: number | null; bestAsk: number | null; lastPrice: number }): boolean => {
    if (track === 'all') return true;
    if (track === 'gear') return GEAR[m.itemId] !== undefined; // the equippable items only
    if (track === 'watched') return watched?.has(m.itemId) ?? false; // your starred items only (17f)
    if (track === 'flippable') {
      const mg = flipMargin(m);
      return mg !== null && mg > 0; // a positive after-tax spread right now
    }
    if (track === 'cheap') return valueBand(defs.get(m.itemId), m.lastPrice) === 'cheap'; // trading near its floor
    if (track === 'steady') return swings.get(m.itemId)?.read === 'steady'; // calm + liquid — the low-risk flips (17h)
    const exotic = (defs.get(m.itemId)?.volatility ?? 0) >= EXOTIC_VOL;
    return track === 'exotics' ? exotic : !exotic;
  };
  const shown = view.markets.filter(
    (m) =>
      inTrack(m) &&
      (needle === '' || (defs.get(m.itemId)?.name ?? m.itemId).toLowerCase().includes(needle)),
  );
  const numOf = (m: (typeof shown)[number]): number | null => {
    if (sort === null) return null;
    if (sort.key === 'bid') return m.bestBid;
    if (sort.key === 'ask') return m.bestAsk;
    if (sort.key === 'last') return m.lastPrice;
    if (sort.key === 'margin') return flipMargin(m);
    if (sort.key === 'band') return bandPosition(defs.get(m.itemId), m.lastPrice);
    if (sort.key === 'swing') return swings.get(m.itemId)?.swingPct ?? null;
    if (sort.key === 'mom') return m.ema > 0 ? (m.lastPrice - m.ema) / m.ema : null; // % vs EMA — recent momentum (17o)
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
  const filterRef = useRef<HTMLInputElement>(null);
  const navRef = useRef({ sorted, selected, onSelect, active, onToggleWatch });
  navRef.current = { sorted, selected, onSelect, active, onToggleWatch };
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      const { sorted: list, selected: sel, onSelect: pick, active: on, onToggleWatch: watch } = navRef.current;
      if (!on || e.ctrlKey || e.metaKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      if (t && (['INPUT', 'SELECT', 'TEXTAREA', 'BUTTON'].includes(t.tagName) || t.isContentEditable)) return;
      // `/` jumps to the filter — the web-wide "focus search" key, so you can find an item by name fast (17n).
      if (e.key === '/') {
        e.preventDefault();
        filterRef.current?.focus();
        return;
      }
      // `w` toggles the watchlist on the selected item — the watch verb of the keyboard trade loop (17c).
      if ((e.key === 'w' || e.key === 'W') && watch) {
        e.preventDefault();
        watch(sel);
        return;
      }
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
    <section className={compact ? 'panel market compact' : 'panel market'}>
      <h2>
        Grand Exchange{' '}
        <input
          ref={filterRef}
          className="filter"
          placeholder="filter items…  /"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              setFilter(''); // Esc clears + steps out — the search-box convention (17s)
              e.currentTarget.blur();
            }
          }}
        />
        {filter !== '' && (
          <button
            className="filterclear"
            title="clear the filter (or press Esc)"
            aria-label="clear filter"
            onClick={() => {
              setFilter('');
              filterRef.current?.focus();
            }}
          >
            ✕
          </button>
        )}
        {(['all', 'staples', 'exotics', 'gear', 'flippable', 'cheap', 'watched', 'steady'] as const).map((t) => (
          <button
            key={t}
            className={track === t ? 'chip active' : 'chip'}
            title={
              t === 'cheap'
                ? 'items trading in the cheap third of their cost→value band — accumulation candidates'
                : t === 'watched'
                  ? 'only the items on your watchlist (★ / press w to add)'
                  : t === 'steady'
                    ? 'only calm, actively-traded markets (low recent swing) — the spread holds while both legs fill'
                    : t === 'flippable'
                      ? 'only items with a positive after-tax spread right now — a flip you could place this moment'
                      : t === 'gear'
                        ? 'only equippable gear among the commodities — find your combat upgrades'
                        : t === 'exotics'
                          ? 'high-volatility goods (the exotic track) — bigger swings, the clerk leaves these to you'
                          : t === 'staples'
                            ? 'everyday commodities — the liquid, lower-volatility bulk of the market'
                            : undefined
            }
            onClick={() => setTrack(t)}
          >
            {t}
          </button>
        ))}{' '}
        <button
          className={compact ? 'chip active' : 'chip'}
          title="compact view — hide the analysis columns (mom/margin/band/swing/trend) for a clean price read; click again to restore"
          aria-pressed={compact}
          onClick={() => setCompact(!compact)}
        >
          compact
        </button>{' '}
        <span className="dim small">
          {shown.length}/{view.markets.length}
        </span>
      </h2>
      {(() => {
        const mood = marketMood(view.markets, items);
        return (
          <p
            className="dim small marketmood"
            title="market breadth — traded items up vs down on their EMA, and how many sit cheap vs rich in their cost→value band (a macro read of the whole market)"
          >
            📊 <b className="up">{mood.up}↑</b> / <b className="down">{mood.down}↓</b> ·{' '}
            <span className="up">🟢 {mood.cheap} cheap</span> · <span className="down">🟡 {mood.rich} rich</span>
          </p>
        );
      })()}
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
            <th className="num sortable" onClick={() => toggleSort('mom')} title="momentum — % the last price sits above/below its smoothed EMA. Sort descending for what's spiking (event crazes), ascending for dips (mean-reversion buys).">
              mom{arrow('mom')}
            </th>
            <th className="num sortable" onClick={() => toggleSort('margin')} title="after-tax flip margin per unit — undercut the spread one tick each way. Sort to find the whole market's flippable items, not just the top few.">
              margin{arrow('margin')}
            </th>
            <th className="sortable" onClick={() => toggleSort('band')} title="where last sits in the item's cost→value band — 🟢 cheap (accumulate) → 🟡 rich (offload). Sort ascending for the market's best accumulation candidates, descending for offload candidates.">
              band{arrow('band')}
            </th>
            <th aria-label="trend" />
            <th className="num sortable" onClick={() => toggleSort('swing')} title="recent realized volatility — peak-to-trough % over the last trades. Sort ascending for the steadiest spreads (safer to flip — the price holds while both legs fill), descending for the wildest (a spread can move before you complete the round-trip).">
              swing{arrow('swing')}
            </th>
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
                {onToggleWatch && (() => {
                  const on = watched?.has(m.itemId) ?? false;
                  return (
                    <button
                      className={on ? 'watchstar on' : 'watchstar'}
                      title={on ? 'watching — click to remove (or press w)' : 'add to watchlist (or press w)'}
                      aria-label={on ? `stop watching ${defs.get(m.itemId)?.name ?? m.itemId}` : `watch ${defs.get(m.itemId)?.name ?? m.itemId}`}
                      aria-pressed={on}
                      onClick={(e) => {
                        e.stopPropagation(); // don't also load the row into the ticket
                        onToggleWatch(m.itemId);
                      }}
                    >
                      {on ? '★' : '☆'}
                    </button>
                  );
                })()}
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
                if (m.ema <= 0) return <td className="num dim">—</td>;
                const mom = Math.round(((m.lastPrice - m.ema) / m.ema) * 100);
                return (
                  <td
                    className={`num ${mom > 0 ? 'up' : mom < 0 ? 'down' : 'dim'}`}
                    title={`last ${m.lastPrice.toLocaleString('en-US')} vs EMA ${Math.round(m.ema).toLocaleString('en-US')} — ${mom > 0 ? 'running hot' : mom < 0 ? 'dipping' : 'flat'}`}
                  >
                    {mom > 0 ? '+' : ''}{mom}%
                  </td>
                );
              })()}
              {(() => {
                const mg = flipMargin(m);
                return (
                  <td className={`num ${mg !== null && mg > 0 ? 'up' : 'dim'}`}>
                    {mg === null ? '—' : `${mg > 0 ? '+' : ''}${mg.toLocaleString('en-US')}`}
                  </td>
                );
              })()}
              {(() => {
                const band = valueBand(defs.get(m.itemId), m.lastPrice);
                return (
                  <td
                    className="bandcell"
                    title={
                      band === null
                        ? 'no fundamental band'
                        : band === 'cheap'
                          ? 'near its floor — accumulation candidate'
                          : band === 'rich'
                            ? 'near its ceiling — offload candidate'
                            : 'mid-band'
                    }
                  >
                    {band === null ? <span className="dim">—</span> : band === 'cheap' ? '🟢' : band === 'rich' ? '🟡' : '⚪'}
                  </td>
                );
              })()}
              <td className="sparkcell">
                <Spark prices={(sparks.get(m.itemId) ?? []).slice(-SPARK_POINTS)} />
              </td>
              {(() => {
                const sw = swings.get(m.itemId);
                if (!sw) return <td className="num dim">—</td>;
                const cls = sw.read === 'steady' ? 'up' : sw.read === 'wild' ? 'down' : 'pct';
                return (
                  <td
                    className={`num ${cls}`}
                    title={`recent range ${sw.lo.toLocaleString('en-US')}–${sw.hi.toLocaleString('en-US')} — ${sw.read} (${Math.round(sw.swingPct * 100)}% peak-to-trough); steady spreads are safer to flip, wild ones can move before both legs fill`}
                  >
                    {Math.round(sw.swingPct * 100)}%
                  </td>
                );
              })()}
              <td className="num dim">{m.volume.toLocaleString('en-US')}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="dim small">click a row — or press j / k (↑ / ↓) — to load it into the offer ticket</p>
    </section>
  );
}
