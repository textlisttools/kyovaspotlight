-- Adds campaigns + self-serve slot reservation to an EXISTING database.
-- Run once in the Supabase SQL editor. Safe to run even though ad_slots
-- already has rows — existing rows are explicitly backfilled below.

create table if not exists campaigns (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  total_slots int not null check (total_slots > 0),
  price_cents int not null check (price_cents > 0),
  status text not null default 'open' check (status in ('open', 'closed')),
  created_at timestamptz not null default now()
);

alter table campaigns enable row level security;

create policy "Campaigns are publicly readable"
  on campaigns for select
  using (true);

alter table ad_slots
  add column if not exists campaign_id uuid references campaigns (id) on delete set null,
  add column if not exists payment_status text not null default 'unclaimed',
  add column if not exists stripe_checkout_session_id text;

alter table ad_slots
  drop constraint if exists ad_slots_payment_status_check;
alter table ad_slots
  add constraint ad_slots_payment_status_check check (payment_status in ('unclaimed', 'reserved', 'paid'));

-- Existing rows were all created directly through /admin's manual flow —
-- they're already live, fully set up slots, not new self-serve inventory,
-- so they get backfilled straight to "paid" rather than defaulting to
-- "unclaimed" like a freshly-generated campaign slot would.
update ad_slots set payment_status = 'paid' where payment_status = 'unclaimed';

alter table ad_slots
  alter column advertiser_id drop not null,
  alter column business_name drop not null,
  alter column destination_url drop not null;

create index if not exists ad_slots_campaign_id_idx on ad_slots (campaign_id);
