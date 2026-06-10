-- Exchange Wars cloud saves. Paste into the Supabase SQL editor (one time).
-- One row per user; row-level security means users only ever touch their own.
create table if not exists public.saves (
  user_id uuid primary key references auth.users (id) on delete cascade,
  save jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.saves enable row level security;

create policy "read own save" on public.saves
  for select using (auth.uid() = user_id);
create policy "insert own save" on public.saves
  for insert with check (auth.uid() = user_id);
create policy "update own save" on public.saves
  for update using (auth.uid() = user_id);
