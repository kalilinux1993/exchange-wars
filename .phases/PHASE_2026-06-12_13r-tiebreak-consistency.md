# Phase: Exchange Wars — Phase 13r: Gear Tie-Break Consistency (Brick 148)

**Started:** 2026-06-12
**Closed:** 2026-06-12
**Hat:** Reviewer→Builder (hardening from an adversarial review of the session's equipment work)
**Goal:** Make the gear "best per slot" pickers agree on stat-ties, and stop a code comment from lying.
**Done condition:** `equipBest` and `equipped()` resolve ties by an explicit, order-independent rule (smaller itemId); the misleading comment is corrected; suite + sim + e2e green; engine.js rebuilt. **MET.**

## Why this brick
An adversarial review of the three "best usable gear per slot" implementations (engine `deriveStats` = combat ground truth; engine `equipBest`; UI `equipped()`) found ONE real flaw (A): they break ties by DIFFERENT iteration orders (pack order / GEAR order / inventory order), and the GEAR table has ties — `rune_plateskirt`↔`rune_platelegs` and `dragon_plateskirt`↔`dragon_platelegs` (each pair stat-identical). So `equipBest` could equip a different itemId than the paperdoll preview names. Blast radius is LOW (tied pieces are stat-identical → combat, worth, and the sim hash are unaffected — only which itemId is displayed/worn differs), but the comment at commands.ts:837 *claimed* "identical tie-break to deriveStats", which is false. The review confirmed B/C/D/E SOUND (no conservation, determinism, fallback, or invariant bugs).

## Design — explicit deterministic tie-break, the two item-pickers only
- `equipBest` (commands.ts) and `equipped()` (CharacterPanel.tsx) now pick the SMALLER itemId on equal `atk+def` — order-independent, so they agree regardless of which Record they iterate. The equip action and the paperdoll preview can no longer name different tied pieces.
- `deriveStats` (combat ground truth) is left UNCHANGED: it returns FighterStats, not an item, and tied pieces are stat-identical by construction, so its tie-break is unobservable. Touching it would be engine churn for no behavioural gain.
- The lying comment is replaced with an honest one (explicit smaller-itemId rule; tied gear is stat-identical so combat is unaffected whichever wins).

## Outcome
- `commands.ts`: explicit `score === ... && itemId < cur` tie-break in `equipBest`; corrected comment.
- `CharacterPanel.tsx`: same tie-break in `equipped()`.
- Tests (+2): engine `equipBest` and UI `equipped` both pick `rune_platelegs` over `rune_plateskirt` (the smaller itemId) given both.
- `engine.js` rebuilt (equipBest is replay-affecting).

## Gates
- [x] equipBest + equipped pick the same tied item (smaller itemId) — engine + UI tests
- [x] SIM byte-identical across seeds 42/11/1337 (`fe75df57`/`736171e3`/`01f213c1`) — benchmark never equips, deriveStats unchanged
- [x] engine 141 (+1) + UI 264 (+1) + e2e 9 green; typecheck clean; engine.js rebuilt
- [x] **verify-score redeploy: equipBest tie-break is replay-affecting → joins the batch** (12b + 13d + 13e + 13f + 13r)

## Follow-ups
- If the GEAR table ever gains a non-stat-identical tie, revisit whether deriveStats needs the explicit tie-break too (currently unobservable).
