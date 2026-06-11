# Phase: Exchange Wars — Phase 7l: Email-Proof Handles

**Started:** 2026-06-11
**Hat:** Builder (privacy fix, per Jesse)
**Goal:** Jesse's email ended up on the public board (fixed by SQL). Systemic fix: handles are sanitized on BOTH ends — anything email-shaped is trimmed to its local part, empty falls back to "anonymous trader" — and resubmitting now updates your handle even without a better score (renames work).
**Done condition:** sanitizeHandle pure+tested; panel hints handles are public; function sanitizes + always-updates handle; function redeployed; gates green; CI + live.

## Scope (in)
- cloud.ts: sanitizeHandle (exported, pure); panel uses it + "public — emails trimmed" hint
- verify-score: same sanitization server-side; not-improved path still updates handle
- Tests; function redeploy

## Scope (out)
- Handle uniqueness/reservations

## Gates
- [ ] typecheck + unit + e2e green; function redeployed + probed
- [ ] CI green + live verified
