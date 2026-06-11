# Phase: Exchange Wars — Phase 10a: Market Pulse (Brick 53)

**Started:** 2026-06-11
**Closed:** 2026-06-11
**Hat:** Builder (a global market heartbeat in the global chrome)
**Goal:** A masthead pulse: breadth (items above/below EMA) + active-event count, visible from every room. Derived, no state, no engine change.
**Done condition:** pulse renders with breadth; suite + e2e green. **MET.**

## Outcome
- App masthead: .pulse (▲up ▼down from traded items vs EMA, ⚡events); styles added.
- Filters to traded items (volume>0, ema>0) — fresh world reads 0/0, not misleading flat.
- 197/197 unit; 9/9 e2e. No engine change, no fn redeploy. FINDINGS #87.

## Gates
- [x] Breadth renders once traded (test)
- [x] Suite + e2e green
