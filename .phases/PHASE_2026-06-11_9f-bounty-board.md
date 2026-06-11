# Phase: Exchange Wars — Phase 9f: The Bounty Board (Brick 32)

**Started:** 2026-06-11
**Closed:** 2026-06-11
**Hat:** Builder (the last bridge between rooms: market posts goals, dungeon fulfils, ledger pays)
**Goal:** Kill bounties: the realm posts "slay N of monster M before tick T" on a fixed cadence (600 ticks, ≤2 open, 2,400-tick lifetime) from a DERIVED rng stream (pure fn of seed+tick — zero world-cursor draws, no universe re-roll, FINDINGS #29 dodged by construction). Rewards ≈ 2× corpse coin, minted on claim. Baselines snapshot killsByMonster at posting — old kills earn nothing.
**Done condition:** spawner + claim command + board UI + deed shipped with tests (twin-world determinism, baseline honesty, mint booked); guide drift fixed (region count now an IMPORT); suite + e2e green; fn redeployed. **MET.**

## Outcome
- engine: Bounty type, spawner in tickWorld, claimBounty command (unknown/expired/unfilled rejections), stats.bountiesClaimed.
- ui: BountyBoard panel in Adventure (progress x/y, claim chip, ticks left); Bounty Hunter deed (5 claims, progress).
- guide: REGIONS.length + last-region name imported (the "seven regions" lie fixed; countables must be derived — #58 upgraded); Abyss drain + swordmaster/toll-keeper lines added.
- 182/182 unit; 9/9 e2e; fn redeployed (82.8kb). FINDINGS #66.

## Gates
- [x] Zero world-cursor draws (twin-world identical postings tested)
- [x] Baseline honesty (pre-posting kills rejected as unfilled)
- [x] Suite + e2e green; fn redeploy
