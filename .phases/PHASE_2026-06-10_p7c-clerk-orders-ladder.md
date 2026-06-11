# Phase: Exchange Wars — Phase 7c: Clerk Orders Speak the Ladder

**Started:** 2026-06-10
**Hat:** Builder (post-ladder UI alignment)
**Goal:** The Clerk Orders risk select still offers pre-ladder values (≤8%/≤6%). Post-7b the real choice is whether a senior clerk plays the big ≥5k staples (0.12) or sticks to calm goods (≤0.10). Options become: tier max / no big staples (≤10%) / cheap goods only (≤9%).
**Done condition:** options updated with ladder-language labels; existing configureBot clamp test unaffected; gates green; CI + live.

## Scope (in)
- UpgradeShop risk options: 1 → "tier max", 0.10 → "no big staples (≤10%)", 0.09 → "cheap goods (≤9%)"
- Unit test: selecting an option issues configureBot with the value

## Scope (out)
- Engine changes; capital/focus selects (already aligned)

## Subsystems touched
- packages/ui/src/components/UpgradeShop.tsx, packages/ui/test/app.test.tsx

## Gates
- [x] typecheck + 123 unit + 7 e2e green
- [ ] CI green + live bundle verified (checked post-push)
