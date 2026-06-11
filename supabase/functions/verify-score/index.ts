// Supabase Edge Function: verify-score. Replays a submitted 10k-tick sprint
// with the SAME deterministic engine the game runs, then upserts the user's
// best verified worth. Determinism is the anti-cheat: the server never
// trusts a claimed score — it recomputes it.
//
// Deploy (one time, needs a Supabase access token):
//   npm run build:fn
//   npx supabase functions deploy verify-score --project-ref chynnshtcjclphlazkmv
//
// The engine arrives as ./engine.js — an esbuild bundle of
// packages/engine/src/replay.ts (npm run build:fn). GENERATED, do not edit.
import { createClient } from 'npm:@supabase/supabase-js@2';
// @ts-expect-error — generated bundle, no type declarations
import { SPRINT_MAX_COMMANDS, verifySprint } from './engine.js';

const HUMAN_START_GP = 55_000; // must match packages/ui/src/game.ts

// Browsers preflight cross-origin POSTs — without these headers the game's
// fetch dies before the request is even sent ("Failed to send a request to
// the Edge Function"). curl doesn't preflight, which is why API probes pass.
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req: Request): Promise<Response> => {
  const json = (status: number, body: unknown): Response =>
    new Response(JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json', ...CORS },
    });
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json(405, { error: 'method' });

  // Who is submitting? The game sends the user's JWT; no JWT, no entry.
  const auth = req.headers.get('Authorization') ?? '';
  const userClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: auth } },
  });
  const { data: userData } = await userClient.auth.getUser();
  const user = userData?.user;
  if (!user) return json(401, { error: 'sign-in required' });

  let body: { handle?: unknown; seed?: unknown; log?: unknown };
  try {
    body = await req.json();
  } catch {
    return json(400, { error: 'bad-json' });
  }
  const handle = typeof body.handle === 'string' ? body.handle.trim().slice(0, 24) : '';
  if (handle.length < 1) return json(400, { error: 'bad-handle' });
  const seed = typeof body.seed === 'number' ? body.seed : -1;
  const log = Array.isArray(body.log) ? body.log : null;
  if (!log || log.length > SPRINT_MAX_COMMANDS) return json(400, { error: 'bad-log' });

  const verdict = verifySprint(seed, HUMAN_START_GP, log);
  if (!verdict.ok) return json(422, { error: verdict.reason });

  // Service role bypasses RLS — the ONLY writer this table has.
  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const { data: existing } = await admin
    .from('leaderboard')
    .select('worth')
    .eq('user_id', user.id)
    .eq('seed', seed)
    .maybeSingle();
  if (existing && existing.worth >= verdict.worth) {
    return json(200, { worth: verdict.worth, best: existing.worth, improved: false });
  }
  const { error } = await admin.from('leaderboard').upsert({
    user_id: user.id,
    seed,
    handle,
    worth: verdict.worth,
    verified_hash: verdict.hash,
  });
  if (error) return json(500, { error: 'store-failed' });
  return json(200, { worth: verdict.worth, best: verdict.worth, improved: true });
});
