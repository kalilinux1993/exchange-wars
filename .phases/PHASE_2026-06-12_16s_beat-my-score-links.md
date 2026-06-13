# Phase: Exchange Wars — Phase 16s: "Beat my score" challenge links (Brick 227)

**Started:** 2026-06-12
**Closed:** 2026-06-12
**Hat:** Builder (UI — competitive/viral loop)
**Goal:** Encode the sharer's worth + handle in the challenge link (`#seed=N&w=W&by=H`) so accepting it shows
"⚔ {handle} dares you to beat {worth} on seed N" — turning a "same world" link into a direct DUEL and closing
the brag→duel→brag-back loop.
**Done condition:** Challenge/brag links carry the sharer's worth+handle; an accepting player with a save
sees the target in the challenge bar; the existing bare `#seed=N` link still works; suite + e2e green.

## Why this brick
16k–16r built the social arc (brag, native share, visual card, share-as-file) but a shared link only says
"play this world" — not "beat what I did on it." A claimed score+handle in the link makes every share a
challenge with a TARGET, which is the actual competitive hook (the verified leaderboard is the proof; the
link target is the friendly "can you beat me?"). The natural completion: the brag's own link should challenge
the friend to YOUR number. Fresh competitive mechanic over the existing challenge-link + brag surfaces.

## Design — link builder + tolerant parse + a target in the bar
- `game.ts`: `challengeLink(origin, pathname, seed, worth?, handle?)` → `#seed=N` (+`&w=` int, +`&by=`
  encoded handle when given). `parseChallengeTarget(hash)` → `{worth, handle} | null`. Make
  `parseChallengeSeed` tolerant of trailing params (`^#seed=(\d{1,10})(?:&|$)`). `bragText` takes `handle?`
  and builds its link via `challengeLink` (so the brag IS a duel).
- `App.tsx`: `copyChallenge`/`shareBrag` use `challengeLink` with `playerWorth` + the `ew-handle`; the boot
  effect parses a `challengeTarget` alongside the seed; the challenge bar shows "⚔ {handle} dares you to beat
  {worth} on seed N" when a target is present, else the existing "same world" copy.

## Scope (in)
- `game.ts`: `challengeLink`, `parseChallengeTarget`, tolerant `parseChallengeSeed`, `bragText` handle/link
- `App.tsx`: duel link in copyChallenge/shareBrag, `challengeTarget` state + parse + the bar message
- `app.test.tsx`: link build round-trips through the parsers; `parseChallengeSeed` still parses bare + param'd; the bar shows a target

## Scope (out)
- The link target is CLAIMED, not verified (it's a friendly "beat me", not a leaderboard proof — that stays
  the replay-verified board); no engine change

## Subsystems touched
- packages/ui/src/game.ts
- packages/ui/src/App.tsx
- packages/ui/test/app.test.tsx

## Gates
- [x] `challengeLink` → `parseChallengeSeed`/`parseChallengeTarget` round-trips (seed 777 + worth 12345 + encoded handle); bare `#seed=N` still parses (null target); worth-without-handle valid
- [x] the challenge bar shows "{handle} dares you to beat {worth} gp on seed N" with a target, the plain "same world" copy without; accept/× clear both states
- [x] UI suite (378, +1) + e2e (9) green; typecheck clean
- [x] UI-only — no engine change, no redeploy (batch stays 12b+13d+13e+13f+13r+14j)

## Open questions
- None — claimed-target is the intended (social, not verified) semantics.
