import { bandPosition, valueBand } from '../game';

/**
 * A horizontal meter showing where the last price sits between an item's producer floor (`baseCost`)
 * and consumer ceiling (`consumeValue`) — the VISUAL complement to the cheap/fair/rich tag. Where the
 * tag gives only the third, this surfaces the concrete band BOUNDS + the exact position, so "how much
 * room is left before fair value" is one look. Renders nothing for a bandless item (consumeValue ≤
 * baseCost). Pure display; reuses `bandPosition`/`valueBand`.
 */
export function BandMeter({
  def,
  lastPrice,
}: {
  def: { baseCost: number; consumeValue: number } | undefined;
  lastPrice: number;
}) {
  const pos = bandPosition(def, lastPrice);
  if (pos === null || !def) return null;
  const band = valueBand(def, lastPrice);
  return (
    <p
      className="dim small bandmeter"
      title="where the last price sits between this item's producer floor (baseCost) and consumer ceiling (consumeValue) — the room left before fair value, not just the cheap/fair/rich third"
    >
      <span className="bm-end">{def.baseCost.toLocaleString('en-US')}</span>
      <span className="bm-track" aria-hidden="true">
        <span className={`bm-marker ${band ?? ''}`} style={{ left: `${Math.round(pos * 100)}%` }} />
      </span>
      <span className="bm-end">{def.consumeValue.toLocaleString('en-US')}</span>
    </p>
  );
}
