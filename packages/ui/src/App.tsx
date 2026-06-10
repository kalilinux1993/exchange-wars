import { applyCommand, playerView, runTicks, tickWorld } from '@exchange-wars/engine';
import type { CommandResult, ItemId, PlayerCommand, PlayerView } from '@exchange-wars/engine';
import { useEffect, useReducer, useRef, useState } from 'react';
import { MarketTable } from './components/MarketTable';
import { PlayerPanel } from './components/PlayerPanel';
import { TradeFeed } from './components/TradeFeed';
import { TradeTicket } from './components/TradeTicket';
import { UpgradeShop } from './components/UpgradeShop';
import { WorthChart } from './components/WorthChart';
import { clearSave, loadGame, newGame, recordWorth, saveGame, type Game } from './game';

const SPEEDS = [0, 1, 5, 20] as const;

/** Liquid net worth from the view: gp + inventory and open orders at last price. */
function viewNetWorth(view: PlayerView): number {
  const last = new Map(view.markets.map((m) => [m.itemId, m.lastPrice]));
  let total = view.gp;
  for (const [id, qty] of Object.entries(view.inventory)) total += qty * (last.get(id) ?? 0);
  for (const o of view.openOrders) {
    total += o.side === 'buy' ? o.price * o.remaining : o.remaining * (last.get(o.itemId) ?? 0);
  }
  return total;
}

export function App({ initial }: { initial?: Game }) {
  const gameRef = useRef<Game | null>(null);
  if (gameRef.current === null) gameRef.current = initial ?? loadGame() ?? newGame(42);
  const game = gameRef.current;
  const [, force] = useReducer((x: number) => x + 1, 0);
  const [speed, setSpeed] = useState(0); // ticks per second; world starts paused
  const [selected, setSelected] = useState<ItemId>(game.world.items[0]?.id ?? '');
  const [lastResult, setLastResult] = useState<CommandResult | null>(null);

  useEffect(() => {
    if (speed === 0) return;
    const id = setInterval(
      () => {
        tickWorld(game.world);
        const v = playerView(game.world, game.playerId);
        if (v) recordWorth(game, viewNetWorth(v));
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
    saveGame(game);
    force();
  };
  const fastForward = (n: number): void => {
    runTicks(game.world, n);
    const v = playerView(game.world, game.playerId);
    if (v) recordWorth(game, viewNetWorth(v));
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
          <UpgradeShop view={view} onCommand={command} />
          <WorthChart history={game.worthHistory} startGp={game.startGp} />
        </section>
        <section className="middle">
          <PlayerPanel view={view} items={game.world.items} onCommand={command} />
          <TradeFeed trades={game.world.trades} items={game.world.items} playerId={game.playerId} />
        </section>
      </main>
      <footer className="footnote">
        deterministic world · automation keeps working through fast-forward · art direction provisional
      </footer>
    </div>
  );
}
