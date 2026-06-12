/**
 * A tiny price sparkline (9u) from a series of recent trade prices. Pure
 * presentation: scales the series to the box, colours by net direction.
 * Fewer than 2 points → a dim hint (nothing to draw yet).
 */
export function Sparkline({
  prices,
  width = 150,
  height = 28,
  ariaLabel = 'recent trend',
}: {
  prices: number[];
  width?: number;
  height?: number;
  ariaLabel?: string;
}) {
  if (prices.length < 2) {
    return <p className="dim small">no recent trades to chart</p>;
  }
  const lo = Math.min(...prices);
  const hi = Math.max(...prices);
  const span = hi - lo || 1;
  const n = prices.length;
  const pts = prices
    .map((p, i) => {
      const x = (i / (n - 1)) * (width - 2) + 1;
      const y = height - 1 - ((p - lo) / span) * (height - 2);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
  const up = prices[n - 1]! >= prices[0]!;
  return (
    <svg className="sparkline" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={ariaLabel} preserveAspectRatio="none">
      <polyline points={pts} fill="none" className={up ? 'spark up' : 'spark down'} strokeWidth={1.5} />
    </svg>
  );
}
