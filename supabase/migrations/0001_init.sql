create table if not exists users_profile (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique not null,
  handle text unique,
  created_at timestamptz default now()
);

create table if not exists watchlists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  name text not null,
  tickers text[] not null default '{}',
  is_public boolean default false,
  created_at timestamptz default now()
);

create table if not exists combos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  name text not null,
  tickers text[] not null,
  settings jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

create table if not exists preferences (
  user_id uuid primary key,
  settings jsonb not null default '{}'::jsonb
);

-- RLS (enable and keep simple for now)
alter table watchlists enable row level security;
alter table combos enable row level security;
alter table preferences enable row level security;

create policy "watchlists owner" on watchlists
  for all using (auth.uid() = user_id);

create policy "combos owner" on combos
  for all using (auth.uid() = user_id);

create policy "preferences owner" on preferences
  for all using (auth.uid() = user_id);
