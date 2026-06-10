# Phase: Exchange Wars — Phase 6g: Sorting, Save Portability & CI Scaling Fix

**Started/Closed:** 2026-06-10 (single iteration)
**Hat:** Builder (CI red from 6f + standing directive)
**Goal:** Fix the 6f CI timeouts structurally; sortable market columns; save export/import.

## Gates
- [x] CI scaling fix: offline-accrual spec moved to a tiny 1-item world (tests clock logic, not the economy — was 124s on CI, now near-instant); balance gate budget 240s. Rule recorded: world-size-independent tests get world-size-independent fixtures.
- [x] Sortable columns (▲/▼, null-last) + export/import (validated, normalized, offline-accrued on load) — both test-gated
- [x] Suites green: 102 unit + 6 e2e locally; CI + live verified on this push

**Closed:** 2026-06-10 — done condition met.
