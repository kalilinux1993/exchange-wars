# Phase: Exchange Wars — Phase 20b: ARIA live regions for transient feedback (screen-reader a11y) (Brick 314)

**Started:** 2026-06-13
**Hat:** Builder (accessibility — WCAG 4.1.3 Status Messages; the dimension the 18q–v sweep + 20a didn't cover)
**Goal:** Feedback that appears WITHOUT a focus change is invisible to screen-reader users unless it's in an
ARIA live region. Today only the corrupt-save bar + ErrorBoundary have `role="alert"`; the core transient
feedback has none — the **toast** (every deed/fill/levelup/streak/record celebration), the **trade result**
(rejected / filled / resting in the ticket), and the **away digest** ("while you were away…"). A SR user
trading or earning a deed hears nothing. Mark these as polite live regions so they're announced.
**Done condition met:** yes — the toast (`role="status"`), the away-digest banner (`role="status"`), and the
trade-result block (a persistent `role="status" aria-live="polite"` container wrapping the reject/filled/
resting `<p>`s, so the live region exists before content changes) announce on appearance; an e2e asserts the
roles; suite + e2e green; typecheck clean.

## Why this brick
Continues the a11y dimension that 20a (motion) reopened — and it's genuinely un-covered (18q–v did
labels/keyboard, not status messages). The toast + trade result are the game's primary action/achievement
feedback; a SR user submitting a flip currently gets no "rejected: insufficient gp" / "filled 5 instantly," and
no "Dragon Slayer" deed announcement. `role="status"` (polite, = `aria-live="polite"` + atomic) is the right
register — important but non-interrupting. The trade result uses a PERSISTENT container (the robust pattern: a
live region must exist before its content changes for reliable announcement across NVDA/JAWS/VoiceOver).

## Design
- `App.tsx`: toast `<div className="toast">` → add `role="status"`. Away digest `<div className="awaybar">`
  (the offline-summary one, ~1208) → `role="status"`.
- `TradeTicket.tsx`: wrap the three result `<p>`s (reject/filled/resting) in `<div role="status"
  aria-live="polite">` so the region is present and announces whichever result renders.
- `e2e/game.spec.ts`: assert `.toast` carries `role="status"` after a deed/celebration fires (or assert the
  ticket result region role after a trade) — pin the live-region wiring.

## Scope (in)
- `packages/ui/src/App.tsx`: role on toast + away digest
- `packages/ui/src/components/TradeTicket.tsx`: live-region wrapper on the trade result
- `packages/ui/test/app.test.tsx` and/or `e2e/game.spec.ts`: assert the live-region roles

## Scope (out)
- No `role` on the challenge CTA (navigable content, not a status message) or the per-slice catch-up PROGRESS
  bar (updates every slice → would spam a SR); no `role="alert"` (assertive) — polite is right for these; no
  engine change → no redeploy

## Subsystems touched
- packages/ui/src/App.tsx · packages/ui/src/components/TradeTicket.tsx · tests

## Gates
- [ ] toast + away digest are `role="status"`; trade result is wrapped in a persistent polite live region
- [ ] a test pins the live-region roles; UI suite + e2e green; typecheck clean
- [ ] UI-only — no engine change, no redeploy

## Open questions
- None — polite live regions on transient feedback is the standard WCAG 4.1.3 remedy.
