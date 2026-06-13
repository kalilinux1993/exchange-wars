# Phase: Exchange Wars — Phase 18h: Confirm a resting order (the silent success case) (Brick 268)

**Started:** 2026-06-13
**Hat:** Builder (trading — close the feedback loop on the most common order outcome)
**Goal:** When a placed offer succeeds but rests (no instant fill — the bread-and-butter flip: a buy below
market / a sell above it), show a "✓ placed — resting on the book" confirmation. Today the ticket confirms
`rejected: …` and `filled N instantly` (trades > 0) but renders NOTHING for the ok-but-resting case.
**Done condition:** a resting place shows the confirmation; a reject/instant-fill still show theirs; a
non-place command (cancel/claim) does NOT show "resting"; suite + e2e green.

## Why this brick
The ticket's bottom feedback covers two of three outcomes: `!ok` → "rejected: {reason}", `ok && trades>0`
→ "filled N instantly". The third — `ok && trades.length === 0` (the order rested) — renders nothing, so
the single most common flipper action (place a maker buy below market) gives no ticket-level acknowledgement;
you infer success only from the slots counter / open-orders panel ticking. Every action should confirm.
The catch: `lastResult` is set for EVERY command (App:729), so a "resting" line keyed on `ok && trades===0`
would false-fire on a cancel/claim/eat. Fix correctly by tagging `lastResult` with its command, and gating
the resting line on `cmd.type === 'place'`. Only TradeTicket consumes `lastResult`, so the shape change is
contained (every test passes it as null).

## Design — tag lastResult with its command
- `App.tsx`: `lastResult` state becomes `{ result: CommandResult; cmd: PlayerCommand } | null`;
  `setLastResult({ result: applyCommand(...), cmd })` (the one call site, :729); reset stays null.
- `TradeTicket.tsx`: prop type updated; the three feedback lines read `lastResult.result.*`; add
  `result.ok && result.trades.length === 0 && cmd.type === 'place'` → `<p className="resting">✓ placed —
  resting on the book</p>`. (A partial fill still shows "filled N instantly" — true; no over-claim.)

## Scope (in)
- `packages/ui/src/App.tsx`: tag `lastResult` with the command
- `packages/ui/src/components/TradeTicket.tsx`: prop reshape + the resting confirmation line
- `packages/ui/test/app.test.tsx`: assert the resting confirmation on the existing "places a resting buy" test;
  confirm a cancel does NOT show "resting"

## Scope (out)
- No partial-fill remainder readout (the filled line stays); no engine change → no redeploy

## Subsystems touched
- packages/ui/src/App.tsx
- packages/ui/src/components/TradeTicket.tsx
- packages/ui/test/app.test.tsx

## Gates
- [x] resting place → "✓ placed — resting on the book" (asserted on the resting-buy test); reject/instant-fill unchanged
- [x] a non-place command (abort) does NOT render the resting line — `cmd.type` gate, asserted on the abort test
- [x] UI suite (438) + e2e (10) green; typecheck clean
- [x] UI-only — no engine change, no redeploy (batch stays 12b+13d+13e+13f+13r+14j)

## Open questions
- None — contained prop reshape (TradeTicket is the only consumer; all tests pass lastResult=null).
