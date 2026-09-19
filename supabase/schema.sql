-- Tri-State Local Mailer — schema + RLS
-- Run once in the Supabase SQL editor (or via the CLI) against a fresh project.
-- If you're updating an EXISTING database, don't re-run this file — use
-- supabase/migrations/ instead, in order.

create extension if not exists pgcrypto;

-- One row per postcard run (e.g. "November 2026 — Huntington, WV").
-- Advertisers reserve a slot on the current open campaign from /reserve;
-- see app/api/admin/campaigns/route.ts for how a campaign's ad_slots rows
-- get bulk-created.
create table if not exists campaigns (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  total_slots int not null check (total_slots > 0),
  price_cents int not null check (price_cents > 0),
  status text not null default 'open' check (status in ('open', 'closed')),
  created_at timestamptz not null default now()
);

-- One row per advertiser's printed QR code / postcard slot.
-- advertiser_id is the Clerk user id of the advertiser, e.g.
-- "user_3JWPHi2lBbTGzWAGUaFbSeaaj6U" — NOT a UUID, so it's stored as text.
-- Clerk is wired up in Supabase as a third-party auth provider, and RLS
-- below reads it back via auth.jwt()->>'sub' (auth.uid() won't work here:
-- it casts to uuid internally and would error on a Clerk id).
--
-- advertiser_id/business_name/destination_url are nullable because a
-- self-serve slot (see campaign_id/payment_status below) is created
-- empty, before anyone has claimed it — /admin's direct-create flow still
-- always fills all three in immediately, same as before.
create table if not exists ad_slots (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid references campaigns (id) on delete set null,
  advertiser_id text,
  code text not null unique,
  business_name text,
  destination_url text,
  slot_type text not null default 'standard',
  status text not null default 'active' check (status in ('active', 'paused')),
  payment_status text not null default 'unclaimed' check (payment_status in ('unclaimed', 'reserved', 'paid')),
  stripe_checkout_session_id text,
  created_at timestamptz not null default now()
);

-- One row per QR scan. No raw IP is ever stored — only an HMAC hash
-- (lib/ip-hash.ts) and a city/region-level location, matching
-- docs/privacy-policy.md.
create table if not exists scans (
  id uuid primary key default gen_random_uuid(),
  ad_slot_id uuid not null references ad_slots (id) on delete cascade,
  scanned_at timestamptz not null default now(),
  ip_hash text,
  device_type text check (device_type in ('mobile', 'tablet', 'desktop', 'unknown')),
  city text,
  region text,
  country text
);

-- One row per opt-in submission on an advertiser's destination page.
create table if not exists leads (
  id uuid primary key default gen_random_uuid(),
  ad_slot_id uuid not null references ad_slots (id) on delete cascade,
  scan_id uuid references scans (id) on delete set null,
  name text,
  email text,
  phone text,
  created_at timestamptz not null default now()
);

-- One row per browser/device an advertiser has enabled push notifications
-- on (public/sw.js + components/EnableNotificationsButton.tsx).
create table if not exists push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  advertiser_id text not null,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

create index if not exists ad_slots_campaign_id_idx on ad_slots (campaign_id);
create index if not exists scans_ad_slot_id_idx on scans (ad_slot_id);
create index if not exists leads_ad_slot_id_idx on leads (ad_slot_id);
create index if not exists push_subscriptions_advertiser_id_idx on push_subscriptions (advertiser_id);

alter table campaigns enable row level security;
alter table scans enable row level security;
alter table leads enable row level security;
alter table ad_slots enable row level security;
alter table push_subscriptions enable row level security;

-- Campaign name/price/slot count aren't sensitive — /reserve already
-- shows them to anonymous visitors — so this is a public read policy
-- rather than restricted to the service-role client. That's also what
-- lets the dashboard's RLS-scoped client (lib/supabase-clerk.ts) join a
-- campaign's name onto an advertiser's own ad_slots.
create policy "Campaigns are publicly readable"
  on campaigns for select
  using (true);

-- Advertisers can only read scans tied to their own ad_slots
create policy "Advertisers see own scans"
  on scans for select
  using (
    ad_slot_id in (
      select id from ad_slots where advertiser_id = (auth.jwt() ->> 'sub')
    )
  );

create policy "Advertisers see own leads"
  on leads for select
  using (
    ad_slot_id in (
      select id from ad_slots where advertiser_id = (auth.jwt() ->> 'sub')
    )
  );

create policy "Advertisers see own ad slots"
  on ad_slots for select
  using (advertiser_id = (auth.jwt() ->> 'sub'));

create policy "Advertisers see own push subscriptions"
  on push_subscriptions for select
  using (advertiser_id = (auth.jwt() ->> 'sub'));

-- The redirect route (app/r/[code]/page.tsx), the lead-capture endpoint
-- (app/api/leads/route.ts), the push-subscribe endpoint
-- (app/api/push/subscribe/route.ts), the reservation endpoint
-- (app/api/reserve/route.ts) and the Stripe webhook
-- (app/api/webhooks/stripe/route.ts) all use the service-role key, which
-- bypasses RLS by design — they write scans/leads/subscriptions/slots for
-- visitors and devices that aren't an authenticated advertiser at all (or,
-- for the webhook, aren't a browser session at all). RLS is what protects
-- the *read* side, when the advertiser dashboard queries Supabase
-- directly through lib/supabase-clerk.ts.
