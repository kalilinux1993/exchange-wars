export type Shortcut =
  | { kind: 'room'; room: 'exchange' | 'adventure' | 'hall' }
  | { kind: 'pause' }
  | { kind: 'help' };

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
    default:
      return null;
  }
}
