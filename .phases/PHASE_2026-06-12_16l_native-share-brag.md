# Phase: Exchange Wars — Phase 16l: Native Share for the Brag (Web Share API) (Brick 220)

**Started:** 2026-06-12
**Closed:** 2026-06-12
**Hat:** Builder (UI — social reach / mobile share)
**Goal:** Make the 16k brag chip prefer the native share sheet (`navigator.share`) when available — one tap
to post your run to any app on mobile (the actual viral path) — falling back to the clipboard copy on
desktop/unsupported. Progressive enhancement of the existing button.
**Done condition:** With `navigator.share` present the chip opens the native share with the brag text;
without it, it copies + toasts (16k behaviour); both branches tested; suite + e2e green.

## Why this brick
16k made the brag copyable, but copy is the DESKTOP path — on mobile, where most casual sharing happens,
the native share sheet (`navigator.share`) is one tap to X/WhatsApp/anywhere, the real growth mechanism.
This is the completion of the social loop: same `bragText` payload, routed to the best available share
channel. Durable + platform-agnostic (the Web Share API, not a brittle per-platform intent URL); a tiny
progressive enhancement on the chip already shipped.

## Design — prefer navigator.share, keep clipboard as fallback
- `App.tsx`: rename `copyBrag` → `shareBrag`. If `navigator.share` exists: `navigator.share({ text })`
  (a user cancel rejects the promise — `.catch(() => {})` swallows it; the sheet IS the feedback, no toast).
  Else: the existing clipboard path (navigator.clipboard → `window.prompt` fallback → "Run summary copied"
  toast). The chip's title updated to "share (or copy)".

## Scope (in)
- `App.tsx`: `shareBrag` (native-share-preferred) + the chip title
- `app.test.tsx`: chip COPIES when share is unavailable (jsdom default); chip calls `navigator.share` with
  the brag text when present (mocked)

## Scope (out)
- No per-platform intent URLs (Web Share API is the durable, agnostic path); no image/card share (bigger,
  later); no engine change

## Subsystems touched
- packages/ui/src/App.tsx
- packages/ui/test/app.test.tsx

## Gates
- [x] with `navigator.share` mocked, the brag chip calls it with `{ text: <brag containing "Exchange Wars"> }` and shows no copy toast
- [x] without it (jsdom default), the chip copies + raises the "Run summary copied" toast (16k behaviour preserved)
- [x] UI suite (370, +2: share-path + copy-fallback) + e2e (9) green; typecheck clean
- [x] UI-only — no engine change, no redeploy (batch stays 12b+13d+13e+13f+13r+14j)

## Open questions
- None — `bragText` (16k) unchanged; this only routes its output to the best share channel.
