# Phase: Exchange Wars — Phase 11o: Lifetime Trade Book (Brick 93)

**Started:** 2026-06-11
**Closed:** 2026-06-11
**Hat:** Builder (trading — proper lifetime P&L, removing the 50-fill window limit)
**Goal:** Accrue a persistent FIFO trade book fill-by-fill so realized P&L + cost basis are lifetime, not bounded by the capped fills window. UI-only, live on main.
**Done condition:** `applyFillToBook` (single FIFO truth) + persistent `game.tradeBook`; ProfitPanel + ticket read it; old `realizedPnL`/`openPosition` reimplemented as wrappers (existing tests pass); migration rebuilds from fills; suite + e2e green. **MET.**

## Outcome
- `game.ts`: `TradeBook { lots, realized }`, `emptyTradeBook`, `applyFillToBook(book, fill, tax)` (single FIFO source of truth), `bookFromFills`, `realizedFromBook`, `openFromBook`. `realizedPnL`/`openPosition` reimplemented as one-line wrappers over the book (behaviour identical → existing tests guard it). `Game.tradeBook` added; `newGame` inits empty; `normalizeGame` rebuilds from fills for old saves; `recordFills` accrues each new fill once (same dedupe guard as `fills.push`).
- `ProfitPanel.tsx` → `realizedFromBook(game.tradeBook)`; `App.tsx` ticket → `openFromBook(game.tradeBook, selected)`. Lifetime, not recent.
- Tests: `applyFillToBook` accrual; "survives the window" (a flip buried under 60 filler fills still remembered); `normalizeGame` rebuild for pre-book saves. The two render tests now seed `game.tradeBook` via `bookFromFills`. The pre-existing window truth-table tests re-run against the new core unchanged. 261/261 unit (+3), 9/9 e2e. No engine change, no fn redeploy. FINDINGS #127.

## Notes
- UI-only: the book lives on `Game`, not `WorldState` → determinism/replay/leaderboard untouched.
- `openPosition` wrapper uses tax 0 (lots are tax-independent; tax only affects realized profit).

## Gates
- [x] applyFillToBook FIFO + book readers (pure tests); realizedPnL/openPosition wrappers pass old tests
- [x] Lifetime survives the fills window (test); normalizeGame rebuilds (test)
- [x] ProfitPanel + ticket render from the book
- [x] Suite + e2e green
- [x] No engine change → verify-score redeploy not required
