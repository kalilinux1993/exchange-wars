# Phase: Exchange Wars — Phase 6h: My Trades

**Started:** 2026-06-10
**Hat:** Builder (standing directive; compact)
**Goal:** Persistent personal fill log: every trade involving the player is latched into the save (the global tape is a rolling window — personal history shouldn't vanish into it); Tape panel gains a tape|mine toggle.
**Done condition:** fills latch from the trades window (scan-from-tick with tail dedupe for same-tick edges, capped 50, persisted + normalized); toggle renders them; instant-fill buy shows up as a 'buy' fill (test-gated); suites + e2e green; CI + live.

## Gates
- [ ] Suites + e2e green; CI + live (checked at close)
