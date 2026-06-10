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

/** Latest-wins by the save's own lastSeenMs (same clock domain as accrual). */
export function chooseSave(local: Game | null, cloud: Game | null): 'local' | 'cloud' {
  if (!cloud) return 'local';
  if (!local) return 'cloud';
  return (cloud.lastSeenMs ?? 0) >= (local.lastSeenMs ?? 0) ? 'cloud' : 'local';
}
