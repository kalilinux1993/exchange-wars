# Phase: Exchange Wars — Phase 17b: Fix Dragon Slayer to need an actual dragon kill (Brick 236)

**Started:** 2026-06-12
**Hat:** Maintainer (correctness — a deed that fires without the deed being done)
**Goal:** `dragon-slayer` ("Dragon Slayer — The Maw is quieter now") currently fires off
`ledger.itemsMinted['superior_dragon_bones'] > 0`, but a PRODUCER mints those bones within ~ticks of world
creation (measured 0→64 by tick 100), so the deed auto-completes (and mis-toasts) seconds into every world
with no dragon slain. Re-key it on an actual dragon kill (`killsByMonster`).
**Done condition:** A ticked world that has minted bones but killed no dragon does NOT latch dragon-slayer;
a green/lava dragon kill DOES; suite + e2e green.

## Why this brick — and why it's NOT Jesse-gated after analysis
17a logged this as "Jesse-gated (changes when a deed fires / save-compat)." On analysis it's a SAFE bug-fix,
not a balance decision: `checkMilestones` only evaluates UNLATCHED deeds, so every existing save that already
has dragon-slayer latched KEEPS it untouched — only NEW games get the corrected behavior, which is strictly
more correct. Deeds are UI-only (`game.milestones`, not WorldState), so no verified-score impact, no redeploy.
The deed's name + flavor ("The Maw is quieter now") unambiguously intend a dragon kill; the `itemsMinted`
check was a wrong proxy (its comment "Only dragons mint superior dragon bones" is violated by the producer
economy). Fixing a clear bug to match stated intent is maintenance, not a design call. CLAUDE.md: fix root
causes, don't leave band-aids.

## Design — re-key on killsByMonster for the dragon ids
- `game.ts`: `DRAGON_IDS = MONSTERS.filter(m => m.id.endsWith('_dragon')).map(m => m.id)` (green_dragon,
  lava_dragon — self-maintaining if a new `*_dragon` is added). `dragon-slayer.achieved` →
  `DRAGON_IDS.some(id => (killsByMonster?.[id] ?? 0) > 0)`.

## Scope (in)
- `game.ts`: `DRAGON_IDS` const + `dragon-slayer.achieved` re-key
- `app.test.tsx`: update the pinned deed test (3434-5: bones→kill); a regression test (bones-but-no-kill ≠ deed);
  fix the now-stale 17a comment

## Scope (out)
- No change to any other deed; no engine change — no redeploy
- Not touching `superior_dragon_bones` minting (the producer economy is correct; only the DEED's proxy was wrong)
- DRAGON_IDS excludes the dragon-ELITE Vorkanth deliberately — a player reaching Vorkanth has slain green
  dragons first (same Maw pool), so the literal dragons suffice and keep the rule unambiguous

## Subsystems touched
- packages/ui/src/game.ts
- packages/ui/test/app.test.tsx

## Gates
- [x] dragon-slayer: bones-minted-but-no-kill (200-tick world) → NOT latched; a green/lava dragon kill → latched
- [x] existing dragon-slayer deed test updated (bones→kill) + away-deed comment fixed; new regression test added
- [x] UI suite (397, +1) + e2e (9) green; typecheck clean
- [x] UI-only — no engine change, no redeploy (batch stays 12b+13d+13e+13f+13r+14j)

## Open questions
- None — the fix matches the deed's stated intent; latched saves are unaffected.
