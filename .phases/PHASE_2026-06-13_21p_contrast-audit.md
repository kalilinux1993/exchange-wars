# Phase: Exchange Wars — Phase 21p: color-contrast audit (WCAG 1.4.3) + the one AA-text fix (Brick 334)

**Started:** 2026-06-13
**Hat:** Builder (a11y — the last un-audited dimension: contrast; fix only the clear failure, flag the rest)
**Goal:** Contrast (WCAG 1.4.3) is the one a11y dimension never audited. An OSRS dark/muted palette is exactly
where low-contrast text hides. Compute the ratios for the functional text-on-panel pairs; fix any clear
AA-text failure; respect the art direction for deliberately-faint decorative elements.
**Done condition met:** yes — audit computed (all functional text ≥ AA on the worst-case `--stone-2` panel:
parchment 11.3:1, gold 7.2, rise 9.3, fall 5.05, parchment-dim 5.02); the ONE sub-AA-text spot — the
filter-clear `.filterclear` ✕ at 4.03:1 (an undefined-var fallback `var(--muted,#8a7f66)`) — fixed by
consolidating onto the AA-passing `--parchment-dim` (5.02:1); `.watchstar` (opacity-0.28 hover-reveal) and
`.afford-eta` (4.62:1, AA-pass) left as-is with rationale; suite + e2e green; typecheck clean.

## Design / findings
- Computed WCAG 2.x relative-luminance contrast for the palette text colors against the lightest panel bg
  (`--stone-2` #272117, the worst case). All FUNCTIONAL text passes AA (4.5:1 normal): parchment/gold/
  rise/fall/parchment-dim. Errors (`--fall`) at 5.05:1 — readable. 
- The only AA-TEXT failure: `.filterclear` (the market filter ✕, full opacity) at 4.03:1 — it clears the 3:1
  UI-contrast bar (1.4.11) but not the 4.5:1 text bar. Its color was `var(--muted, #8a7f66)` — and `--muted`
  is NOT defined in :root, so it always used the failing #8a7f66 fallback. Fix = `var(--parchment-dim)` (the
  established AA-passing dim token), which also removes the undefined-var reference.
- NOT touched (with rationale): `.watchstar` uses the same fallback but at `opacity: 0.28` — a DELIBERATELY
  faint hover-reveal star (its comment: "without cluttering 128 rows"); forcing AA would defeat the design
  (an aesthetic/UX call = Jesse's). `.afford-eta` (`var(--dim,#8a8a8a)`) passes AA at 4.62:1 — left as-is.

## Scope (in)
- packages/ui/src/styles.css (`.filterclear` color → `--parchment-dim`)
- FINDINGS.md (the contrast-audit record + the fix)

## Scope (out — explicit non-goals)
- Re-toning the deliberately-faint `.watchstar` or the muted palette broadly (art direction = Jesse)
- No engine change → no redeploy; CSS-only (no JS logic → no new unit test; gates confirm no regression)

## Gates
- [x] `.filterclear` recolored to the AA-passing `--parchment-dim`; audit ratios recorded in FINDINGS #359
- [x] typecheck clean; UI suite 519; e2e 15 (1 on-demand skip)
- [x] UI/CSS-only — no engine change, no redeploy

## Open questions
- A `--muted`/`--dim` token could be DEFINED in :root to kill the remaining undefined-var fallbacks
  (watchstar/afford-eta) — deferred (watchstar's value is intentional; afford-eta passes). Flagged, low value.
