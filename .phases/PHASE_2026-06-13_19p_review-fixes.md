# Phase: Exchange Wars — Phase 19p: fix two bugs from the 19e–19o adversarial review (Brick 302)

**Started:** 2026-06-13
**Hat:** Builder (review-driven fixes — the adversarial pass earned its keep again)
**Goal:** An adversarial review of the session's 10 bricks confirmed two real bugs. (1) **Reprice strand
(19i):** the "reprice" buy chip gates only on gp, but the GE buy-limit allowance is counted at placement and
NEVER refunded on cancel (commands.ts:498), so `cancel`→`place` can REJECT on `buy-limit` after the cancel
already fired — stranding the player with NO order. (2) **Away-fill overcount (19l):** the autoFlip Clerk
CANCELS + re-quotes its own orders during offline `runTicks` (agents.ts:342/382), so for a Clerk-active player
a vanished order id is no longer guaranteed to be a FILL — `ordersFilled` counts Clerk re-quotes as fills.
**Done condition met:** yes — the reprice buy chip also requires buy-limit headroom (`buyRemaining ≥ remaining`)
so it never cancels-then-fails; `finishOfflineProgress` suppresses `ordersFilled` (→0) when the Clerk is active
(can't distinguish fill from re-quote; worth Δ already covers the Clerk); tests pin both; suite + e2e green.

## Why this brick
Both are genuine, found by independent review (the 18g precedent: review catches what self-review misses). #1
is a position-loss footgun in the exact failure-atomicity class 19i tried to guard — I closed the gp hole but
missed the buy-limit one. #2 makes 19l's honest fill-count dishonest for the players most likely to be away
(idle/Clerk users); the overcount is bounded by the Clerk's concurrent-flip count, but a fill tally that can
overclaim isn't worth showing — suppress beats lie. (Reviewer's 3rd item — restingQueue.ahead including own
orders — is NOT a bug: an external counterparty fills your higher own-order before your lower one, so your own
higher orders ARE legitimately ahead; self-skip only applies within one match. Logged the minor
repriceTarget-vs-own-order cosmetic edge for later, no churn.)

## Design
- `PlayerPanel.tsx` reprice chip: for a BUY, after the gp gate, also `const left = view.markets.find(m =>
  m.itemId === o.itemId)?.buyRemaining; if (left != null && left < o.remaining) return null;` — buy allowance
  isn't refunded on cancel, so re-placing `o.remaining` needs that much CURRENT headroom or the place rejects.
- `game.ts` `finishOfflineProgress`: `const clerkActive = (game.world.agents[game.playerId]?.upgrades?.
  ['autoFlip'] ?? 0) >= 1;` → `ordersFilled: clerkActive ? 0 : <diff>`. Doc the why on the field + here.

## Scope (in)
- `packages/ui/src/components/PlayerPanel.tsx`: buy-limit headroom gate on the reprice chip
- `packages/ui/src/game.ts`: suppress `ordersFilled` when the Clerk is active (+ doc comment)
- `packages/ui/test/app.test.tsx`: reprice hidden when buy-limit can't fit the re-place; ordersFilled 0 when autoFlip active

## Scope (out)
- No precise Clerk-aware fill count (can't distinguish fill from re-quote without engine support — Jesse-gated);
  no restingQueue/repriceTarget own-order churn (ahead is correct; the self-undercut edge is logged, rare,
  cosmetic); no engine change → no redeploy

## Subsystems touched
- packages/ui/src/components/PlayerPanel.tsx
- packages/ui/src/game.ts (finishOfflineProgress)
- packages/ui/test/app.test.tsx

## Gates
- [ ] reprice buy chip hidden when `buyRemaining < o.remaining` (no strand); SELL/affordable-buy unaffected
- [ ] ordersFilled → 0 when autoFlip ≥ 1 active; still exact for a manual (no-Clerk) player
- [ ] UI suite (+~2) + e2e (13) green; typecheck clean
- [ ] UI-only — no engine change, no redeploy (batch stays 12b+13d+13e+13f+13r+14j)

## Open questions
- Logged: a precise Clerk-aware away-fill count needs an engine-side per-player fill counter (replay-affecting → Jesse + redeploy).
