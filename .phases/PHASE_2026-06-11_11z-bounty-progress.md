# Phase: Exchange Wars — Phase 11z: Bounty Progress Bar & Reward-Per-Kill (Brick 104)

**Started:** 2026-06-11
**Closed:** 2026-06-11
**Hat:** Builder (Bounty Board — glanceable progress + value metric)
**Goal:** Add a visual progress bar and a reward-per-kill figure to the Bounty Board. UI-only, live on main.
**Done condition:** kill-order progress shown as a bar (gold → green when claimable) + "≈{reward/qty}/kill"; suite + e2e green. **MET.**

## Outcome
- `components/BountyBoard.tsx`: a `.bountybar` fill (`pct = kills/qty`) under each bounty's info, gold normally and green (`.bounty.done`) when claimable; "(≈{round(rewardGp/qty)}/kill)" added to the info line. Pure arithmetic over `killsByMonster` + bounty fields already in `game.world`.
- `styles.css`: `.bountyinfo` block + `.bountybar`/fill, green fill when done.
- Brings the two side-boards (contracts 11y, bounties 11z) to parity with the core panels on decision-info.
- Tests: render — bounty 2/4 slain, reward 2000 → "≈500/kill" + bar fill width 50%. 279/279 unit (+1), 9/9 e2e. No engine change, no fn redeploy. FINDINGS #138.

## Gates
- [x] Progress bar + reward-per-kill render at the right values (render test)
- [x] Suite + e2e green
- [x] No engine change → verify-score redeploy not required
