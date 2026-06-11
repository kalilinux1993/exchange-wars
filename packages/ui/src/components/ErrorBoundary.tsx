import { Component, type ErrorInfo, type ReactNode } from 'react';
import { SAVE_KEY } from '../game';

/**
 * Robustness (9o): a render throw used to white-screen the whole game — and a
 * long-lived save can trip one (e.g. a future catalog change orphaning a
 * monster id, which monsterById throws on). This catches it, keeps the save
 * untouched, and offers recovery: reload, or copy the save out as a lifeboat.
 * Determinism-safe — it reads the save string, never mutates the world.
 */
export class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error): { error: Error } {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // Surface for debugging; the save on disk is whatever last autosaved.
    console.error('Exchange Wars render error:', error, info.componentStack);
  }

  private copySave = (): void => {
    try {
      const raw = localStorage.getItem(SAVE_KEY) ?? '';
      void navigator.clipboard?.writeText(raw);
    } catch {
      /* clipboard blocked — the reload path still works */
    }
  };

  render(): ReactNode {
    if (!this.state.error) return this.props.children;
    return (
      <div className="scrim">
        <section className="panel help" role="alert">
          <h2>The interface hit a snag</h2>
          <p>
            Something in the display threw an error — but <b>your progress is safe</b>: the world only changes
            through saved commands, and your last autosave is untouched on this device.
          </p>
          <p className="dim small">{this.state.error.message}</p>
          <div className="controls">
            <button className="submit buy" onClick={() => window.location.reload()}>
              reload the game
            </button>
            <button className="chip" onClick={this.copySave} title="copy your save to the clipboard as a backup">
              copy save to clipboard
            </button>
          </div>
        </section>
      </div>
    );
  }
}
