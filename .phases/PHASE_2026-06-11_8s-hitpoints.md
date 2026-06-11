# Phase: Exchange Wars — Phase 8s: Hitpoints (Brick 19)

**Started:** 2026-06-11
**Hat:** Builder (completes the 8n stat triangle; queued candidate)
**Goal:** Hitpoints as a third trained stat: hp xp = ceil(damage dealt / 3) (fighting hardens you), level = same sqrt curve, maxHp = 50 + 2×(lvl−1) (246 at 99, ~+20 in a sprint). Every "full health" site honors the trained max: embark clamp, rest regen target, shrine heal, eat cap (CombatState carries maxHp), UI bars and stat line.
**Done condition:** trained maxHp flows through every heal/clamp site with tests (accrual, eat-past-50, regen-to-trained-max, shrine-full); old saves degrade exactly (hp xp absent = level 1 = maxHp 50 = today's behavior); suite + fn redeploy; measured.

## Scope (in)
- quest.ts: CombatLevels.hp, levelsOf, HP_PER_LEVEL/maxHpFor, CombatState.maxHp (+ newCombat param), eat cap
- commands.ts: hp xp accrual + journal level-up, embark clamp, shrine heal, combat seeding
- sim.ts: regen target = trained max
- UI: ♥ stat line entry, hp bars over trained max
- Tests + audit re-measure

## Scope (out)
- New deeds for hp levels (queued)
- 7th region / events / durability

## Outcome
- Shipped: hp xp (ceil(dealt/3)) + level-up journal; maxHpFor through embark/regen/shrine/eat-cap/UI (the five "full" sites); CombatState.maxHp with old-save fallback; ♥ stat line.
- 171/171 (2 new tests); table: naked +4–8k · geared 5k–174k · tail ~244–309k (≤5.6×, healthy). fn redeployed (73.1kb).

## Gates
- [x] Old-save equivalence: hp xp 0 ⇒ byte-for-byte today's numbers — by construction; suite is the proof
- [x] Suite green; fn rebuild + redeploy — 171/171, deployed
- [x] Audit re-measured — recorded in FINDINGS #53
