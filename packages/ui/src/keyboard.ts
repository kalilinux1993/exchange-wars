export type Shortcut =
  | { kind: 'room'; room: 'exchange' | 'adventure' | 'hall' }
  | { kind: 'pause' }
  | { kind: 'help' }
  | { kind: 'speed'; dir: 1 | -1 };

/** The live world speeds the `,`/`.` keys step through (the 1×/5×/20× buttons). */
export const SPEEDS = [1, 5, 20];

/**
 * Step the world speed one notch through SPEEDS, clamped (17q). `dir` +1 = faster, −1 = slower. A speed
 * that isn't a live tier (0/paused, or an unknown value) resumes at SPEEDS[0] on faster and is a no-op on
 * slower — so `.` un-pauses to 1× and `,` while paused stays paused. Pure.
 */
export function stepSpeed(current: number, dir: 1 | -1, speeds: number[] = SPEEDS): number {
  const i = speeds.indexOf(current);
  if (i === -1) return dir > 0 ? speeds[0]! : current;
  return speeds[Math.max(0, Math.min(speeds.length - 1, i + dir))]!;
}

/**
 * Map a bare keypress to a cockpit shortcut, or null. Pure — the focus/modifier
 * guard (never hijack a key while the player is typing) lives at the call site.
 * `p` pauses rather than Space so a focused button's Space-activation is never
 * stolen; 1/2/3/p/? don't trigger any default control action outside inputs.
 */
export function resolveShortcut(key: string): Shortcut | null {
  switch (key) {
    case '1':
      return { kind: 'room', room: 'exchange' };
    case '2':
      return { kind: 'room', room: 'adventure' };
    case '3':
      return { kind: 'room', room: 'hall' };
    case 'p':
    case 'P':
      return { kind: 'pause' };
    case '?':
      return { kind: 'help' };
    case ',':
      return { kind: 'speed', dir: -1 }; // slower
    case '.':
      return { kind: 'speed', dir: 1 }; // faster
    default:
      return null;
  }
}
