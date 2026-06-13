// Cloud saves via Supabase. The publishable key is public by design (security
// lives in row-level security — see supabase/schema.sql). The engine never
// touches the network: the cloud just stores the same save JSON localStorage does.
import { createClient, type Session, type SupabaseClient } from '@supabase/supabase-js';
import { normalizeGame, type Game } from './game';

const SUPABASE_URL = 'https://chynnshtcjclphlazkmv.supabase.co';
const SUPABASE_KEY = 'sb_publishable_1679IKhuXSNPJrrvQC72iw_7LdjFxta';

let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  client ??= createClient(SUPABASE_URL, SUPABASE_KEY);
  return client;
}

export type { Session };

/** Returns an error message, or null on success ("check your email"). */
export async function sendMagicLink(email: string): Promise<string | null> {
  const { error } = await getSupabase().auth.signInWithOtp({
    email,
    options: { emailRedirectTo: window.location.href },
  });
  return error ? error.message : null;
}

export async function signOut(): Promise<void> {
  await getSupabase().auth.signOut();
}

export async function loadCloudSave(): Promise<Game | null> {
  try {
    const { data, error } = await getSupabase().from('saves').select('save').maybeSingle();
    if (error || !data) return null;
    return normalizeGame(data.save as Game);
  } catch {
    return null;
  }
}

export async function pushCloudSave(game: Game): Promise<boolean> {
  try {
    const user = (await getSupabase().auth.getUser()).data.user;
    if (!user) return false;
    const { error } = await getSupabase()
      .from('saves')
      .upsert({ user_id: user.id, save: game, updated_at: new Date().toISOString() });
    return !error;
  } catch {
    return false;
  }
}

export interface BoardRow {
  handle: string;
  worth: number;
  /** Deepest region index reached within the verified sprint (0 = surface). */
  deepest?: number;
}

/** Top verified sprints for a seed. null = leaderboard backend not deployed
 * (or offline) — callers hide the feature entirely on null. */
export async function fetchLeaderboard(seed: number): Promise<BoardRow[] | null> {
  try {
    const { data, error } = await getSupabase()
      .from('leaderboard')
      .select('handle,worth,deepest')
      .eq('seed', seed)
      .order('worth', { ascending: false })
      .limit(10);
    if (error) return null;
    return (data ?? []) as BoardRow[];
  } catch {
    return null;
  }
}

/** Handles are PUBLIC. Anything email-shaped is trimmed to its local part
 * (jesse@example.com → jesse); empty falls back to a neutral name. The
 * verify-score function applies the same rule server-side. */
export function sanitizeHandle(raw: string): string {
  const t = raw.trim().slice(0, 24);
  const cut = (t.includes('@') ? t.split('@')[0]! : t).trim();
  return cut.length >= 1 ? cut : 'anonymous trader';
}

export interface SubmitResult {
  ok: boolean;
  worth?: number;
  improved?: boolean;
  error?: string;
}

/** Submit a sprint log for server-side replay verification (JWT attached by
 * the client automatically). The server's verdict is the score — never ours. */
export async function submitSprint(
  handle: string,
  seed: number,
  log: unknown[],
): Promise<SubmitResult> {
  try {
    const { data, error } = await getSupabase().functions.invoke('verify-score', {
      body: { handle, seed, log },
    });
    if (error) return { ok: false, error: error.message };
    const d = data as { worth?: number; improved?: boolean } | null;
    return { ok: true, ...(d?.worth !== undefined ? { worth: d.worth } : {}), ...(d?.improved !== undefined ? { improved: d.improved } : {}) };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}

/** Which save to keep on sign-in. Latest-wins by `lastSeenMs` (same clock domain as accrual) — EXCEPT a
 *  pristine, untouched save (a fresh new game: never ticked, no player commands) must never win by recency,
 *  or starting a fresh game on a new device / after a storage clear and then signing in would clobber the
 *  real cloud save (the fresh local's lastSeenMs=now beats the older-but-real cloud → the adopt flow pushes
 *  it over the cloud → total progress loss). A pristine save has zero progress and zero intent to discard the
 *  other, so the real run always wins; only when both are comparable (both real, or both pristine) does
 *  recency decide. (19w) */
export function chooseSave(local: Game | null, cloud: Game | null): 'local' | 'cloud' {
  if (!cloud) return 'local';
  if (!local) return 'cloud';
  const untouched = (g: Game): boolean => (g.world.tick ?? 0) === 0 && (g.commandLog?.length ?? 0) === 0;
  const lU = untouched(local);
  const cU = untouched(cloud);
  if (lU !== cU) return lU ? 'cloud' : 'local'; // a save with a real run always beats a pristine one
  return (cloud.lastSeenMs ?? 0) >= (local.lastSeenMs ?? 0) ? 'cloud' : 'local';
}
