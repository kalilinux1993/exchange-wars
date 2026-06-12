# Phase: Exchange Wars — Phase 15m: Daily-Streak Celebration (Brick 195)

**Started:** 2026-06-12
**Closed:** 2026-06-12
**Hat:** Builder (UI — retention / celebration)
**Goal:** Celebrate keeping your daily streak alive — a "🔥 N-day daily streak!" toast when the
streak extends — the daily-engagement counterpart to the level-up / best-haul / region-unlock toasts.
**Done condition:** Loading today's daily on a consecutive day fires a streak toast (with a "new
best!" flag when it sets a record); the first day and a broken streak stay quiet; suite + e2e green.

## Why this brick
The daily streak is tracked and SHOWN (a 🔥 count tag + a FOMO "keep your streak" nudge), but
EXTENDING it passes silently — the count just ticks up. A toast on the moment you keep it going is
the positive-reinforcement half of the streak loop (the nudge is the FOMO half). Fresh subsystem
(retention) after a market/icon run; reuses the celebration pattern.

## Design — pure helper in the existing streak effect
- `streakCelebration(prev, next)` (game.ts, pure) → `{ count, best } | null`: fires only when the
  streak GREW to ≥2 (a genuine continuation — NOT the first day, count 1, nor a reset-to-1 break);
  `best` flags `next.count >= next.best` (a new personal record).
- App's streak effect already computes `next = bumpStreak(...)` and writes it when it changed; add
  `const cel = streakCelebration(streak, next); if (cel) setToast(...)` before the write. The
  celebration fires at most once per UTC day (bumpStreak is idempotent per day).

## Scope (in)
- `game.ts`: `streakCelebration` helper
- `App.tsx`: toast in the existing streak effect
- `app.test.tsx`: `streakCelebration` unit (continuation / new-best / first-day / break)

## Scope (out)
- No change to the 🔥 tag, the FOMO nudge, or `bumpStreak`; no per-milestone tiers (every continuation
  ≥2 celebrates — it's once/day, a daily beat); no engine change

## Subsystems touched
- packages/ui/src/game.ts
- packages/ui/src/App.tsx
- packages/ui/test/app.test.tsx

## Gates
- [x] `streakCelebration`: grew 2→3 → {3, best:false}; 5→6 → {6, best:true}; first day & reset-to-1 → null
- [x] UI suite (338, +1) + e2e (9) green; typecheck clean
- [x] UI-only — no engine change, no engine.js rebuild, no redeploy (batch stays 12b+13d+13e+13f+13r+14j)

## Open questions
- The App-effect wiring is covered by the pure helper test + the proven streak effect (idempotent
  per day) — honest coverage accounting; a full daily-rollover App test is clock-bound and skipped.
