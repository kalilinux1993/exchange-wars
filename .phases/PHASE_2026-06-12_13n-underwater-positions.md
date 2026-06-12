# Phase: Exchange Wars — Phase 13n: Underwater Positions Glance (Brick 144)

**Started:** 2026-06-12
**Closed:** 2026-06-12
**Hat:** Builder (UI — trading risk lens; the holdings-risk counterpart to 13k/13l's acquisition lens)
**Goal:** Surface how many held positions are underwater (and by how much), and tint the losing rows.
**Done condition:** an `underwaterSummary` pure helper + a "⚠ N underwater" callout in PositionsPanel + a red edge on losing rows; UI suite + e2e green. **MET.**

## Why this brick
PositionsPanel already colours each position's paper P&L green/red, but it sorts best-first, so losers sink below the fold (limit 8) with no aggregate. 13k/13l answered "what can I buy?"; this answers the risk question "which positions are bleeding, and how much?" — a one-look glance instead of scrolling to the bottom.

## Design — one pure summary + a row tint, reuse heldPositions
- `underwaterSummary(positions)` (game.ts, pure): counts MARKED losers (no live price = unknown, not a loss), sums their paper P&L, and finds the worst single one. Returns `{count, paperLoss, worst}`.
- PositionsPanel: a "⚠ N underwater  −X paper" line (red) under the concentration line, shown only when count > 0; and `.underwater` on each losing row (a 2px red left edge) so losers pop even when sorted to the bottom.

## Outcome
- `game.ts`: `underwaterSummary` + `Underwater` interface.
- `PositionsPanel.tsx`: the callout line + row tint.
- `styles.css`: `.mover.underwater`.
- Tests (+3): `underwaterSummary` (counts/sums only marked losers, finds worst; empty when none) + a PositionsPanel render (buy 10@100, mark 80 → "underwater" callout + a `.mover.underwater` row).

## Gates
- [x] underwaterSummary counts/sums only marked losers + worst (2 unit tests)
- [x] callout + row tint render (render test)
- [x] UI suite (260, +3) + e2e (9) green; typecheck clean
- [x] UI-only — no engine change, no engine.js rebuild, **no new redeploy** (batch stays 12b+13d+13e+13f)

## Follow-ups
- A "cut losers" / one-click sell-at-bid on an underwater row (it already loads in the ticket on click).
- Remaining trading gap: a per-flip round-trip trade journal.
