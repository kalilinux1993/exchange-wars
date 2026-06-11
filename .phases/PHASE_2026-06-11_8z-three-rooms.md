# Phase: Exchange Wars — Phase 8z: Three Rooms (Brick 26, Jesse-directed)

**Started:** 2026-06-11
**Hat:** Builder (Jesse: "two separate pages, maybe more — tab for exchange, tab for adventuring, and other tabs or sub tabs as you see fit")
**Goal:** Tabbed layout, three rooms: 🪙 Exchange (market table + news, ticket + depth ladder, ledger + tape + quartermaster), ⚔ Adventure (expeditions + deeds), 🏰 Hall (shop, fortune chart, sprint board). Header (clock/speed/purse/account) stays global. All tabs stay MOUNTED and hide via CSS — panel state survives switching, and the jsdom suite keeps querying everything. Active tab persists in localStorage. Adventure tab shows a live pip while an expedition is out.
**Done condition:** tabs shipped; e2e updated (Playwright can't click hidden elements — adventure specs click the tab first); suite + e2e green; live verify.

## Scope (in)
- App.tsx tab nav + three board panes; styles.css tab styling + .tabhidden
- e2e: tab clicks where specs cross rooms
- Guide line about the rooms

## Scope (out)
- Camp-meal eating (queued — was about to start when this steer arrived)
- Sub-tabs within rooms (start with three; split further only if a room stays cluttered)

## Outcome
- Three rooms shipped: Exchange (market+news | ticket+ladder | ledger+tape+quartermaster), Adventure (expedition wide | deeds), Hall (clerk's counter | fortune | sprint board). Header global; Adventure tab shows a ● pip while an expedition is out; room persists in localStorage ('ew-room').
- All rooms stay mounted (.tabhidden CSS, not the `hidden` attribute — author display rules would beat it); jsdom suite passed UNCHANGED (176/176).
- e2e: boot spec tours the rooms; slot purchase visits the Hall; expedition spec clicks Adventure; new reload-persistence spec — 9/9 locally.
- Guide gained the rooms line ("the world is one — time spent anywhere passes everywhere"); README screenshot regenerated.

## Gates
- [x] All panels still mounted (jsdom suite unchanged semantics) — 176/176 with zero unit-test edits
- [x] e2e green INCLUDING the visibility-sensitive specs — 9/9
- [x] Tab persists across reload — dedicated spec
