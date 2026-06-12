# Phase: Exchange Wars — Phase 16q: Export the Run Card (self-contained SVG → share/download) (Brick 225)

**Started:** 2026-06-12
**Closed:** 2026-06-12
**Hat:** Builder (UI — complete the visual-share loop)
**Goal:** Make the Run Card (16o/16p) actually SHAREABLE as a file: a "💾 save" action that exports it as a
self-contained SVG (styles embedded with literal colours + font stacks, so it renders correctly off-page)
via the native share sheet (`navigator.share({files})`) when supported, else a download. The deferred
completion of the social arc — the picture you can post, not just screenshot.
**Done condition:** The Run Card is a self-contained SVG (embedded `<style>`, no page-CSS dependency) with a
save button that shares/downloads it; the share-vs-download decision is unit-tested; suite + e2e green.

## Why this brick
16o shipped the card screenshot-only; the genuine completion is one-click save/share. Chose SVG-not-PNG
deliberately: PNG needs canvas (`Image.onload` → `drawImage` → `toBlob`), which is jsdom-opaque (untestable)
and breaks the every-brick-tested discipline; an SVG Blob needs no canvas — the serialize + share/download
is mostly-testable, and SVG is a real, scalable image format. The cost is making the card SELF-CONTAINED:
its styles must travel WITH it (a standalone SVG has no page `:root`/stylesheet), so the `bc-*` rules move
into an embedded `<style>` with literal hex colours (#e6d8b8 etc.) and font stacks (Cinzel/IBM Plex Mono +
Georgia/Consolas fallbacks that render even without the web fonts).

## Design — embedded styles + a testable share/download helper
- `BragCard.tsx`: move the `bc-*` CSS into an SVG `<style>` (literal colours/fonts; applies on-page AND in
  the exported file); add `xmlns` to the `<svg>` for a valid standalone; a `ref`; a "💾 save" chip whose
  handler serializes the SVG (`XMLSerializer`) into an `image/svg+xml` Blob and calls `shareOrDownload`.
- `shareOrDownload(blob, filename)` (exported, testable): `navigator.canShare?.({files})` → `navigator.share`
  (the modern mobile path); else download via a click-an-`<a>` fallback (browser-only — guarded for jsdom,
  which lacks `URL.createObjectURL`).
- `styles.css`: drop the `bc-*` rules (now embedded); keep `.runcard .bragcard`.

## Scope (in)
- `BragCard.tsx`: embedded `<style>` + `xmlns` + the save chip + `saveCard`/`shareOrDownload`
- `styles.css`: remove `bc-*` (kept embedded in the SVG)
- `app.test.tsx`: `shareOrDownload` shares when `canShare` (mocked); the save chip exists + clicking is jsdom-safe

## Scope (out)
- No PNG/canvas export (jsdom-untestable; SVG is the testable, scalable choice); no engine change

## Subsystems touched
- packages/ui/src/components/BragCard.tsx
- packages/ui/src/styles.css
- packages/ui/test/app.test.tsx

## Gates
- [x] the card SVG carries an embedded `<style>` (literal colours/fonts) + `xmlns` → self-contained (pinned)
- [x] `shareOrDownload` calls `navigator.share({files})` when `canShare` is true (mocked); the save chip click is jsdom-safe (download path guarded)
- [x] UI suite (376, +3) + e2e (9) green; typecheck clean; the existing card-content/byline tests still pass (classes/content unchanged)
- [x] UI-only — no engine change, no redeploy (batch stays 12b+13d+13e+13f+13r+14j)

## Open questions
- None — SVG export sidesteps the canvas-untestability that deferred this in 16o.
