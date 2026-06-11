# Phase: Exchange Wars — Phase 10v: Best Flips Now (Brick 74)

**Started:** 2026-06-11
**Closed:** 2026-06-11
**Hat:** Builder (trading core-loop — surface the best opportunities, not just per-item data)
**Goal:** A ranked, clickable "best flips now" strip — the ticket's flip sum run across every two-sided book, top profitable spreads first. UI-only (no engine change — no Supabase token to redeploy verify-score this session).
**Done condition:** pure `rankFlips` (positive net margin, two-sided only, ranked, limited) with a truth-table test; a `TopFlips` panel in the Exchange room that selects on click; suite + e2e green. **MET.**

## Outcome
- `components/TopFlips.tsx`: `rankFlips(markets, taxRate, limit)` — pure (tax as a param), mirrors the ticket's flip formula (buy=bestBid+1, sell=bestAsk-1, margin nets `floor(sell*tax)`), requires BOTH bid & ask (no ema-fallback phantom flips), filters margin>0, sorts desc with id tie-break, slices to limit. `TopFlips` renders it as a Movers-style panel (reuses `.panel`/`.rows small`/`.mover`/`.pct.up`), click → onSelect → ticket; dim empty-state names the tax.
- `App.tsx`: `<TopFlips>` in the Exchange room's `.middle`, above `MoversPanel`, wired to `setSelected`.
- Tests: pure `rankFlips` truth table (margin order 77>6, thin spread excluded, one-sided excluded, [] when none, limit respected) + 2 component renders (profitable rows + click-selects; empty state). 228/228 unit (+4), 9/9 e2e. No engine change, no fn redeploy. FINDINGS #108.

## Notes
- Constraint: `SUPABASE_ACCESS_TOKEN` absent this session → cannot redeploy `verify-score` → replay-affecting engine changes are off-limits until Jesse is present; value came from re-presenting view data.

## Gates
- [x] rankFlips ranks/filters/limits correctly (pure truth-table test)
- [x] Panel renders profitable rows + selects on click; empty state otherwise
- [x] Suite + e2e green
- [x] No engine change → verify-score redeploy not required
