import { applyCommand, EVENT_LABELS, playerView, runTicks, tickWorld } from '@exchange-wars/engine';
import type { CommandResult, ItemId, PlayerCommand } from '@exchange-wars/engine';
import { chooseSave, getSupabase, loadCloudSave, pushCloudSave, type Session } from './cloud';
import { AccountBar } from './components/AccountBar';
import { HELP_SEEN_KEY, HelpOverlay } from './components/HelpOverlay';
import { BookLadder } from './components/BookLadder';
import { ContractsBoard } from './components/ContractsBoard';
import { NewsLog } from './components/NewsLog';
import { useEffect, useReducer, useRef, useState } from 'react';
import { MarketTable } from './components/MarketTable';
import { MilestonesPanel } from './components/MilestonesPanel';
import type { TicketPrefill } from './components/TradeTicket';
import { PlayerPanel } from './components/PlayerPanel';
import { TradeFeed } from './components/TradeFeed';
import { TradeTicket } from './components/TradeTicket';
import { UpgradeShop } from './components/UpgradeShop';
import { WorthChart } from './components/WorthChart';
import {
  checkMilestones,
  finishOfflineProgress,
  fmtDuration,
  ghostForRestart,
  parseChallengeSeed,
  planOfflineProgress,
  clearSave,
  exportSaveString,
  importSaveString,
  loadGame,
  newGame,
  recordFills,
  recordWorth,
  saveGame,
  updateNews,
  viewNetWorth,
  type Game,
  type Milestone,
  type OfflinePlan,
  type OfflineResult,
} from './game';

const SPEEDS = [0, 1, 5, 20] as const;
// Offline catch-ups at or under this run synchronously (sub-second); bigger
// ones run in chunks behind the catch-up overlay so the tab never freezes
// (the 100k-tick cap is ~14s of solid sim at 100 items).
const SYNC_CATCHUP_TICKS = 5_000;
const CATCHUP_CHUNK_TICKS = 1_000;

export function App({ initial }: { initial?: Game }) {
  const gameRef = useRef<Game | null>(null);
  const offlineRef = useRef<OfflineResult | null>(null);
  const hadSaveRef = useRef(false);
  if (gameRef.current === null) {
    const saved = initial ?? loadGame();
    hadSaveRef.current = saved !== null && saved !== undefined;
    gameRef.current = saved ?? newGame(42);
  }
  const game = gameRef.current;
  const [, force] = useReducer((x: number) => x + 1, 0);
  const [speed, setSpeed] = useState(0); // ticks per second; world starts paused
  const [selected, setSelected] = useState<ItemId>(game.world.items[0]?.id ?? '');
  const [lastResult, setLastResult] = useState<CommandResult | null>(null);
  const [awayDismissed, setAwayDismissed] = useState(false);
  const [challenge, setChallenge] = useState<number | null>(null);
  const [catchUp, setCatchUp] = useState<{ done: number; total: number } | null>(null);
  const planRef = useRef<OfflinePlan | null>(null);
  const [toast, setToast] = useState<Milestone | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [seedDraft, setSeedDraft] = useState<string | null>(null);
  const [lastSync, setLastSync] = useState<number | null>(null);
  const [prefill, setPrefill] = useState<TicketPrefill | null>(null);
  const [helpOpen, setHelpOpen] = useState(() => localStorage.getItem(HELP_SEEN_KEY) === null);
  const closeHelp = (): void => {
    localStorage.setItem(HELP_SEEN_KEY, '1');
    setHelpOpen(false);
  };
  const prefillNonce = useRef(0);
  const onLevel = (side: 'buy' | 'sell', price: number): void => {
    prefillNonce.current++;
    setPrefill({ side, price, n: prefillNonce.current });
  };
  const sessionRef = useRef<Session | null>(null);
  sessionRef.current = session;
  const adoptedRef = useRef(false);
  const pushTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const schedulePush = (): void => {
    if (!sessionRef.current) return;
    if (pushTimer.current) clearTimeout(pushTimer.current);
    pushTimer.current = setTimeout(() => {
      const g = gameRef.current;
      if (g) {
        void pushCloudSave(g).then((ok) => {
          if (ok) setLastSync(Date.now());
        });
      }
    }, 5_000);
  };

  /** Start offline accrual for a (possibly just-adopted) game: small debts
   * run synchronously, big ones hand off to the chunked catch-up effect. */
  const beginOffline = (g: Game): void => {
    offlineRef.current = null;
    const plan = planOfflineProgress(g, Date.now());
    if (!plan) return;
    if (plan.ticks <= SYNC_CATCHUP_TICKS) {
      runTicks(g.world, plan.ticks);
      offlineRef.current = finishOfflineProgress(g, plan);
      return;
    }
    planRef.current = plan;
    setCatchUp({ done: 0, total: plan.ticks });
  };

  // Boot: apply the offline debt and latch anything it earned — silently
  // (the away banner / catch-up overlay cover the narration). Then handle a
  // `#seed=N` challenge link: fresh visitors start on that seed directly;
  // players with a save get a bar (never clobber a run silently).
  useEffect(() => {
    const g = gameRef.current;
    if (!g) return;
    beginOffline(g);
    const v0 = playerView(g.world, g.playerId);
    if (v0) checkMilestones(g, v0, viewNetWorth(v0));
    const ch = parseChallengeSeed(window.location.hash);
    if (ch !== null) {
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
      if (!hadSaveRef.current) {
        gameRef.current = newGame(ch);
        offlineRef.current = null;
        setSelected(gameRef.current.world.items[0]?.id ?? '');
      } else if (g.world.seed !== ch) {
        setChallenge(ch);
      }
    }
    force();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // The chunked catch-up driver: one slice per timeout so the UI repaints
  // between slices; finalize latches news/fills/deeds earned while away.
  useEffect(() => {
    if (!catchUp) return;
    const g = gameRef.current;
    if (!g) return;
    if (catchUp.done >= catchUp.total) {
      const plan = planRef.current;
      planRef.current = null;
      if (plan) offlineRef.current = finishOfflineProgress(g, plan);
      updateNews(g);
      recordFills(g);
      const v = playerView(g.world, g.playerId);
      if (v) checkMilestones(g, v, viewNetWorth(v));
      saveGame(g);
      schedulePush();
      setCatchUp(null);
      setAwayDismissed(false);
      force();
      return;
    }
    const id = setTimeout(() => {
      const step = Math.min(CATCHUP_CHUNK_TICKS, catchUp.total - catchUp.done);
      runTicks(g.world, step);
      setCatchUp({ done: catchUp.done + step, total: catchUp.total });
    }, 0);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [catchUp]);

  useEffect(() => {
    void getSupabase()
      .auth.getSession()
      .then(({ data }) => setSession(data.session));
    const { data } = getSupabase().auth.onAuthStateChange((_event, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);

  // On sign-in: adopt whichever save is newer (cloud wins ties), then keep
  // the loser updated. Adopting a cloud save runs offline accrual against
  // NOW — close on the PC, open on the phone, the world kept going.
  useEffect(() => {
    if (!session || adoptedRef.current) return;
    adoptedRef.current = true;
    void loadCloudSave().then((cloud) => {
      const local = gameRef.current;
      if (cloud && chooseSave(local, cloud) === 'cloud') {
        gameRef.current = cloud;
        beginOffline(cloud);
        saveGame(cloud);
        setSelected(cloud.world.items[0]?.id ?? '');
        setAwayDismissed(false);
        force();
      } else if (local) {
        void pushCloudSave(local);
      }
    });
  }, [session]);

  const refreshProgress = (): void => {
    const v = playerView(game.world, game.playerId);
    if (!v) return;
    const w = viewNetWorth(v);
    recordWorth(game, w);
    updateNews(game);
    recordFills(game);
    const newly = checkMilestones(game, v, w);
    if (newly.length > 0) setToast(newly[newly.length - 1]!);
  };

  useEffect(() => {
    if (toast === null) return;
    const id = setTimeout(() => setToast(null), 4_000);
    return () => clearTimeout(id);
  }, [toast]);

  // Space toggles pause/play — the idle-game standard. Never while typing.
  const lastSpeed = useRef(5);
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.code !== 'Space') return;
      const t = e.target as HTMLElement | null;
      if (t && ['INPUT', 'SELECT', 'TEXTAREA', 'BUTTON'].includes(t.tagName)) return;
      e.preventDefault();
      setSpeed((s) => {
        if (s === 0) return lastSpeed.current;
        lastSpeed.current = s;
        return 0;
      });
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    if (speed === 0) return;
    const id = setInterval(
      () => {
        tickWorld(game.world);
        refreshProgress();
        force();
      },
      Math.max(16, Math.round(1000 / speed)),
    );
    return () => clearInterval(id);
  }, [speed, game]);

  // Hidden tabs get throttled timers — slower than the 1 tps offline rate,
  // yet they earned no accrual on return. Make hidden ≡ closed: stamp the
  // save and pause on hide; offline-accrue on show (the chunked overlay
  // handles long absences). Sub-minute blips resume the prior speed
  // seamlessly (planOfflineProgress ignores them by design).
  const speedRef = useRef(speed);
  speedRef.current = speed;
  const resumeSpeedRef = useRef(0);
  useEffect(() => {
    const onVis = (): void => {
      const g = gameRef.current;
      if (!g) return;
      if (document.visibilityState === 'hidden') {
        resumeSpeedRef.current = speedRef.current;
        setSpeed(0);
        saveGame(g);
        return;
      }
      beginOffline(g);
      const accrued = offlineRef.current !== null || planRef.current !== null;
      if (accrued) {
        setAwayDismissed(false);
      } else {
        setSpeed(resumeSpeedRef.current);
      }
      force();
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const view = playerView(game.world, game.playerId);
  if (!view) return <p className="reject">save corrupted — clear site data and reload</p>;

  const command = (cmd: PlayerCommand): void => {
    setLastResult(applyCommand(game.world, game.playerId, cmd));
    refreshProgress();
    saveGame(game);
    schedulePush();
    force();
  };
  const fastForward = (n: number): void => {
    runTicks(game.world, n);
    refreshProgress();
    saveGame(game);
    schedulePush();
    force();
  };
  const fileRef = useRef<HTMLInputElement | null>(null);
  const exportSave = (): void => {
    const blob = new Blob([exportSaveString(game)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `exchange-wars-s${game.world.seed}-t${game.world.tick}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };
  const importFile = (file: File): void => {
    void file.text().then((raw) => {
      const g = importSaveString(raw);
      if (!g) {
        setToast({ id: 'import-failed', name: 'Import failed', flavor: 'that was not a valid save file', achieved: () => false });
        return;
      }
      gameRef.current = g;
      beginOffline(g);
      saveGame(g);
      setSelected(g.world.items[0]?.id ?? '');
      setAwayDismissed(false);
      setSpeed(0);
      schedulePush();
      force();
    });
  };

  const copyChallenge = (): void => {
    const url = `${window.location.origin}${window.location.pathname}#seed=${game.world.seed}`;
    const done = (): void =>
      setToast({
        id: 'challenge-link',
        name: 'Challenge link copied',
        flavor: `seed ${game.world.seed} — same world, fair ground`,
        achieved: () => false,
      });
    if (navigator.clipboard?.writeText) {
      void navigator.clipboard.writeText(url).then(done, done);
    } else {
      try {
        window.prompt('copy your challenge link', url);
      } catch {
        // jsdom / ancient browsers: prompt unavailable — the toast still
        // names the seed, which is the part that matters.
      }
      done();
    }
  };

  const restart = (seed: number): void => {
    const ghost = gameRef.current ? ghostForRestart(gameRef.current, seed) : undefined;
    clearSave();
    gameRef.current = newGame(seed);
    if (ghost) gameRef.current.ghost = ghost;
    setSelected(gameRef.current.world.items[0]?.id ?? '');
    setLastResult(null);
    setSpeed(0);
    setSeedDraft(null);
    schedulePush();
    force();
  };

  return (
    <div className="shell">
      <header className="masthead">
        <h1>Exchange Wars</h1>
        <div className="clock">
          <span className="label">tick</span>
          <span className="value">{game.world.tick.toLocaleString('en-US')}</span>
          <span className="label">seed</span>
          <span className="value">{game.world.seed}</span>
        </div>
        <div className="controls">
          {SPEEDS.map((s) => (
            <button key={s} className={speed === s ? 'chip active' : 'chip'} onClick={() => setSpeed(s)}>
              {s === 0 ? '❚❚' : `${s}×`}
            </button>
          ))}
          <button className="chip" onClick={() => fastForward(1_000)}>
            +1k
          </button>
          <button className="chip" onClick={() => fastForward(10_000)}>
            +10k
          </button>
          <button className="chip" onClick={() => saveGame(game)}>
            save
          </button>
          <button className="chip" title="download your save as a file" onClick={exportSave}>
            export
          </button>
          <button className="chip" title="load a save file" onClick={() => fileRef.current?.click()}>
            import
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            style={{ display: 'none' }}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) importFile(f);
              e.target.value = '';
            }}
          />
          <button className="chip" title="how to play" onClick={() => setHelpOpen(true)}>
            ?
          </button>
          {seedDraft === null ? (
            <>
              <button className="chip" onClick={() => setSeedDraft(String(game.world.seed + 1))}>
                new game
              </button>
              <button
                className="chip"
                title="copy a link that challenges a friend to this exact seed"
                onClick={copyChallenge}
              >
                challenge link
              </button>
            </>
          ) : (
            <span className="seedform">
              <input
                value={seedDraft}
                onChange={(e) => setSeedDraft(e.target.value)}
                inputMode="numeric"
                aria-label="seed"
              />
              <button
                className="chip"
                onClick={() => restart(Number.isFinite(Number(seedDraft)) ? Math.trunc(Number(seedDraft)) : game.world.seed + 1)}
              >
                start
              </button>
              <button className="chip" onClick={() => setSeedDraft(null)}>
                ×
              </button>
            </span>
          )}
        </div>
        <AccountBar session={session} lastSync={lastSync} />
        <div className="purse">
          <span className="value gold">{view.gp.toLocaleString('en-US')}</span>
          <span className="label">gp</span>
          <span className="value">{viewNetWorth(view).toLocaleString('en-US')}</span>
          <span className="label">net</span>
          {(() => {
            const delta = viewNetWorth(view) - game.startGp;
            return (
              <span className={delta >= 0 ? 'value up' : 'value down'}>
                {delta >= 0 ? '+' : ''}
                {delta.toLocaleString('en-US')}
              </span>
            );
          })()}
        </div>
      </header>
      {(() => {
        const active = (game.world.events ?? []).filter(
          (e) => e.startTick <= game.world.tick && e.endTick > game.world.tick,
        );
        if (active.length === 0) return null;
        const names = new Map(game.world.items.map((i) => [i.id, i.name]));
        return (
          <div className="newsbar">
            {active.map((e) => (
              <span key={e.id} className={`event-chip ${e.kind}`} title="ticks until the event ends">
                ⚡ {names.get(e.itemId) ?? e.itemId} {EVENT_LABELS[e.kind]} ·{' '}
                {(e.endTick - game.world.tick).toLocaleString('en-US')} left
              </span>
            ))}
          </div>
        );
      })()}
      {catchUp && (
        <div className="scrim">
          <section className="panel catchup">
            <h2>The world turns…</h2>
            <p className="dim">
              while you were away (~{fmtDuration(catchUp.total)}): {catchUp.done.toLocaleString('en-US')} /{' '}
              {catchUp.total.toLocaleString('en-US')} ticks
            </p>
            <div className="bar">
              <div className="bar-fill" style={{ width: `${Math.round((catchUp.done / catchUp.total) * 100)}%` }} />
            </div>
          </section>
        </div>
      )}
      {challenge !== null && (
        <div className="awaybar">
          ⚔ challenged to seed <b>{challenge}</b> — same world, fair ground. Starting abandons your current
          run.
          <button
            className="chip"
            onClick={() => {
              restart(challenge);
              setChallenge(null);
            }}
          >
            accept
          </button>
          <button className="chip" onClick={() => setChallenge(null)}>
            ×
          </button>
        </div>
      )}
      {offlineRef.current && !awayDismissed && (
        <div className="awaybar">
          while you were away: <b>{offlineRef.current.ticks.toLocaleString('en-US')}</b> ticks (~
          {fmtDuration(offlineRef.current.ticks)}) passed · net worth{' '}
          <b className={offlineRef.current.worthAfter >= offlineRef.current.worthBefore ? 'up' : 'down'}>
            {offlineRef.current.worthAfter - offlineRef.current.worthBefore >= 0 ? '+' : ''}
            {(offlineRef.current.worthAfter - offlineRef.current.worthBefore).toLocaleString('en-US')} gp
          </b>
          <button className="chip" onClick={() => setAwayDismissed(true)}>
            ×
          </button>
        </div>
      )}
      <main className="board">
        <section className="middle">
          <MarketTable
            view={view}
            items={game.world.items}
            trades={game.world.trades}
            selected={selected}
            onSelect={setSelected}
            eventItems={
              new Set(
                (game.world.events ?? [])
                  .filter((e) => e.startTick <= game.world.tick && e.endTick > game.world.tick)
                  .map((e) => e.itemId),
              )
            }
          />
          <NewsLog log={game.newsLog} />
        </section>
        <section className="middle">
          <TradeTicket
            view={view}
            selected={selected}
            items={game.world.items}
            prefill={prefill}
            onCommand={command}
            lastResult={lastResult}
            eventNote={(() => {
              const e = (game.world.events ?? []).find(
                (ev) => ev.itemId === selected && ev.startTick <= game.world.tick && ev.endTick > game.world.tick,
              );
              return e
                ? `⚡ ${EVENT_LABELS[e.kind]} active — ends in ~${(e.endTick - game.world.tick).toLocaleString('en-US')} ticks`
                : null;
            })()}
          />
          <BookLadder book={game.world.books[selected]} playerId={game.playerId} onLevel={onLevel} />
          <UpgradeShop view={view} items={game.world.items} onCommand={command} />
          <WorthChart
            history={game.worthHistory}
            startGp={game.startGp}
            ghost={game.ghost && game.ghost.seed === game.world.seed ? game.ghost.history : null}
          />
        </section>
        <section className="middle">
          <PlayerPanel view={view} items={game.world.items} onCommand={command} />
          <ContractsBoard view={view} items={game.world.items} tick={game.world.tick} onCommand={command} />
          <TradeFeed
            trades={game.world.trades}
            fills={game.fills}
            items={game.world.items}
            playerId={game.playerId}
          />
          <MilestonesPanel unlocked={game.milestones} game={game} view={view} worth={viewNetWorth(view)} />
        </section>
      </main>
      {helpOpen && <HelpOverlay onClose={closeHelp} />}
      {toast && (
        <div className="toast" onClick={() => setToast(null)}>
          <span className="mine">◆</span> <b>{toast.name}</b>
          <span className="dim"> — {toast.flavor}</span>
        </div>
      )}
      <footer className="footnote">
        deterministic world · automation keeps working through fast-forward · art direction provisional
      </footer>
    </div>
  );
}
