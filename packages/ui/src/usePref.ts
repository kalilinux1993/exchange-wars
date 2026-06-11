import { useState } from 'react';

/**
 * A JSON-backed localStorage preference (10c). One shape for the cross-run UI
 * prefs that used to each carry their own load/save/try-catch boilerplate
 * (loadouts, watchlist, alerts). NOT for raw-string or validated-enum prefs
 * (ew-title, ew-room keep their bespoke read because they aren't plain JSON
 * round-trips). Setter persists; quota/parse failures degrade to the fallback
 * — a pref is a nicety, never fatal.
 */
export function usePref<T>(key: string, fallback: T): [T, (v: T) => void] {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw === null ? fallback : (JSON.parse(raw) as T);
    } catch {
      return fallback;
    }
  });
  const set = (v: T): void => {
    setValue(v);
    try {
      localStorage.setItem(key, JSON.stringify(v));
    } catch {
      /* private mode / quota — the in-memory value still updates */
    }
  };
  return [value, set];
}
