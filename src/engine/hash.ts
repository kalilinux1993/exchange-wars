import { fnv1a } from './rng';

/** JSON with recursively sorted object keys — stable across property insertion order. */
export function canonicalJson(value: unknown): string {
  return JSON.stringify(sortKeys(value));
}

function sortKeys(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(sortKeys);
  if (v !== null && typeof v === 'object') {
    const src = v as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const k of Object.keys(src).sort()) out[k] = sortKeys(src[k]);
    return out;
  }
  return v;
}

export function hashState(value: unknown): string {
  return fnv1a(canonicalJson(value)).toString(16).padStart(8, '0');
}
