# Phase: Exchange Wars — Phase 13k: Return on Stake (Brick 141)

**Started:** 2026-06-12
**Closed:** 2026-06-12
**Hat:** Builder (UI — trading side; the "am I up?" glance the cockpit lacked)
**Goal:** Surface net worth vs the starting stake as a single gp+% readout.
**Done condition:** a `returnOnStake` pure helper + a coloured return badge in WealthPanel's header; UI suite + e2e green. **MET.**

## Why this brick
After six equipment bricks, branched to the trading side (untouched this session). An Explore map of the cockpit found it well-instrumented for spreads (TopFlips/Movers/Depth) and positions (ProfitPanel/PositionsPanel) — but with NO single "am I up or down overall, and by how much?" glance. The Fortune chart shows worth over time, not the delta vs where you began; realized/unrealized P&L is per-item, not a headline. `game.startGp` is already stored as the lifetime stake baseline (HUMAN_START_GP, preserved across reloads — it's what the "double your stake" deed measures), but nothing displayed the return against it.

## Design — one pure helper, integrated (not a new competing panel)
- `returnOnStake(startGp, worth)` (game.ts, pure): `{ delta, pct, up }`. Guards a zero stake. Honest scoping: this is LIFETIME profit vs your first coin (startGp persists across reloads), NOT session-scoped — labelled as such in the tooltip so it doesn't masquerade as a per-session figure.
- Rendered as a small ↑/↓ badge in the existing WealthPanel header beside "net" — green `.pct.up` / red `.pct.down`. Integrated there rather than as a new panel to avoid duplicating the worth surface (the 13g lesson: competing displays of the same concept confuse).
- At-risk expedition loot is excluded because `worth` already excludes it (unbanked = not yours yet) — the tooltip says so.

## Outcome
- `game.ts`: `returnOnStake` + `StakeReturn` interface.
- `WealthPanel.tsx`: the return badge in the header.
- `styles.css`: `.stakeret`.
- Tests (+5): `returnOnStake` (gain, loss, break-even=up, zero-stake guard) + WealthPanel renders "+100%" for worth 2× stake.

## Gates
- [x] returnOnStake correct across gain/loss/break-even/zero-stake (4 unit tests)
- [x] badge renders in WealthPanel (render test)
- [x] UI suite (251, +5) + e2e (9) green; typecheck clean
- [x] UI-only — no engine change, no engine.js rebuild, **no new redeploy** (batch stays 12b+13d+13e+13f)

## Follow-ups
- Other Explore-found trading gaps: highlight underwater positions in PositionsPanel; a per-flip round-trip trade journal; an affordability lens on TopFlips ("flips I can do now").
- Optional: a session-scoped (this-load) P&L using a captured baseline (like the 12w daily-best ref) — distinct from this lifetime figure.
