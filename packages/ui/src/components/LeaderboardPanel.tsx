import { REGIONS, SPRINT_TICKS } from '@exchange-wars/engine';
import { useEffect, useState } from 'react';
import { fetchLeaderboard, sanitizeHandle, submitSprint, type BoardRow, type Session } from '../cloud';
import { dailySeed, type Game } from '../game';

const HANDLE_KEY = 'ew-handle';

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
 * The verified Sprint Board for the current seed. Self-gating: probes the
 * leaderboard table once per seed and renders NOTHING until the backend
 * exists — the panel lights up by itself the day the table is deployed.
 */
export function LeaderboardPanel({
  game,
  session,
  onToast,
}: {
  game: Game;
  session: Session | null;
  onToast: (name: string, flavor: string) => void;
}) {
  const seed = game.world.seed;
  const [rows, setRows] = useState<BoardRow[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [handle, setHandle] = useState(() => localStorage.getItem(HANDLE_KEY) ?? '');
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
              onChange={(e) => {
                setHandle(e.target.value);
                localStorage.setItem(HANDLE_KEY, e.target.value);
              }}
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
