import { REGIONS, SPRINT_TICKS } from '@exchange-wars/engine';
import { useEffect, useState } from 'react';
import { fetchLeaderboard, sanitizeHandle, submitSprint, type BoardRow, type Session } from '../cloud';
import { dailySeed, playerWorth, type Game } from '../game';

const HANDLE_KEY = 'ew-handle';

/** Show the summit (gap-to-#1) line only for top contenders — below this rank the leader
 *  isn't a realistic live target, so the rank-above gap (`rankGap`) stays the relevant lever. */
const TOP_CONTENDER_RANK = 10;

/**
 * Your 1-based rank on the board, matched by your sanitized handle, or null if
 * you haven't set a handle or aren't among the fetched rows. The anonymous
 * fallback never matches — it isn't a personal identity, and would otherwise
 * tag every unnamed entry as "you". Pure.
 */
export function myRank(rows: { handle: string }[], rawHandle: string): number | null {
  if (rawHandle.trim() === '') return null;
  const me = sanitizeHandle(rawHandle);
  if (me === 'anonymous trader') return null;
  const i = rows.findIndex((r) => r.handle === me);
  return i >= 0 ? i + 1 : null;
}

/**
 * The climb target: the worth gap + handle of the rank directly above you, or null when you're
 * unranked or already #1. `meRank` is 1-based, so your row is `rows[meRank-1]` and the one above is
 * `rows[meRank-2]`. The gap floors at 0 (a tie reads as 0 to overtake). Pure.
 */
export function rankGap(
  rows: { handle: string; worth: number }[],
  meRank: number | null,
): { gap: number; rank: number; ahead: string } | null {
  if (meRank === null || meRank <= 1) return null;
  const above = rows[meRank - 2];
  const mine = rows[meRank - 1];
  if (!above || !mine) return null;
  return { gap: Math.max(0, above.worth - mine.worth), rank: meRank - 1, ahead: above.handle };
}

/**
 * The summit gap: the worth needed to seize #1 + the leader's handle, for a top contender chasing the
 * lead. null when you're unranked or already #1 (no one above). At #2 this equals `rankGap` (the rank
 * above IS #1), so the component shows it only from #3 down, where it's a distinct, further target than
 * the immediate climb. The gap floors at 0 for a tie, like `rankGap`. Pure.
 */
export function gapToTop(
  rows: { handle: string; worth: number }[],
  meRank: number | null,
): { gap: number; leader: string } | null {
  if (meRank === null || meRank <= 1) return null;
  const top = rows[0];
  const mine = rows[meRank - 1];
  if (!top || !mine) return null;
  return { gap: Math.max(0, top.worth - mine.worth), leader: top.handle };
}

/**
 * Where your CURRENT worth would slot into the (desc-sorted) board — a live provisional standing while the
 * sprint is still running. Counts entries `>=` your worth, so a TIE sits below the incumbent: you haven't
 * BEATEN an equal score, and a fresh submission lands after existing equal ones anyway. Pure.
 */
export function provisionalRank(rows: { worth: number }[], myWorth: number): number {
  return 1 + rows.filter((r) => r.worth >= myWorth).length;
}

/**
 * The verified Sprint Board for the current seed. Self-gating: probes the
 * leaderboard table once per seed and renders NOTHING until the backend
 * exists — the panel lights up by itself the day the table is deployed.
 */
export function LeaderboardPanel({
  game,
  session,
  onToast,
  handle: controlledHandle,
  onHandleChange,
}: {
  game: Game;
  session: Session | null;
  onToast: (name: string, flavor: string) => void;
  /** Controlled handle from App (the single source of truth). When omitted, the panel falls back to its
   * own localStorage-seeded state (preserves standalone renders / the existing tests). */
  handle?: string;
  onHandleChange?: (v: string) => void;
}) {
  const seed = game.world.seed;
  const [rows, setRows] = useState<BoardRow[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [localHandle, setLocalHandle] = useState(() => localStorage.getItem(HANDLE_KEY) ?? '');
  const handle = controlledHandle ?? localHandle;
  const updateHandle = (v: string): void => {
    if (onHandleChange) onHandleChange(v);
    else {
      setLocalHandle(v);
      localStorage.setItem(HANDLE_KEY, v);
    }
  };
  useEffect(() => {
    let live = true;
    void fetchLeaderboard(seed).then((r) => {
      if (live) setRows(r);
    });
    return () => {
      live = false;
    };
  }, [seed]);
  if (rows === null) return null; // backend absent (or offline): feature hidden

  const reached = game.world.tick >= SPRINT_TICKS;
  const provable = game.logSince === 0;
  const eligible = session !== null && reached && provable && !busy;
  const meRank = myRank(rows, handle); // your row on this seed, if any
  const isDaily = seed === dailySeed(); // today's shared world → this is THE daily board

  const submit = (): void => {
    setBusy(true);
    const log = game.commandLog.filter((e) => e.tick < SPRINT_TICKS);
    void submitSprint(sanitizeHandle(handle), seed, log).then((res) => {
      setBusy(false);
      if (!res.ok) {
        onToast('Sprint rejected', res.error ?? 'verification failed');
        return;
      }
      onToast(
        res.improved ? 'Sprint verified — new best!' : 'Sprint verified',
        `the bank confirms ${res.worth?.toLocaleString('en-US') ?? '?'} gp at tick ${SPRINT_TICKS.toLocaleString('en-US')}`,
      );
      void fetchLeaderboard(seed).then((r) => setRows(r ?? rows));
    });
  };

  return (
    <section className="panel sprintboard">
      <h2>{isDaily ? '🗓 Daily Board' : 'Sprint Board'}</h2>
      <p className="dim small">
        {isDaily ? "today's shared world — everyone racing the daily competes here · " : `seed ${seed} · `}
        best fortune at tick {SPRINT_TICKS.toLocaleString('en-US')} — every entry verified by replay
      </p>
      {meRank !== null && <p className="dim small">you're #{meRank} on this seed</p>}
      {(() => {
        const g = rankGap(rows, meRank);
        if (!g) return null;
        return (
          <p className="dim small rankgap" title="the fortune you'd need at the sprint mark to overtake the rank directly above — your next climb target">
            🎯 <b>{g.gap.toLocaleString('en-US')}</b> gp behind #{g.rank} <b>{g.ahead}</b>
          </p>
        );
      })()}
      {(() => {
        // The summit, for top contenders: gap to #1, distinct from the rank-above climb. Gated to #3–#10 —
        // at #2 the rank-above gap already IS the gap-to-#1, and below #10 the leader isn't a live target (18a).
        if (meRank === null || meRank < 3 || meRank > TOP_CONTENDER_RANK) return null;
        const t = gapToTop(rows, meRank);
        if (!t) return null;
        return (
          <p className="dim small gaptop" title="the fortune you'd need at the sprint mark to seize #1 — the summit, beyond your immediate climb">
            👑 <b>{t.gap.toLocaleString('en-US')}</b> gp behind #1 <b>{t.leader}</b>
          </p>
        );
      })()}
      {game.world.tick < SPRINT_TICKS &&
        (() => {
          // Live race position: before the sprint mark, your current worth IS what your
          // sprint score would be if it ended now — so this provisional rank is honest.
          // After the mark it's hidden (current worth includes post-sprint play).
          const worth = playerWorth(game);
          const rank = provisionalRank(rows, worth);
          return (
            <p className="dim small provrank" title="where your fortune would place you if the sprint ended this instant — a live race position (the board scores are worth at the sprint mark)">
              ⏱ if the sprint ended now (tick {game.world.tick.toLocaleString('en-US')}/{SPRINT_TICKS.toLocaleString('en-US')}), your{' '}
              <b>{worth.toLocaleString('en-US')}</b> gp would sit <b>#{rank}</b>
            </p>
          );
        })()}
      <ul className="rows small">
        {rows.map((r, i) => (
          <li key={`${i}-${r.handle}`} className={meRank === i + 1 ? 'you' : undefined}>
            <span className="dim num">{i + 1}.</span>
            <span>
              {r.handle}
              {meRank === i + 1 && <span className="dim small"> ← you</span>}
              {(r.deepest ?? 0) > 0 && (
                <span className="dim small" title={`deepest region by tick 2,000: ${REGIONS[r.deepest ?? 0]?.name ?? '?'}`}>
                  {' '}
                  ⛏{(r.deepest ?? 0) + 1}
                </span>
              )}
            </span>
            <span className="num">{r.worth.toLocaleString('en-US')}</span>
          </li>
        ))}
        {rows.length === 0 && <li className="dim">no verified runs on this seed — be the first</li>}
      </ul>
      {session ? (
        <>
          <div className="submitrow">
            <input
              aria-label="handle"
              placeholder="handle (public — not your email)"
              maxLength={24}
              value={handle}
              onChange={(e) => updateHandle(e.target.value)}
            />
            <button className="chip" disabled={!eligible} onClick={submit}>
              {busy ? 'verifying…' : `submit ${SPRINT_TICKS / 1_000}k sprint`}
            </button>
          </div>
          {!reached && <p className="dim small">reach tick {SPRINT_TICKS.toLocaleString('en-US')} to submit</p>}
          {reached && !provable && (
            <p className="dim small">this run predates command recording — start a new game to compete</p>
          )}
        </>
      ) : (
        <p className="dim small">sign in to submit your run</p>
      )}
    </section>
  );
}
