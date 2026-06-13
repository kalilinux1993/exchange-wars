# Next Content — ready-to-implement engine batch (Jesse-gated)

> **Status:** design only. Every item here is **replay-affecting** (changes `hashState`), so it MUST ship
> WITH the verify-score redeploy (see the checklist at the bottom) — do NOT merge to `main` piecemeal, or the
> deployed edge function will reject every new sprint. Numbers are calibrated to the existing curve
> (`packages/engine/src/quest.ts`) and are starting points — run the market/balance gates and re-tune.
>
> **Note on the "defensive brew":** already DONE — `divine_bastion_potion_4` (+10 def, quest.ts:61) and
> `goading_potion_4` (+10 atk, :64) both ship. The parked item is the defensive **altar event** (Batch B), the
> true inverse of the Blood Altar (which gives Attack). The boost MATRIX gap is an event, not a consumable.

The existing curve, for reference (id: hp/atk/def · region):
- r0 plains: giant_rat 8/3/0, goblin 12/4/1 — r1 sewers: +skeleton 22/7/3 — r2 edgeville: +hill_giant 35/9/4
- r3 brimhaven: +moss_giant 45/11/6 — r4 wilderness: lesser_demon 70/16/9 · **Skarn 130/24/13** (elite)
- r5 maw: green_dragon 110/24/12 · **Vorkanth 180/30/16** — r6 inferno: fire_giant 85/19/11 · **Zukrath 260/36/20**
- r7 abyss: abyssal_demon 130/30/18 (leech) · **Vessith 300/40/22** (leech)

Elites spawn via `region.elite` + `ELITE_CHANCE` (0.1) — quest.ts:87, commands.ts:330. Regions 0–3 have NO
elite today; that's the gap Batch A fills.

---

## Batch A — named elites for the shallow regions (0–3)

Give each early region a named boss, slotting cleanly UNDER Skarn (r4, atk 24) so the elite ladder is
continuous from r0. Two are canonical OSRS shallow bosses (Obor, Bryophyta); r0/r1 are invented to fit.

| region | id / name | hp | atk | def | gp | drops (chance) | notes |
|---|---|---|---|---|---|---|---|
| r0 lumbridge_plains | `grubfoot` — Grubfoot the Gluttonous (goblin chieftain) | 30 | 7 | 2 | [60,200] | adamant_dart 0.4 · law_rune 0.2 | first taste of an elite; barely above a goblin |
| r1 varrock_sewers | `bonelord` — The Bone Lord (skeleton champion) | 44 | 10 | 4 | [120,350] | law_rune 0.5 · rune_sq_shield 0.06 | first gear-dropping elite |
| r2 edgeville_dungeon | `obor` — Obor, the Hill Titan | 60 | 13 | 6 | [250,700] | nature_rune 0.6 · rune_full_helm 0.12 · rune_chainbody 0.06 | canonical hill-giant boss |
| r3 brimhaven_caverns | `bryophyta` — Bryophyta, the Moss Mother | 78 | 15 | 8 | [350,950] | blood_rune 0.5 · rune_platebody 0.06 · mystic_air_staff 0.04 | canonical moss-giant boss |

- **Files:** `quest.ts` — add 4 `MonsterDef`s (with `elite: true`); set `elite: '<id>'` on REGIONS[0..3]
  (quest.ts:151-154).
- **Forms:** `MonsterBody` (UI) already derives form by leech/dragonfire/hp (`brute` ≥55 hp, else `critter`) +
  the ★ crown + the new 19s boss aura — these elites render for free (Obor/Bryophyta become brutes; Grubfoot a
  critter). No UI change needed.
- **Balance:** gp ranges mirror the deep-tier "pay in goods, modest coin" rule (FINDINGS #51/#47) — keep item
  drops the value, gp modest. Drop rates here are deliberately HIGHER than deep elites (these are early/easier)
  but on cheaper items, so the EV stays under the dragon farms. Verify no shallow elite out-prints a green
  dragon per the market gate.
- **⚠️ DETERMINISM caveat (FINDINGS #152) — sets the implementation ORDER:** setting `region.elite` inserts an
  `rng.chance(ELITE_CHANCE)` draw in `rollEncounter`, which SHIFTS the rng sequence for that region → every
  fixed-seed assertion that dives there must be re-pinned. `lumbridge_plains` (r0) is the MOST seed-tested
  region in `expedition.test.ts`, so **Grubfoot (r0) is the costliest to add** and **Obor (r2)/Bryophyta (r3)
  the cheapest** (lightly tested). Recommended order: r2 → r3 → r1 → r0, re-pinning expedition tests at each
  step. This is mechanical test reconciliation, not a logic risk — budget for it, don't skip it.

---

## Batch B — a defensive altar event (the Blood Altar's true inverse)

Today `forge` (gp→+atk) and `altar` (hp→+atk) both boost **Attack**; the def side of the matrix is empty for
events (only the `divine_bastion_potion_4` brew gives def). Add a **`ward`** event: spill HP for a dive-long
**Defence** boost — the defensive Blood Altar.

- **Mechanic:** `ward` — "a warding sanctum hums — spill `WARD_HP` health for +`WARD_DEF` Defence the rest of
  this dive?" Sets `exp.boost.def` (composes with brews/forge/altar; deepest drink/boost wins per the existing
  refresh rule). Refused or insufficient hp → no-op with a journal line, mirroring `altar` (commands.ts:727-737).
- **Constants:** mirror `BLOOD_HP`/`BLOOD_ATK` — propose `WARD_HP = BLOOD_HP` (same hp price), `WARD_DEF`
  slightly LOWER than `BLOOD_ATK` (def is worth more per point in the damage formula — `floor(def/4)` off every
  hit — so price parity would over-deliver; start `WARD_DEF = round(BLOOD_ATK * 0.6)` and tune).
- **Gating:** add `if (rIdx >= 2) kinds.push('ward');` alongside forge/altar (commands.ts:378-379) — defence
  matters once foes hit hard.
- **Files:** `quest.ts` — add `'ward'` to `EventState['kind']` + the constants; `commands.ts` — the intro
  string (the `kind === 'altar' ? ...` chain ~:399), the gating (~:379), and the resolution branch
  (mirror the `ev.kind === 'altar'` block ~:726-737, setting `exp.boost.def` instead of atk). UI: the
  accept-verb map in `ExpeditionPanel` (~:460) — add `ward: 'spill blood'` (or `'kneel'`).
- **Why it's good:** completes the boost matrix (gp→atk forge / hp→atk altar / hp→def ward), and gives a pure
  tank line for the def-heavy survivability reads (19f/g/m) to pay off against.

---

## Batch C — a 9th region (deepest, beyond the Abyss)

A new index-8 region past `the_abyss`, for the most-geared players. **Recommendation: reuse existing goods**
(superior_dragon_bones, dragon gear, prayer regen) so it does NOT add a tradeable item — that keeps the market
re-tune minimal (a new item changes every agent's universe). Flag a new item as an optional bigger swing.

- **Theme:** `the_hollow_crown` — "a throne of cold starlight; what rules here was never alive." Arena theme
  (UI `ARENA_THEMES`, CombatScene): a near-black with a pale-silver rim (distinct from the Abyss's void-purple).
- **Foes (roster):** a regular foe + a named elite, both above Vessith (r7, atk 40):
  - `void_revenant` — 200 hp, atk 34, def 20, gp [400,1100], leech 120, drops superior_dragon_bones 0.4 ·
    dragon_platelegs 0.06. (Leech keeps it a gp-race like the Abyss.)
  - `vessith`-tier elite **`khaal` — Khaal, the Hollow King**: 360 hp, atk 46, def 26, dragonfire true,
    elite true, gp [8000,18000], drops superior_dragon_bones 1.0 · dragon_longsword 0.25 ·
    prayer_regeneration_potion_4 0.4. The hardest fight in the game; the lethality warning (19m) will light up.
- **Files:** `quest.ts` — 2 `MonsterDef`s + a `REGIONS[8]` entry (`monsters: ['void_revenant'], elite: 'khaal'`);
  UI `CombatScene.ARENA_THEMES` + `RegionMap` (renders REGIONS generically, but confirm it handles 9). README
  "eight-region" → "nine-region" (and the Almanac/help copy that names the deepest region).
- **Balance:** the deepest region must be gated behind real gear/levels (the dive-readiness/survivability reads
  already compute this — `diveReadiness` will mark it unreachable until you're strong). Keep gp high but
  goods-dominant; verify the market gate still shows 0 rejected orders + anchored prices on seeds 11/42/1337.

---

## Conservation / determinism checklist (run for the WHOLE batch before redeploy)

1. **Iteration order:** new MONSTERS/REGIONS entries are appended (array order preserved); new event kind pushed
   in the existing rIdx order. No Record iteration without `.sort()`. ✓ by construction — re-verify.
2. **Conservation:** elite/region gp is minted on kill through `state.ledger` (existing path); no new mint/burn
   site. The `ward` event spends HP (not gp/items) → no ledger touch (like the blood altar). New drops are
   existing items → no new mint path. `checkInvariants` must stay green.
3. **Integer gp:** all gp ranges integer; no float. ✓.
4. **Determinism:** same seed + tick count → identical `hashState`. Adding content CHANGES the hash vs today
   (that's the point + the reason for the redeploy). Re-run `determinism.test.ts`, `conservation.test.ts`,
   `manyseed`, `longrun` — they should PASS (self-consistent), just with new baselines.
5. **Market gate:** new elites/region don't add items (per the recommendation), so the agent market universe is
   unchanged → the market-sanity gate should hold. Still: `npm run sim -- --seed 42 --ticks 10000` and confirm
   prices anchored in [cost..value], flipper profitable, 0 rejected, invariants OK; repeat seeds 11/1337.
6. **UI:** MonsterBody/CombatScene/RegionMap render REGIONS/MONSTERS generically — confirm the 9th region and 6
   new monsters render (forms, crown, aura, arena theme) with no hardcoded region count anywhere (grep for `8`,
   `REGIONS.length`, region-index assumptions).

## Verify-score redeploy (the gate — Jesse + `SUPABASE_ACCESS_TOKEN`)
This batch JOINS the already-pending redeploy batch `12b+13d+13e+13f+13r+14j`. After merging the content:
1. `npm run typecheck && npm test` (engine + UI all green with new baselines).
2. `npm run build:fn` (rebuild the bundled engine.js the edge function replays against).
3. `npx supabase functions deploy verify-score --project-ref chynnshtcjclphlazkmv` (needs `SUPABASE_ACCESS_TOKEN`).
4. Push to `main` → CI deploys Pages. The client + the verifier now share the new engine → existing leaderboard
   entries verified under the OLD engine remain valid (they replay their own logged runs); new entries verify
   under the new one. Confirm a fresh sprint submits + verifies end-to-end.
