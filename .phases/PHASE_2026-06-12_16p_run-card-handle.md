# Phase: Exchange Wars — Phase 16p: Personalize the Run Card with your handle (Brick 224)

**Started:** 2026-06-12
**Closed:** 2026-06-12
**Hat:** Builder (UI — personalization / shareability)
**Goal:** Put the player's leaderboard handle on the Run Card (16o), so the shareable trophy carries a NAME
— "{handle}'s run" reads and shares far better than an anonymous card.
**Done condition:** When a handle is set (`ew-handle`), the Run Card shows it; with none, the card is
unchanged (no empty label); suite + e2e green.

## Why this brick
16o's card is a strong visual but anonymous — a brag is more compelling with your name on it (it's YOUR
run, not "a run"). The handle the player already set for the leaderboard (`ew-handle`) is the natural
identity; surfacing it on the card ties the social artifact to the competitive identity with no new input.
Small but genuine personalization; the omit-when-empty discipline (16k/16o) keeps a handle-less card clean.

## Design — an optional handle prop + a card byline
- `BragCard.tsx`: add `handle?: string`. When non-empty, render a byline under the wordmark ("— {handle} —")
  and prefix the footer; when empty, neither appears (the card reads exactly as 16o).
- `App.tsx`: pass `handle={localStorage.getItem('ew-handle') ?? ''}` to `<BragCard>` (a cheap sync read;
  the card re-renders with the live game state already).

## Scope (in)
- `BragCard.tsx`: the `handle` prop + byline
- `App.tsx`: thread the handle
- `app.test.tsx`: a handle renders on the card; an empty handle adds nothing

## Scope (out)
- No new handle input (reuse the leaderboard's); no auto image-export (deferred, 16o); no engine change

## Subsystems touched
- packages/ui/src/components/BragCard.tsx
- packages/ui/src/App.tsx
- packages/ui/test/app.test.tsx

## Gates
- [x] a set handle appears on the card (a `.bc-byline` + footer prefix); a whitespace/empty handle leaves the card as 16o (no byline)
- [x] UI suite (373, +1) + e2e (9) green; typecheck clean
- [x] UI-only — no engine change, no redeploy (batch stays 12b+13d+13e+13f+13r+14j)

## Open questions
- None — reuses the existing `ew-handle`.
