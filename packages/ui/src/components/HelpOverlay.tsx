export const HELP_SEEN_KEY = 'ew-help-seen';

export function HelpOverlay({ onClose }: { onClose: () => void }) {
  return (
    <div className="scrim" onClick={onClose}>
      <section className="panel help" onClick={(e) => e.stopPropagation()}>
        <h2>How to Play</h2>
        <ul className="guide">
          <li>
            You're a Grand Exchange flipper with <b>55,000 gp</b> and <b>3 offer slots</b>. Buy low, sell
            high — the exchange takes <b>2% tax</b> on every sale.
          </li>
          <li>
            Click a market row to load it, then click prices in the <b>Depth</b> ladder: lift an ask to buy,
            hit a bid to sell. Offers rest on the books until someone takes them.
          </li>
          <li>
            Press <b>1×/5×/20×</b> to run the world, or jump with <b>+1k/+10k</b>. Closing the tab keeps the
            world running — about a tick per second while you're away.
          </li>
          <li>
            Hire the <b>clerk</b> in the shop to flip automatically, then give it orders: risk, capital,
            focus. Buy more slots to scale.
          </li>
          <li>
            Watch the <b>⚡ news</b>: shortages and crazes move prices; crashes are buying opportunities.
            The clerk stands aside during events — they're yours.
          </li>
          <li>
            The <b>Quartermaster</b> pays 15–35% over market. Acquire the goods, hit deliver.
          </li>
          <li>
            <b>Sign in</b> with your email to sync your save across devices.
          </li>
        </ul>
        <button className="submit buy" onClick={onClose}>
          start trading
        </button>
      </section>
    </div>
  );
}
