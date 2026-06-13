# Phase: Exchange Wars — Phase 19b: Rich PWA-install manifest (screenshots + categories) + validity guard (Brick 288)

**Started:** 2026-06-13
**Hat:** Builder (distribution — complete the install metadata)
**Goal:** Round out the deployed-experience surface (og cards 18z, loading 19a, sound sw): add `screenshots`
(reusing the deployed 1200×630 og.png as the app screenshot) + `categories: ["games"]` to the PWA manifest,
so Chrome's install dialog shows an app-store-like preview instead of a bare entry. Add a manifest-validity
test (parses + asserts the rich fields), since a malformed manifest silently breaks install.
**Done condition met:** yes — manifest has `screenshots` (→ og.png, wide) + `categories`; a test parses the
manifest and asserts validity + the new fields; suite + e2e green.

## Why this brick
The manifest had the essentials (name/short_name/description/icons/display/colors) but no `screenshots` or
`categories` — the fields Chrome's "rich install" dialog uses to render an app-store-style preview (image +
category). For a game someone chooses to install, a richer install prompt is a small but real conversion
plus, and it reuses the og.png I already deployed (18z) — an app screenshot IS what the manifest wants. This
completes the distribution surface (link previews via og + install preview via the manifest). A validity
test is the real guard: a manifest with a JSON typo or a wrong field silently disables PWA install with no
error, so parsing it + asserting the shape in CI catches that.

## Design — additive manifest fields + a parse test
- `public/manifest.webmanifest`: add `"categories": ["games"]` and `"screenshots": [{ "src": "og.png",
  "sizes": "1200x630", "type": "image/png", "form_factor": "wide", "label": "..." }]` (og.png is relative to
  the manifest, like the icon — deployed at the base).
- `app.test.tsx`: read `public/manifest.webmanifest` (fs via import.meta.url), `JSON.parse` it (catches
  malformed JSON), assert name + the screenshot src (→og.png) + categories.

## Scope (in)
- `packages/ui/public/manifest.webmanifest`: screenshots + categories
- `packages/ui/test/app.test.tsx`: a manifest-validity + rich-fields test

## Scope (out)
- No narrow (mobile-portrait) screenshot this brick (wide is a valid default; a narrow capture is a separate asset); no maskable-icon change (the coin SVG isn't designed for the mask safe-zone — would crop). No engine change → no redeploy

## Subsystems touched
- packages/ui/public/manifest.webmanifest
- packages/ui/test/app.test.tsx

## Gates
- [x] manifest parses as valid JSON; has screenshots (src → og.png, 1200×630, wide) + categories ["games"]
- [x] a test parses the manifest + asserts the shape (guards against a silent-install-break typo)
- [x] UI suite + e2e green; typecheck clean
- [x] UI-only — no engine change, no redeploy (batch stays 12b+13d+13e+13f+13r+14j)

## Open questions
- None — additive manifest fields reusing the deployed og.png; the parse test guards validity.
