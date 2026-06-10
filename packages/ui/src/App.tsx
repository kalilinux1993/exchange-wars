import { applyCommand, EVENT_LABELS, playerView, runTicks, tickWorld } from '@exchange-wars/engine';
import type { CommandResult, ItemId, PlayerCommand } from '@exchange-wars/engine';
import { BookLadder } from './components/BookLadder';
import { useEffect, useReducer, useRef, useState } from 'react';
import { MarketTable } from './components/MarketTable';
import { MilestonesPanel } from './components/MilestonesPanel';
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

  const refreshProgress = (): void => {
    const v = playerView(game.world, game.playerId);
    if (!v) return;
    const w = viewNetWorth(v);
    recordWorth(game, w);
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
    force();
  };
  const fastForward = (n: number): void => {
    runTicks(game.world, n);
    refreshProgress();
    saveGame(game);
    force();
  };
  const restart = (): void => {
    clearSave();
    gameRef.current = newGame(game.world.seed + 1);
    setSelected(gameRef.current.world.items[0]?.id ?? '');
    setLastResult(null);
    setSpeed(0);
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
          <button className="chip" onClick={restart}>
            new game
          </button>
        </div>
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
        <MarketTable
          view={view}
          items={game.world.items}
          trades={game.world.trades}
          selected={selected}
          onSelect={setSelected}
        />
        <section className="middle">
          <TradeTicket view={view} selected={selected} onCommand={command} lastResult={lastResult} />
          <BookLadder book={game.world.books[selected]} playerId={game.playerId} />
          <UpgradeShop view={view} items={game.world.items} onCommand={command} />
          <WorthChart history={game.worthHistory} startGp={game.startGp} />
        </section>
        <section className="middle">
          <PlayerPanel view={view} items={game.world.items} onCommand={command} />
          <TradeFeed trades={game.world.trades} items={game.world.items} playerId={game.playerId} />
          <MilestonesPanel unlocked={game.milestones} />
        </section>
      </main>
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
