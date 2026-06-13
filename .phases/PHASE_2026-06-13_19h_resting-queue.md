# Phase: Exchange Wars — Phase 19h: queue position on resting offers ("top of book" / "N ahead") (Brick 294)

**Started:** 2026-06-13
**Hat:** Builder (decision-instrument the order book — tell the player WHY a resting offer isn't filling, now, not after 500 ticks)
**Goal:** PlayerPanel shows each resting offer's age + a stale flag (18i), but staleness is purely TIME-based
(≥500 ticks) — a lagging signal that takes 500 ticks to admit "this isn't filling." The immediate, diagnostic
fact is the order's QUEUE POSITION under price-time priority: are you the best-priced on your side ("top of
book") or are cheaper/earlier orders ahead of you (they ALL fill first)? The book (`world.books[id].buys/sells`)
is already sorted by exactly the engine's matching priority (types.ts:92-95), so an order's queue rank is just
its index in that array — authoritative, can't disagree with the engine.
**Done condition met:** yes — a pure `restingQueue(world, order)` returns `{ ahead, gap }` (ahead = index in
the pre-sorted same-side book; gap = distance to the opposing best, the "fills when the market moves to you"
number); PlayerPanel renders "· top of book" / "· N ahead" per resting offer with a tooltip explaining
price-time priority + the gap; tests pin the math + edges; suite + e2e green; typecheck clean.

## Why this brick
A maker who places a limit offer and forgets it has no idea WHY it sits unfilled — is it priced through the
spread, or just behind a queue of cheaper sellers? The stale flag (18i) only fires after 500 ticks and says
nothing about the cause. Queue position is the immediate, actionable answer: "3 ahead → undercut to jump the
queue" vs "top of book → you're best-priced, waiting on a counterparty." It reads the same price-time-sorted
book the engine matches against, so the rank is exact by construction (index = orders that fill before yours).

## Design — index in the pre-sorted book + gap to the touch
- `game.ts` `restingQueue(world, order)`: `book = world.books[order.itemId]`; `sameSide = side==='buy' ? buys
  : sells`; `idx = sameSide.findIndex(id)`; `idx<0 → null` (off-book). `ahead = idx` (the book is sorted
  best-priority-first — types.ts:92-95 — so the count before you IS your index). `gap`: opposing best
  (`buy → sells[0]?.price`, `sell → buys[0]?.price`); `undefined → null` (no counterparties); else `max(0,
  buy ? oppBest−price : price−oppBest)`. Structural `world` param, mirroring `orderAge`. Pure (display read).
- `PlayerPanel.tsx`: per resting offer, `q = restingQueue(game.world, o)`; render "· {q.ahead===0 ? 'top of
  book' : `${q.ahead} ahead`}" with a title explaining price-time priority + (gap===null ? "no counterparties
  yet" : gap>0 ? "priced N over the top bid / under the low ask — fills when the market moves to you or you
  re-price" : "at the touch").

## Scope (in)
- `packages/ui/src/game.ts`: `restingQueue` helper
- `packages/ui/src/components/PlayerPanel.tsx`: the queue badge (+ import restingQueue)
- `packages/ui/test/app.test.tsx`: pin restingQueue (top/ahead, gap both sides, off-book null, no-opp null, tiebreak)

## Scope (out)
- No "≈ticks to fill" projection (needs volume-rate modeling — out of scope, would be a guess); no auto-reprice
  action (the player decides); no change to the stale flag (orthogonal — time vs price); no engine change → no redeploy
- Visible text stays short (queue rank only); the gap + full explanation live in the tooltip

## Subsystems touched
- packages/ui/src/game.ts
- packages/ui/src/components/PlayerPanel.tsx
- packages/ui/test/app.test.tsx

## Gates
- [ ] restingQueue: ahead = index in sorted side; gap = distance to opposing best (both sides); off-book/no-opp → null/null — pinned
- [ ] PlayerPanel renders "top of book" / "N ahead" on resting offers; tooltip carries the gap
- [ ] UI suite (+~1-2) + e2e (13) green; typecheck clean
- [ ] UI-only — no engine change, no redeploy (batch stays 12b+13d+13e+13f+13r+14j)

## Open questions
- None — the book is engine-sorted by matching priority, so index = queue rank exactly; no re-derivation needed.
