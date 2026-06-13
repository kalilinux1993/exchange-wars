# Phase: Exchange Wars — Phase 18q: `f` fights a round (complete keyboard-playable combat) (Brick 277)

**Started:** 2026-06-13
**Hat:** Builder (input/UX — close the last keyboard-playability gap)
**Goal:** Bind `f` to "fight one round" during combat, so the adventure loop is fully keyboard-playable —
trade (/ j/k b/s Enter), embark (←/→ Enter), and now combat (f) — without reaching for the mouse. Gated to
the visible Adventure tab + an active fight + not-typing, like the other key layers.
**Done condition:** pressing `f` on the Adventure tab during combat issues a `fight` command; it does nothing
off-tab, out of combat, or while typing; help documents it; suite + e2e green.

## Why this brick
Keyboard control is an established theme: the trade loop (`/` find → j/k walk → b/s side → Enter submit → w
watch) and the embark flow (←/→ pick region → Enter embark, 14w) are fully keyboard-driven — but combat is
the one place you MUST mouse (fight/flee/eat are click-only). `f` = one fight round (the core, non-destructive
combat verb; "fight it out" auto-resolve + flee + eat stay on the mouse — flee/eat are destructive/ambiguous
as single keys) completes "play the dive from the keyboard." Small, but it finishes a deliberate arc rather
than adding a new one. The reference-verify seam is now exhausted (18g/18o/18p fixed the 3 predictor desyncs;
worthBreakdown verified sound-by-residual-construction; at-risk loot already surfaced) — so this closes the
last open keyboard gap as the cleanest remaining UI completion.

## Design — an active-gated combat keydown
- `ExpeditionPanel.tsx`: add an `active?: boolean` prop (Adventure tab visible). A window `keydown` listener
  (refs-fresh, like MarketTable's navRef) gated on `active && exp?.combat && !typing && no modifiers`: `f`/`F`
  → `onCommand({ type: 'fight' })`. Mutually exclusive with EmbarkPanel's listener (it gates on `!exp`) and
  the global/Exchange listeners (`f` is unused there; MarketTable/TradeTicket gate on the Exchange tab).
- `App.tsx`: pass `active={room === 'adventure'}` to ExpeditionPanel.
- `HelpOverlay.tsx`: extend the Adventure keyboard line — "…and Enter embarks; in a fight, f swings."

## Scope (in)
- `packages/ui/src/components/ExpeditionPanel.tsx`: `active` prop + the `f`-fights keydown
- `packages/ui/src/App.tsx`: pass `active`
- `packages/ui/src/components/HelpOverlay.tsx`: document `f`
- `packages/ui/test/app.test.tsx`: `f` in combat → fight; gated off out-of-combat / inactive / typing

## Scope (out)
- No flee/eat hotkeys (flee is destructive, eat is ambiguous with multiple foods — both stay deliberate clicks); no engine change → no redeploy

## Subsystems touched
- packages/ui/src/components/ExpeditionPanel.tsx
- packages/ui/src/App.tsx
- packages/ui/src/components/HelpOverlay.tsx
- packages/ui/test/app.test.tsx

## Gates
- [x] `f` (Adventure tab, in combat) → `fight` command; off-tab (active=false) + out-of-combat → no-op — render tests
- [x] help documents "in a fight, f swings a round"; UI suite (450, +2) + e2e (11) green; typecheck clean
- [x] UI-only — no engine change, no redeploy (batch stays 12b+13d+13e+13f+13r+14j)

## Open questions
- None — mirrors the established active-gated, refs-fresh, typing-guarded keydown pattern (MarketTable/EmbarkPanel).
