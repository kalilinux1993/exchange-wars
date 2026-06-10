import { applyCommand, playerView, runTicks, tickWorld } from '@exchange-wars/engine';
import type { CommandResult, ItemId, PlayerCommand } from '@exchange-wars/engine';
import { useEffect, useReducer, useRef, useState } from 'react';
import { MarketTable } from './components/MarketTable';
import { PlayerPanel } from './components/PlayerPanel';
import { TradeTicket } from './components/TradeTicket';
import { UpgradeShop } from './components/UpgradeShop';
import { clearSave, loadGame, newGame, saveGame, type Game } from './game';

const SPEEDS = [0, 1, 5, 20] as const;

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
        </div>
      </header>
      <main className="board">
        <MarketTable view={view} items={game.world.items} selected={selected} onSelect={setSelected} />
        <section className="middle">
          <TradeTicket view={view} selected={selected} onCommand={command} lastResult={lastResult} />
          <UpgradeShop view={view} onCommand={command} />
        </section>
        <PlayerPanel view={view} items={game.world.items} onCommand={command} />
      </main>
      <footer className="footnote">
        deterministic world · automation keeps working through fast-forward · art direction provisional
      </footer>
    </div>
  );
}
