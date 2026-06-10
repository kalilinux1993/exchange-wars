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
  applyOfflineProgress,
  checkMilestones,
  clearSave,
  loadGame,
  newGame,
  recordWorth,
  saveGame,
  updateNews,
  viewNetWorth,
  type Game,
  type Milestone,
  type OfflineResult,
} from './game';

const SPEEDS = [0, 1, 5, 20] as const;

export function App({ initial }: { initial?: Game }) {
  const gameRef = useRef<Game | null>(null);
  const offlineRef = useRef<OfflineResult | null>(null);
  if (gameRef.current === null) {
    gameRef.current = initial ?? loadGame() ?? newGame(42);
    offlineRef.current = applyOfflineProgress(gameRef.current, Date.now());
    // Latch anything offline progress earned — silently (the banner covers it).
    const v0 = playerView(gameRef.current.world, gameRef.current.playerId);
    if (v0) checkMilestones(gameRef.current, v0, viewNetWorth(v0));
  }
  const game = gameRef.current;
  const [, force] = useReducer((x: number) => x + 1, 0);
  const [speed, setSpeed] = useState(0); // ticks per second; world starts paused
  const [selected, setSelected] = useState<ItemId>(game.world.items[0]?.id ?? '');
  const [lastResult, setLastResult] = useState<CommandResult | null>(null);
  const [awayDismissed, setAwayDismissed] = useState(false);
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
        offlineRef.current = applyOfflineProgress(cloud, Date.now());
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
    const newly = checkMilestones(game, v, w);
    if (newly.length > 0) setToast(newly[newly.length - 1]!);
  };

  useEffect(() => {
    if (toast === null) return;
    const id = setTimeout(() => setToast(null), 4_000);
    return () => clearTimeout(id);
  }, [toast]);

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
  const restart = (seed: number): void => {
    clearSave();
    gameRef.current = newGame(seed);
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
          <button className="chip" title="how to play" onClick={() => setHelpOpen(true)}>
            ?
          </button>
          {seedDraft === null ? (
            <button className="chip" onClick={() => setSeedDraft(String(game.world.seed + 1))}>
              new game
            </button>
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
              <span key={e.id} className={`event-chip ${e.kind}`}>
                ⚡ {names.get(e.itemId) ?? e.itemId} {EVENT_LABELS[e.kind]}
              </span>
            ))}
          </div>
        );
      })()}
      {offlineRef.current && !awayDismissed && (
        <div className="awaybar">
          while you were away: <b>{offlineRef.current.ticks.toLocaleString('en-US')}</b> ticks passed · net
          worth{' '}
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
          />
          <BookLadder book={game.world.books[selected]} playerId={game.playerId} onLevel={onLevel} />
          <UpgradeShop view={view} items={game.world.items} onCommand={command} />
          <WorthChart history={game.worthHistory} startGp={game.startGp} />
        </section>
        <section className="middle">
          <PlayerPanel view={view} items={game.world.items} onCommand={command} />
          <ContractsBoard view={view} items={game.world.items} tick={game.world.tick} onCommand={command} />
          <TradeFeed trades={game.world.trades} items={game.world.items} playerId={game.playerId} />
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
