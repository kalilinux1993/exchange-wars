# Phase: Exchange Wars — Phase 13o: Extract Payoff on the Action (Brick 145)

**Started:** 2026-06-12
**Closed:** 2026-06-12
**Hat:** Builder (UI — RPG/dive; sharpen the push-your-luck extract decision)
**Goal:** The extract button names the loot it would bank, so the stake is concrete at the decision point.
**Done condition:** the dive's extract button reads "extract · bank N gp" (rise-green) when loot is at stake; UI suite + e2e green. **MET.**

## Why this brick
Rotated to the active-dive experience (only embark had been touched). Extracting is the core push-your-luck decision — keep your haul vs push deeper and risk losing it all to a death. But the button said a generic "extract (keep everything)", and the loot was only a neutral number buried in the dim stats line. The payoff wasn't on the action.

## Design — decision info ON the action (the 13i pattern), not a duplicate readout
- The extract button label becomes `extract · bank {packGp} gp` when `packGp > 0`, else `extract (keep your kit)` (clarifies you keep your packed gear even with no loot). The banked amount is on the action itself — the same "put the decision info at the action point" move as 13i's buy-ticket gear delta.
- A `.hasloot` class paints it rise-green when there's loot, reading as "lock in your winnings". The button `title` spells out the push-your-luck risk.
- Non-duplicative: the dim stats line still shows loot as current STATUS; the button shows it as the ACTION'S payoff — same value, complementary framings (and a single value can't disagree with itself).

## Outcome
- `ExpeditionPanel.tsx`: dynamic extract-button label + `hasloot` class + push-your-luck title.
- `styles.css`: `.chip.extract.hasloot`.
- Tests (+1): an active non-combat dive with packGp 5,000 renders a "extract · bank 5,000 gp" button carrying `hasloot`.

## Gates
- [x] extract button names the banked loot + emphasised when loot is at stake (render test)
- [x] UI suite (261, +1) + e2e (9) green; typecheck clean
- [x] UI-only — no engine change, no engine.js rebuild, **no new redeploy** (batch stays 12b+13d+13e+13f)

## Follow-ups
- An hp-aware "your odds of surviving the next push" read to pair with the at-stake loot (needs a light risk model).
- A "sell the spoils" deep-link from the extract toast (it already nudges "sell on the exchange").
