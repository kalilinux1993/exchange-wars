import { SPRINT_TICKS } from '@exchange-wars/engine';

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
            <b>Expeditions</b>: delve seven regions, plains to the Inferno Gate. Every step and every combat
            round costs a market tick — time raiding is time not trading. Loot mints straight into the
            economy; death keeps only your 3 most valuable carried items, and <b>wounds persist</b> — you
            mend slowly at home, or eat food in the field.
          </li>
          <li>
            <b>Train as you fight</b>: Attack grows from damage dealt (unlocks weapons), Defence from damage
            taken (unlocks armor), Hitpoints from fighting (raises max hp). Carried gear above your level is
            inert — climb the ladder: darts, staff, mystic, rune, dragon.
          </li>
          <li>
            Past the Wilderness, everything <b>breathes fire</b> — armor won't stop it, a{' '}
            <b>super antifire</b> will, and one potion coats a whole dive. Shrines, dice, imps, portals and
            merchants wait in the dark; the <b>Bestiary</b> remembers everything you've slain.
          </li>
          <li>
            <b>Race on fair ground</b>: the same seed is always the same world. Restart your seed to chase
            your best run's <b>ghost</b> on the Fortune chart, or copy a <b>challenge link</b> to put a
            friend on your exact market. Sign in and submit a{' '}
            <b>{SPRINT_TICKS.toLocaleString('en-US')}-tick sprint</b> to the board — every entry is verified
            by replaying your actual run, depth badge included.
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
