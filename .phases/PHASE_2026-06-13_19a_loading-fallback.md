# Phase: Exchange Wars — Phase 19a: Branded loading fallback (no blank flash on first paint) (Brick 287)

**Started:** 2026-06-13
**Hat:** Builder (first-impression polish — the very first frame every visitor sees)
**Goal:** Before the JS bundle loads and React mounts, `<div id="root">` is empty — a blank dark screen
(seconds on slow mobile). Add an inline-styled, branded loading fallback ("Exchange Wars" + "opening the
exchange…") inside `#root`; React replaces it on mount. So the first paint is intentional, not "is it
broken?" — especially for the 18z share-link clicks that land here first.
**Done condition met:** yes — `index.html`'s `#root` holds an inline-styled loading card (theme colors, no
bundled-CSS dependency) that React cleanly replaces; the app boots normally (e2e green); suite + e2e green.

## Why this brick
Sibling to 18z (shared links now preview): those links get CLICKED, and the click lands on the deployed
page, whose first frame — before the bundle downloads + React mounts — is a blank `<div id="root">`. On a
cold cache / slow mobile that's 1–2s of blank dark, which reads as "broken/empty," a real bounce risk on the
first impression of a share-driven game. A branded fallback (the masthead title + a one-line cue, styled
INLINE since the CSS bundle isn't applied yet) makes the load feel intentional. `createRoot().render()`
replaces `#root`'s children, so the fallback lives in the HTML and vanishes the instant React paints — zero
JS, zero bundle dependency, removed for free.

## Design — inline-styled fallback in #root
- `index.html`: put a centered, fixed-overlay div inside `<div id="root">` with INLINE styles (bg `#14110d`,
  gold `#d4a937` title in a web-safe serif so it shows before Cinzel loads, dim `#8a6d1f` subtitle in
  monospace). Content: "Exchange Wars" + "opening the exchange…". React's first render replaces it.

## Scope (in)
- `packages/ui/index.html`: the inline loading fallback inside `#root`

## Scope (out)
- No spinner animation dependency / external asset (inline only); no app/logic change; no engine change → no redeploy
- Not e2e-asserting the TRANSIENT state (Playwright waits for full load, by which point React has replaced it) — verified by served-HTML presence + a clean boot

## Subsystems touched
- packages/ui/index.html

## Gates
- [x] `#root` holds an inline-styled branded loading fallback (no bundled-CSS / JS dependency); React replaces it on mount
- [x] the app boots normally — the existing boot e2e (How to Play / masthead) passes, proving React cleanly replaced the fallback
- [x] UI suite (453) + e2e (12) green; typecheck clean
- [x] UI-only — no engine change, no redeploy (batch stays 12b+13d+13e+13f+13r+14j)

## Open questions
- None — `createRoot().render()` replaces `#root`'s children; the fallback is a pure-HTML transient.
