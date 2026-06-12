# Phase: Exchange Wars — Phase 12w: New-Daily-Record Celebration (Brick 127)

**Started:** 2026-06-12
**Closed:** 2026-06-12
**Hat:** Builder (retention/juice — a one-time celebration when you beat your daily record)
**Goal:** Fire a "🎉 New daily record!" toast the first time current worth passes the daily best you carried in from a prior session. UI-only, live on main.
**Done condition:** one-time celebration when worth beats the incoming record on the daily; never fires without a real prior record; pure trigger + integration tested; suite + e2e green; no engine change → no redeploy. **MET.**

## Why this brick
The daily-best (12e) shows a passive ▲ at your peak, but a feature-complete game wants positive reinforcement — a *moment* when you actually beat the mark. Beating your own record is one of the stickiest solo retention hooks; it deserves a celebration, not just a quiet indicator.

## The capture subtlety
"Beat your record" needs the record to BEAT, but the daily-best pref updates live (12e maxes it every tick), so by the time worth passes it the pref already equals worth. The fix: capture `incomingBest` ONCE at first render (a ref), before this session's play moves the pref — so it's the genuine prior-session record. Null unless you loaded today's daily already holding a real best (> your starting stake), which also filters the trivial "beat your own startGp" case. A `recordCelebrated` latch makes it fire exactly once.

## Outcome
- `game.ts`: `beatRecord(incomingBest, worth)` → `incomingBest !== null && worth > incomingBest`. Pure (a tie is not a new record).
- `App.tsx`: capture `incomingBest` at mount + a latched effect that fires the toast once when `beatRecord` flips true on the daily.
- Tests (+3): pure `beatRecord` (null / not-beaten / tie / beaten) + two integration cases — celebrates when a seeded prior record is beaten; does NOT celebrate with no prior record. 350/350 unit, 9/9 e2e. FINDINGS #161.

## Gates
- [x] `beatRecord` pure (only a real record, strict >)
- [x] Celebration fires once on beating / never without a prior record (integration tests)
- [x] Typecheck + 350 unit + 9 e2e green
- [x] No engine change → verify-score redeploy NOT required

## Follow-ups
- Celebrate beating your all-time net-worth high too (not just the daily), if it adds without nagging.
