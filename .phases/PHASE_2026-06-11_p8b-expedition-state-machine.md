# Phase: Exchange Wars — Phase 8b: Expedition State Machine (Expeditions Brick 2)

**Started:** 2026-06-11
**Hat:** Builder (RPG arc)
**Goal:** The expedition lifecycle as commands: six-region node graph, pack escrow, encounters, one-round-per-command combat, keep-3-on-death, loot minting through the conservation ledger, frontier progression — all on a private RNG stream so the market never re-rolls.
**Done condition:** six commands live through applyCommand; conservation holds after every command (gated); identical scripts → identical worlds; market cursor untouched by adventuring; verify-score redeployed in sync; all suites green; CI + live.

## Gates
- [x] expedition.test.ts: 6 tests — escrow/locks/rejections, full clear → loot mint + unlock, death keep-3 + burns, eatFood ledger burn, script determinism (hash-equal), flee + market-cursor-untouched; invariants after EVERY command
- [x] typecheck + 149 unit + 7 e2e green; purity gate passes
- [x] verify-score redeployed (engine bundle 63.9kb, quest-aware)
- [ ] CI green + live verified (checked post-push)

## Note
- Declared retroactively at closeout (second occurrence — watch this).
