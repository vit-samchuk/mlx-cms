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

-- Price products
create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  sku text,
  current_cost numeric not null default 0,
  current_price numeric not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Product purchase and price history
create table if not exists product_cost_history (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id),
  purchase_date date not null,
  purchase_cost numeric not null default 0,
  selling_price numeric not null default 0,
  comment text,
  created_at timestamptz not null default now()
);

create or replace function sync_product_current_price()
returns trigger as $$
begin
  update products
  set
    current_cost = new.purchase_cost,
    current_price = new.selling_price,
    updated_at = now()
  where id = new.product_id;

  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_sync_product_current_price on product_cost_history;
create trigger trg_sync_product_current_price
after insert on product_cost_history
for each row
execute function sync_product_current_price();

create index if not exists idx_product_cost_history_product_date
  on product_cost_history (product_id, purchase_date desc, created_at desc);

-- Enable Row Level Security (anonymous access for GitHub Pages)
-- WARNING: these policies allow anyone to read/write. Restrict once auth is added.
alter table a5_sets enable row level security;
alter table production_days enable row level security;
alter table products enable row level security;
alter table product_cost_history enable row level security;

create policy "Allow all for a5_sets" on a5_sets for all using (true) with check (true);
create policy "Allow all for production_days" on production_days for all using (true) with check (true);
create policy "Allow all for products" on products for all using (true) with check (true);
create policy "Allow all for product_cost_history" on product_cost_history for all using (true) with check (true);
