# Phase: Exchange Wars — Phase 19v: leaderboard integrity audit (anti-cheat) — SOUND (Brick 308)

**Started:** 2026-06-13
**Hat:** Auditor (security/integrity — "can a player submit a score they didn't earn?" on the PUBLIC board)
**Goal:** The verified leaderboard is the one place real adversaries (cheaters) attack, and it had never been
adversarially audited. Trace the score-submission path end-to-end (client log → verify-score Edge Function →
`verifySprint`/`replayRun` → DB upsert) and find any forge/inflate vector. Read-only audit.
**Done condition met:** yes — audited; verdict SOUND, no actionable hole; evidence + the one accepted
limitation logged to FINDINGS.

## Findings (verdict: SOUND)
Integrity rests on "recompute, don't trust," and it holds at every step:
1. **Server recomputes** the score — `verifySprint(seed, HUMAN_START_GP, log)` → `verdict.worth`; the
   client-claimed score is never read (index.ts:60-61). ✓
2. **Bounded horizon** — `replayRun(..., SPRINT_TICKS=2000)` runs EXACTLY 2000 ticks regardless of the log; a
   command at `tick ≥ SPRINT_TICKS` is rejected (`bad-tick`), so you can't buy more time (replay.ts:57/62/90). ✓
3. **Start fixed server-side** — `HUMAN_START_GP` is a server constant, not client input (index.ts:16/60). ✓
4. **Log validated** — length ≤ `SPRINT_MAX_COMMANDS`, every tick in `[0, SPRINT_TICKS)`, tick-ordered
   (replay.ts:54-60). ✓
5. **Auth required** — no JWT → 401; the row is keyed to `user.id`; service role is the only writer (index.ts:41-43/64). ✓
6. **Live == replay** — `newGame` sets `human.policy='idle'` (game.ts:2186), identical to `replayRun`
   (replay.ts:84); `actAgent` routes idle players to the upgrade-gated Clerk only (not the scripted-flipper
   test bot), and `tickWorld` re-derives that Clerk deterministically — so a legit run reproduces bit-for-bit.
   The `'scripted-flipper'` default (sim.ts:105) is the headless test bot, overridden in BOTH UI and replay. ✓
7. **Seed mismatch self-defeats** — a log recorded on seed A claimed under seed B replays in B's (different)
   market → commands mis/reject → low worth → no inflation. Per-seed boards are by design (challenge links). ✓

**Accepted limitation (not a hole):** a player could submit a log they didn't personally devise (copy a
high-scoring log for a seed). But that log legitimately replays to its worth — it's strategy plagiarism, not
score inflation, and is inherent to any determinism-verified board (the game even SHARES seeds via challenge
links). The board ranks verified worth; a copied run yields the same worth, ranked once per user per seed.

## Scope (in)
- Read-only audit of `supabase/functions/verify-score/index.ts`, `packages/engine/src/replay.ts`, the
  `policy`/`actAgent` live-vs-replay parity, and the DB upsert path.
- `FINDINGS.md` entry; a NEXT_STEPS Quality line.

## Scope (out)
- No code change (audit found it sound); no engine/edge change → no redeploy.

## Gates
- [x] end-to-end submission path audited; recompute/bounded/auth/parity verified; verdict + limitation logged
- [x] docs-only — suite/bundle unchanged

## Open questions
- None — the anti-cheat is sound; the one limitation is inherent and accepted.
