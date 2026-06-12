# Phase: Exchange Wars — Phase 13d: Clerk Gear-Safety (User Bug Fix) (Brick 134)

**Started:** 2026-06-12
**Closed:** 2026-06-12
**Hat:** Reviewer/Builder (fix a CRITICAL user-reported bug — the clerk sells gear the player bought to equip)
**Goal:** Stop the autoFlip clerk from selling items the human bought manually (gear to equip, accumulations) — only liquidate its OWN flip-stock. ENGINE change. **Reference-verified first.**
**Done condition:** the clerk leaves player-bought items alone; benchmark/balance/sim unchanged; engine.js rebuilt; suite + e2e + sim green; redeploy flagged. **MET.**

## The user report
"The inventory just says 'empty satchel' and never changes; I buy upgrade gear and the clerk sells it before I can equip it."

## Root cause (investigation, verified against the engine)
Buys correctly credit `agent.inventory` (`exchange.ts:139,164`) and `playerView`/PlayerPanel are fine — NOT the bug. The bug: the clerk (`runFlipper` in `agents.ts`) sold EVERYTHING held with no ownership check (`agents.ts:386`, only gate "held ≥ 1"). The clerk shares the player's inventory + runs inside `tickWorld`, so any item the player bought — gear especially — got listed + sold within a cadence tick. The satchel looked "always empty" because the clerk dumped it.

## Fix — basis ownership, NOT a gear blocklist
First attempt (exclude GEAR from the clerk) BROKE the balance gate: gear-flipping was legit clerk profit; tier-3 seed-99 went −4436. Reverted. The real fix uses what the clerk already tracks: it records a **cost `basis`** for everything IT buys (and clears it on full exit), so a held item WITHOUT a basis was bought by the HUMAN. Two gates, both keyed on that:
- **Sell gate** (`agents.ts:391`): `if (basis === undefined) continue` — never list an item the clerk has no basis for.
- **Buy gate** (`agents.ts:418`): don't START a flip on an item the player already holds without a clerk basis (so the clerk never acquires a basis on the player's goods and then dumps them).

Both are **no-ops for the benchmark** — it only ever holds its own buys (which carry a basis) — so the sim is BYTE-IDENTICAL (seed 42 hash `fe75df57`, unchanged) and the balance/sanity gates pass untouched. The human's manual holdings (gear, accumulations) are now fully protected.

## Outcome
- `agents.ts`: the two basis gates in `runFlipper` (shared by benchmark + human clerk; the gates only fire for basis-less holdings, which only the human has).
- `automation.test.ts` (+1): GEAR-SAFETY — an idle player with autoFlip + 1 manually-acquired `rune_2h_sword` (no basis) still holds it after 3000 ticks. (Test mints the gear through the ledger so conservation holds.)
- `engine.js` rebuilt (89.3kb) for the verifier.

## Gates
- [x] Root cause reference-verified (commands.ts:406 / sim.ts:166 / exchange.ts:139,164)
- [x] Clerk leaves player gear alone (engine test)
- [x] Balance gate passes (the first gear-blocklist attempt failed it — the basis approach passes)
- [x] SIM seeds 42/11/1337: 0 rejected, invariants OK, **seed-42 hash unchanged** (benchmark unaffected)
- [x] 131 engine · 360 UI · 9 e2e green; engine.js rebuilt
- [ ] **verify-score redeploy PENDING** — this is a replay-affecting engine change for humans with autoFlip + manual holdings. Batch with the 12b redeploy: `npx supabase functions deploy verify-score --project-ref chynnshtcjclphlazkmv`.

## Follow-ups (Jesse — feature request: OSRS equipment manager)
The user also wants gear "equipped to an equipment manager like OSRS". Today gear is "worn" by packing it for an expedition (auto-equips best per slot). A real equipment-slot UI + a `worn`/equipment field on the agent is a larger engine+UI feature — queued in NEXT_STEPS. The bug fix above unblocks it: gear now SURVIVES in the satchel, ready to pack/equip.
