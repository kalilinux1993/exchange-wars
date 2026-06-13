# Phase: Exchange Wars — Phase 17q: Keyboard speed control (, / .) (Brick 251)

**Started:** 2026-06-12
**Hat:** Builder (UX — keyboard pacing for the idle loop)
**Goal:** Press `,` to slow down and `.` to speed up the world through the live speeds (1×→5×→20×), clamped.
`p` already pauses/resumes; this completes keyboard control of the core pacing without reaching for the
mouse. Deliberately NOT another MarketTable addition (the visual pass flagged that table as dense).
**Done condition:** `,`/`.` step the speed through [1,5,20] (clamped); `.` from paused resumes at 1×; not
triggered while typing; suite + e2e green.

## Why this brick
This is an idle game — you watch the market and adjust pace constantly, but speed was mouse-only (the
1×/5×/20× buttons). `p` pauses; `,`/`.` are the natural "slower/faster" siblings (the YouTube/media
convention), so the whole pacing loop is keyboard-driven. Global (any room — speed is global), guarded
against typing like the other shortcuts.

## Design — extend resolveShortcut + a pure stepSpeed
- `keyboard.ts`: `Shortcut += { kind: 'speed'; dir: 1 | -1 }`; `resolveShortcut` maps `,`→dir −1, `.`→dir +1.
  `stepSpeed(current, dir, SPEEDS=[1,5,20])` (pure): step the index within SPEEDS clamped; a non-live speed
  (0/paused or unknown) → faster resumes at SPEEDS[0], slower is a no-op (stays paused).
- `App.tsx`: the keydown handler — `sc.kind === 'speed'` → `setSpeed((s) => stepSpeed(s, sc.dir))`.
- `HelpOverlay.tsx`: add `,`/`.` to the keyboard line.

## Scope (in)
- `keyboard.ts`: `speed` shortcut + `stepSpeed`
- `App.tsx`: dispatch the speed shortcut
- `HelpOverlay.tsx`: document `,`/`.`
- `app.test.tsx`: `stepSpeed` unit (clamp, resume-from-pause, no-op) + `resolveShortcut` maps `,`/`.`

## Scope (out)
- No change to the 1×/5×/20× buttons or `p`; no wrap-around (clamped feels right); no engine change → no redeploy

## Subsystems touched
- packages/ui/src/keyboard.ts
- packages/ui/src/App.tsx
- packages/ui/src/components/HelpOverlay.tsx
- packages/ui/test/app.test.tsx

## Gates
- [x] `stepSpeed`: 1→5→20 clamped both ends; paused + `.` → 1×; paused + `,` → stays; `resolveShortcut` maps `,`/`.`
- [x] UI suite (415, +1 net) + e2e (9) green; typecheck clean
- [x] UI-only — no engine change, no redeploy (batch stays 12b+13d+13e+13f+13r+14j)

## Open questions
- None — extends the resolveShortcut/keydown pattern (1/2/3/p/?) the App already uses.
