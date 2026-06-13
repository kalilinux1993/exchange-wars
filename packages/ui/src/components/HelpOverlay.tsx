import { REGIONS, SPRINT_TICKS } from '@exchange-wars/engine';
import { HUMAN_START_GP } from '../game';

export const HELP_SEEN_KEY = 'ew-help-seen';

export function HelpOverlay({ onClose }: { onClose: () => void }) {
  return (
    <div className="scrim" onClick={onClose}>
      <section className="panel help" onClick={(e) => e.stopPropagation()}>
        <h2>How to Play</h2>
        <ul className="guide">
          <li>
            You're a Grand Exchange flipper with <b>{HUMAN_START_GP.toLocaleString('en-US')} gp</b> and{' '}
            <b>3 offer slots</b>. Buy low, sell high — the exchange takes <b>2% tax</b> on every sale.
          </li>
          <li>
            Three rooms: <b>🪙 Exchange</b> to trade, <b>⚔ Adventure</b> to delve, <b>🏰 Hall</b> for your
            clerk, your fortune, the almanac, and the sprint board. The world is one — time spent anywhere
            passes everywhere.
          </li>
          <li>
            Click a market row to load it, then click prices in the <b>Depth</b> ladder: lift an ask to buy,
            hit a bid to sell. Offers rest on the books until someone takes them. The <b>sell @ bid</b>{' '}
            chips in your Ledger dump a stack into the resting bids instantly — loot to gp, one click.
          </li>
          <li>
            Press <b>1×/5×/20×</b> to run the world, or jump with <b>+1k/+10k</b>. Closing the tab keeps the
            world running — about a tick per second while you're away (wounds mend too).
          </li>
          <li>
            Hire the <b>clerk</b> in the shop to flip automatically, then give it orders: risk, capital,
            focus. Cheap staples are everyone's; <b>big staples</b> (5k+) need senior clerks; <b>exotics</b>{' '}
            are yours alone. Buy more slots to scale.
          </li>
          <li>
            Watch the <b>⚡ news</b>: shortages and crazes move prices; crashes are buying opportunities.
            The clerk stands aside during events — they're yours. The <b>Quartermaster</b> pays 15–35% over
            market: acquire the goods, hit deliver.
          </li>
          <li>
            <b>Decide with the numbers</b>: every price shows where it sits in its cost→value band —{' '}
            <b>🟢 cheap</b> (room to run, accumulate), <b>⚪ fair</b>, <b>🟡 rich</b> (near its ceiling, take
            profit). Star items into your <b>Watchlist</b> and set a <b>≤/≥ price alert</b> or a
            threshold-free <b>band alert</b> (🟢 buy-the-dip / 🟡 take-profit) — it tells you the moment a
            watched item turns cheap or rich. The market table <b>sorts</b> by margin, value-band, swing
            (volatility), momentum (vs trend), or volume, and <b>filters</b> to flippable, cheap, steady,
            movers (what's dislocated right now), gear, exotics/staples, or your watchlist — narrow 100+ goods
            to your best candidates in a click. <b>Compact</b> hides the analysis columns for a clean price read.
          </li>
          <li>
            <b>Expeditions</b>: delve {REGIONS.length} regions, plains to {REGIONS[REGIONS.length - 1]!.name}.
            Every step and every combat round costs a market tick — time raiding is time not trading. Loot
            mints straight into the economy; death keeps only your 3 most valuable carried items, and{' '}
            <b>wounds persist</b> — you mend slowly at home, or eat food in the field. The{' '}
            <b>Bounty Board</b> posts kill orders that pay in fresh coin.
          </li>
          <li>
            <b>Train as you fight</b>: Attack grows from damage dealt (unlocks weapons), Defence from damage
            taken (unlocks armor), Hitpoints from fighting (raises max hp). Carried gear above your level is
            inert — climb the ladder: darts, staff, mystic, rune, dragon.
          </li>
          <li>
            Past the Wilderness the fire country <b>breathes flame</b> — armor won't stop it, a{' '}
            <b>super antifire</b> will, one potion per dive — and deeper still, the Abyss <b>drains your
            loot gp</b> every round a fight drags. Shrines, dice, imps, portals, merchants, swordmasters and
            toll-keepers wait in the dark; the <b>Bestiary</b> remembers everything you've slain.
          </li>
          <li>
            <b>Race on fair ground</b>: the same seed is always the same world. Restart your seed to chase
            your best run's <b>ghost</b> on the Fortune chart, or share a <b>challenge link</b> (or a one-tap{' '}
            <b>run brag</b>) that <b>dares a friend to beat your fortune</b> on your exact market — accept one
            and you'll race a visible target, with a <b>🏆 when you pass it</b>. Sign in and submit a{' '}
            <b>{SPRINT_TICKS.toLocaleString('en-US')}-tick sprint</b> to the board — every entry is verified
            by replaying your actual run, depth badge included.
          </li>
          <li>
            <b>Sign in</b> with your email to sync your save across devices.
          </li>
          <li>
            <b>Keyboard</b>: <kbd>1</kbd>/<kbd>2</kbd>/<kbd>3</kbd> jump between rooms, <kbd>p</kbd> pauses or
            resumes the world, <kbd>,</kbd>/<kbd>.</kbd> slow it down or speed it up, <kbd>?</kbd> toggles
            this guide. In the Exchange,{' '}
            <kbd>j</kbd>/<kbd>k</kbd> (or <kbd>↑</kbd>/<kbd>↓</kbd>) walk the market, <kbd>b</kbd>/<kbd>s</kbd>{' '}
            pick buy or sell, <kbd>w</kbd> stars the loaded item to your watchlist, <kbd>/</kbd> jumps to the
            filter to search by name, and <kbd>Esc</kbd> clears it. In <b>Adventure</b>, <kbd>←</kbd>/<kbd>→</kbd>{' '}
            pick a region and <kbd>Enter</kbd> embarks; in a fight, <kbd>f</kbd> swings a round.
          </li>
        </ul>
        <button className="submit buy" onClick={onClose}>
          start trading
        </button>
      </section>
    </div>
  );
}
