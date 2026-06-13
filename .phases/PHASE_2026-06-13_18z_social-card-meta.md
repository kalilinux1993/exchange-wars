# Phase: Exchange Wars — Phase 18z: Social-card meta (og:image) for shared links (Brick 286)

**Started:** 2026-06-13
**Hat:** Builder (social/distribution — make shared links preview as branded cards)
**Goal:** The game's viral loop shares its URL (brag / challenge / duel links, 16k–16t), but the page had no
Open Graph / Twitter meta — so a shared link rendered as a bare URL with no preview. Add OG + Twitter tags
with a real 1200×630 og:image (the deployed game capture), so every shared link previews as a branded card
(title · description · screenshot). Captured the og:image via the existing on-demand screenshot e2e.
**Done condition met:** yes — the served page exposes og:title/og:description/og:image (→ /og.png) +
twitter:card=summary_large_image; the 1200×630 og.png shows the "Exchange Wars" masthead + the terminal;
an e2e asserts the meta is served; suite + e2e green.

## Why this brick
The whole social/retention loop the game invested in — `bragText`, `challengeLink`, the duel (16k–16t) —
works by sharing the deployed URL. But `index.html` had only a title + favicon: no `og:*`, no description,
no `twitter:*`. So a shared challenge/brag link on Discord/Twitter/iMessage rendered as a bare URL — no card,
no image, no hook — undercutting the viral pull. Adding the social-card meta (with the game screenshot as a
proper 1200×630 og:image) makes every shared link a branded preview, directly amplifying the loop. This is
genuine distribution value (not polish) on a share-driven game, and UI-only (index.html + a deployed asset).

## Design — OG/Twitter meta + a captured og:image
- `index.html`: a richer `<title>`, a `<meta name="description">`, OG tags (type/url/title/description/image
  + image width/height), and Twitter `summary_large_image` tags. `og:image`/`twitter:image` →
  `https://kalilinux1993.github.io/exchange-wars/og.png` (absolute, as crawlers require).
- `public/og.png`: a 1200×630 capture of the top-of-Exchange (masthead title + the terminal) — the standard
  OG ratio. Captured by extending the on-demand `SCREENSHOT=1` e2e (regenerates with the README shot), so it
  stays current with the UI.
- `e2e/game.spec.ts`: a test asserting the served page carries `og:image`(→/og.png), `og:title`, and the
  `summary_large_image` twitter card.

## Scope (in)
- `packages/ui/index.html`: description + OG + Twitter meta
- `packages/ui/public/og.png`: the deployed 1200×630 social card
- `packages/ui/e2e/game.spec.ts`: capture og.png (on-demand) + a meta-present assertion

## Scope (out)
- No app/logic change; no engine change → no redeploy. (og:image URL is the known production GitHub Pages URL.)

## Subsystems touched
- packages/ui/index.html, packages/ui/public/og.png, packages/ui/e2e/game.spec.ts

## Gates
- [x] served page has og:title/description/image (→/og.png) + twitter:summary_large_image — e2e asserts it
- [x] og.png is a 1200×630 branded card (masthead "Exchange Wars" + terminal) — screenshot-verified
- [x] UI suite (453) + e2e (12, +1 meta test) green; typecheck clean
- [x] UI-only — no engine change, no redeploy (batch stays 12b+13d+13e+13f+13r+14j)

## Open questions
- None — verify post-deploy that /og.png + the meta serve at the production URL.
