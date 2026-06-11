# Phase: Exchange Wars — Phase 8t: The Inferno Gate (Brick 20)

**Started:** 2026-06-11
**Closed:** 2026-06-11
**Hat:** Builder (content brick — the 99-track region the stat system now justifies)
**Goal:** 7th region beyond the Maw: the Inferno Gate (pyrefiend, lava dragon, elite Zukrath with the prayer-pot jackpot). Everything breathes fire — the 8r antifire ticket is mandatory; long fights make trained stats the real entry requirement.
**Done condition:** region + monsters + elite shipped; elite spawn de-indexed (per-region data); replay-compat verified; deed added; suite + measure + fn redeploy. **MET.**

## Outcome
- REGIONS gains inferno_gate (elite zukrath); dragons_maw declares elite vorkanth — the elite spawn moved off `length - 1` (an index accident that would have silently relocated Vorkanth) to `RegionDef.elite`. Draw-accounting proves old logs replay bit-identically.
- MONSTERS += pyrefiend (runes + dragon darts), lava_dragon (bones 0.35 bid-capped + rare dragon weapons), zukrath (hp 260/atk 36, bones 1.0, prayer pot 0.3, longsword 0.2). dragon_plateskirt (121k) deliberately on no regular table.
- Free by architecture: unlock chain auto-extends; Maw ambushes now pull Inferno beasts; supplies-only caches cover region 6.
- UI: Hellwalker deed (deepest ≥ 6). Harness: fire-country region cap (no potion → farm index 4), Zukrath flee, ticket buying from Maw unlock.
- 172/172 tests (Zukrath spawn scan + elite-field assertions); audit shows d6 routes at stable magnitudes (5k–182k geared); fn redeployed (74.5kb). FINDINGS #54.

## Gates
- [x] Replay-compat of the elite-spawn refactor (draw accounting — same regions consume the roll)
- [x] Suite green; fn rebuild + redeploy
- [x] Audit re-measured (no printer; Gate self-limits via long fights)
