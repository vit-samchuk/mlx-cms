-- Run this SQL in your Supabase SQL editor to create the required tables.

-- A5 saved label sets
create table if not exists a5_sets (
  id bigint generated always as identity primary key,
  name text unique not null,
  content text not null,
  bottom_text text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Production daily records
create table if not exists production_days (
  id bigint generated always as identity primary key,
  date date unique not null,
  products jsonb not null default '{}',
  day_off boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Enable Row Level Security (anonymous access for GitHub Pages)
-- WARNING: these policies allow anyone to read/write. Restrict once auth is added.
alter table a5_sets enable row level security;
alter table production_days enable row level security;

create policy "Allow all for a5_sets" on a5_sets for all using (true) with check (true);
create policy "Allow all for production_days" on production_days for all using (true) with check (true);
