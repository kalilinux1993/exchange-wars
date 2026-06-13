# Phase: Exchange Wars — Phase 19d: Surface a failed cloud sync (don't show stale "✓ synced") (Brick 290)

**Started:** 2026-06-13
**Hat:** Builder (data-safety UX — tell the player when their cloud save didn't land)
**Goal:** A cloud push only updates `lastSync` on SUCCESS (App:235-237), so a FAILED push leaves the stale
"✓ synced" badge — the signed-in player believes their latest progress is backed up when it isn't. Track a
`syncFailed` flag and show "⚠ unsynced" on a failed push (clears on the next success), so the cloud-save
state is honest.
**Done condition met:** yes — the AccountBar shows "⚠ unsynced" after a failed push and "✓ synced" after a
successful one; the flag clears on recovery; a render test pins both states; suite + e2e green.

## Why this brick
The cloud sync (`schedulePush` → `pushCloudSave`) debounces a save and, on success, sets `lastSync` → the
AccountBar shows "✓ synced". But on FAILURE the `then((ok) => if (ok) ...)` does nothing, so `lastSync`
keeps its prior value and the badge still reads "✓ synced" — a stale, FALSE reassurance. For a cross-device
cloud-save feature, silent sync failure → the player trusts a backup that's behind → real data loss when they
open another device. Surfacing "⚠ unsynced" the moment a push fails (and clearing it when one succeeds) makes
the save state truthful. UI-only — the backend is Jesse-gated, but the client-side FEEDBACK isn't.

## Design — a syncFailed flag threaded to the badge
- `App.tsx`: `const [syncFailed, setSyncFailed] = useState(false)`; in `schedulePush`'s push result, `if (ok)
  { setLastSync(Date.now()); setSyncFailed(false); } else setSyncFailed(true)`. Pass `syncFailed` to AccountBar.
- `AccountBar.tsx`: optional `syncFailed?`. When signed in: `syncFailed` → "⚠ unsynced" (warn, title explains
  it'll retry as you play); else `lastSync` → "✓ synced". Otherwise unchanged.

## Scope (in)
- `packages/ui/src/App.tsx`: `syncFailed` state + set on push result + pass to AccountBar
- `packages/ui/src/components/AccountBar.tsx`: render the unsynced/synced states
- `packages/ui/test/app.test.tsx`: an AccountBar render test (first one) — unsynced vs synced

## Scope (out)
- No auto-retry-on-idle (the flag clears on the next change-triggered push; the signal is the fix); no "syncing…" pending flash (noisy on a 5s debounce); no backend change → no redeploy

## Subsystems touched
- packages/ui/src/App.tsx
- packages/ui/src/components/AccountBar.tsx
- packages/ui/test/app.test.tsx

## Gates
- [x] syncFailed → AccountBar "⚠ unsynced" (stale "✓ synced" gone); else lastSync → "✓ synced" — render test; App sets the flag on the push result
- [x] UI suite (454, +1 — first AccountBar test) + e2e (13) green; typecheck clean
- [x] UI-only — no engine change, no redeploy (batch stays 12b+13d+13e+13f+13r+14j)

## Open questions
- None — the badge already keys on lastSync; this adds the missing failure state alongside it.
