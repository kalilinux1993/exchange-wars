# Phase: Exchange Wars — Phase 12f: Region Conquest Codex (Brick 110)

**Started:** 2026-06-12
**Closed:** 2026-06-12
**Hat:** Builder (RPG progression — give the kill tally a per-region 100%-completion target)
**Goal:** A Hall panel that, per region, shows how much of its native roster (encounter pool + named elite) you've slain, with a 👑 once a region is fully conquered. UI-only, live on main.
**Done condition:** per-region mastery rows (slain/total + bar), 👑 + emerald bar when done, header "N/8 mastered"; pure helpers truth-table-tested; suite + e2e green; no engine change → no redeploy. **MET.**

## Why this brick
Continuing the breadth pivot into the RPG/adventure system. The engine already tracked `killsByMonster` (per-monster lifetime tally) and the bestiary showed flat per-monster counts, but nothing grouped kills BY REGION or gave a completion target. Region mastery — "slay every native foe here" — is the classic 100%-completion hook, and it was entirely missing despite all the data being present. Spoiler-safe: `RegionMap` already renders every region's name (locked ones just get a 🔒) and even names the elites, so listing all 8 regions reveals nothing new.

## Outcome
- `game.ts`: `regionRoster(region)` → pool + elite, deduped & order-stable; `regionMastery(region, killsByMonster)` → `{slain, total, done}` where `done` requires EVERY native foe (incl. elite) slain at least once — a deeper bar than unlocking past the region. Both pure (kills injected); `done` guards `total > 0` so an empty roster is never "done" and the bar never divides by zero.
- `components/ConquestPanel.tsx`: new Hall panel — one row per region (`👑 name … [bar] … slain/total`), gold bar in progress / emerald when conquered, header "N/REGIONS.length mastered". 👑 deliberately distinct from `RegionMap`'s ✓ (which means unlock-cleared, a shallower state).
- `App.tsx`: mounted in the Hall between RecordsPanel and AlmanacPanel.
- `styles.css`: `.conquestbar` (inline 56px bar mirroring `.bountybar`; emerald fill on `.conquest-row.done`).
- Tests (+4): `regionRoster` (pool, pool+elite, dedupe) + `regionMastery` (none / partial / elite-still-alive / all-done / empty-roster) + a ConquestPanel render (slay region 0's whole roster → 👑 + "1/8 mastered"). 304/304 unit, 9/9 e2e. FINDINGS #144.

## Gates
- [x] `regionRoster` / `regionMastery` pure truth tables (incl. elite-gating "done" and empty roster)
- [x] ConquestPanel crowns a fully-slain region + counts mastered (render test)
- [x] Typecheck + 304 unit + 9 e2e green
- [x] No engine change → verify-score redeploy NOT required

## Follow-ups
- Per-region roster glyphs (lit when slain, dim "?" when not) for an at-a-glance which-foe-is-left, reusing MonsterGlyph — bigger, optional.
- A "realm conquered" milestone/deed when all 8 regions hit 👑.
