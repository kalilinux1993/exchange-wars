-- Exchange Wars verified sprint leaderboard. Paste into the Supabase SQL
-- editor (one time). One row per (user, seed): your best VERIFIED sprint.
-- Clients can only read: writes happen exclusively through the verify-score
-- Edge Function (service role), which replays the submitted command log and
-- inserts the worth IT computed — never the client's claim.
create table if not exists public.leaderboard (
  user_id uuid not null references auth.users (id) on delete cascade,
  seed bigint not null,
  handle text not null check (char_length(handle) between 1 and 24),
  worth bigint not null,
  -- deepest region index reached within the verified sprint (8f)
  deepest int not null default 0,
  verified_hash text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, seed)
);

alter table public.leaderboard enable row level security;

create policy "leaderboard is public" on public.leaderboard
  for select using (true);
-- Deliberately NO insert/update policies: anon/authenticated writes are
-- impossible; only the service-role Edge Function writes verified rows.
