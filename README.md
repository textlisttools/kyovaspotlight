# KYOVA Spotlight

QR-code scan tracking, lead capture, and push-notification alerts for the
advertisers on a local postcard mailing program. An advertiser gets a
printed QR code on their postcard slot; scanning it logs a visit, shows a
hosted opt-in page, and forwards the visitor on to the advertiser's own
site — whether or not they choose to share their name and email first —
the advertiser never has to add anything to their own page for any of
this to work.

## How a scan flows through the app

1. A visitor scans the QR code printed on the postcard, which points at
   `/r/<code>` (`app/r/[code]/page.tsx`).
2. That page looks up the matching `ad_slots` row, logs a `scans` row
   (device type, city/region, a salted IP hash — never the raw IP), fires a
   push notification to the advertiser, and renders a hosted opt-in page
   (`app/r/[code]/OfferForm.tsx`) showing the business name.
3. The visitor can optionally enter name + email (phone optional) and hit
   Continue, or just click "skip" — either way they end up at
   `ad_slots.destination_url`, the advertiser's actual site, completely
   unmodified. Submitting the form POSTs to `/api/leads`
   (`app/api/leads/route.ts`), which saves the lead and notifies the
   advertiser before forwarding on.
4. The advertiser dashboard (`app/dashboard`) shows scan counts and the
   lead list per ad slot, scoped to just their own data by Supabase RLS.
   From there they can enable push notifications
   (`components/EnableNotificationsButton.tsx`), which registers
   `public/sw.js` and subscribes the browser to web push.

## Environment variables

```
# Supabase
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=          # server-only, never expose to the client
SUPABASE_ANON_KEY=                  # used for the dashboard's RLS-scoped reads

# Scan privacy
IP_HASH_SALT=                       # any long random string

# Web push
VAPID_PUBLIC_KEY=                   # generate with `npx web-push generate-vapid-keys`
VAPID_PRIVATE_KEY=
NEXT_PUBLIC_VAPID_PUBLIC_KEY=       # same value as VAPID_PUBLIC_KEY, exposed to the browser

# Clerk (advertiser sign-in)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
```

Copy `.env.example` to `.env.local` and fill these in.

`SUPABASE_ANON_KEY`, `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, and the two Clerk keys
weren't in the original setup notes — they're needed because the dashboard
reads happen through an *authenticated, RLS-scoped* client
(`lib/supabase-clerk.ts`), and because `applicationServerKey` and Clerk's
publishable key have to be readable from the browser bundle.

## Dependencies

```
npm install
```

(`@supabase/supabase-js`, `web-push`, and `@clerk/nextjs` are already in
`package.json`.)

## Row Level Security

Run `supabase/schema.sql` once in the Supabase SQL editor (or via the CLI)
against a fresh project. It creates `ad_slots`, `scans`, `leads`, and
`push_subscriptions`, and enables RLS so an advertiser can only ever read
rows tied to their own `ad_slots`:

```sql
alter table scans enable row level security;
alter table leads enable row level security;
alter table ad_slots enable row level security;

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
```

`ad_slots.advertiser_id` is the advertiser's Clerk user id (e.g.
`user_3JWPHi2lBbTGzWAGUaFbSeaaj6U`) stored as `text`, **not** `uuid` — Clerk
ids aren't valid UUIDs. Clerk is configured in the Supabase dashboard as a
third-party auth provider, and `auth.jwt() ->> 'sub'` reads that id back out
of the token once `lib/supabase-clerk.ts` attaches the advertiser's Clerk
session token to a Supabase request. Use `auth.jwt() ->> 'sub'` here, not
`auth.uid()` — `auth.uid()` casts to `uuid` internally and throws on a
Clerk id.

The scan page, lead-capture endpoint, and push-subscribe endpoint all use
the service-role key, which bypasses RLS by design — they need to write
scans/leads/subscriptions for visitors and devices that aren't signed in
at all. RLS is what protects the *read* side, when the advertiser
dashboard queries Supabase directly.

## Project structure

```
app/
  r/[code]/page.tsx           Scan-logging + hosted opt-in page (the QR target)
  r/[code]/OfferForm.tsx      The name/email form shown there, before forwarding on
  api/leads/route.ts          Lead capture, called from OfferForm
  api/push/subscribe/route.ts  Saves a push subscription for the signed-in advertiser
  api/admin/ad-slots/route.ts  Creates one ad_slots row directly, admin-only
  api/admin/campaigns/route.ts  Creates a campaign + bulk-generates its ad_slots, admin-only
  api/reserve/route.ts        Claims a slot + creates a Stripe Checkout session
  api/webhooks/stripe/route.ts  Confirms/releases a reservation on Stripe's callback
  reserve/                    Public self-serve slot reservation + payment (see below)
  code-not-found/page.tsx    Shown when a code doesn't match an active ad slot
  dashboard/                 Advertiser dashboard, slots grouped by campaign (protected by middleware.ts)
  admin/                     Create campaigns/ad slots + download QR codes (admin-only, see below)
  privacy/page.tsx           Renders docs/privacy-policy.md
components/
  EnableNotificationsButton.tsx  Registers the service worker + push subscription
lib/
  supabase-server.ts          Service-role client (server-only)
  supabase-clerk.ts           RLS-scoped client for the dashboard
  push.ts                     notifyAdvertiser() — sends web push, prunes stale subscriptions
  stripe.ts                   Lazy-initialized Stripe client (see the note in the file on why)
  ip-hash.ts / device.ts / geo.ts   Scan-logging helpers
  admin.ts                    isAdmin() — the ADMIN_USER_IDS allowlist check
public/sw.js                  Service worker (push + notification click handling)
supabase/schema.sql           Tables + RLS policies (fresh installs)
supabase/migrations/          Numbered SQL files to run against an existing database, in order
docs/privacy-policy.md        Source of truth for app/privacy/page.tsx
```

## Admin: campaigns and ad slots

There are two ways an `ad_slots` row gets created:

**Direct** (phone/in-person deals) — go to `/admin`, pick the advertiser
from the dropdown (pulled live from Clerk's user list), fill in the
business name, a URL-safe `code`, and their destination URL, submit. One
row, immediately `payment_status: "paid"`.

**Self-serve, via a campaign** — also from `/admin`, create a campaign
(name, a short `slug` used in generated QR codes, total slot count, price
per slot). That single action bulk-creates all of that campaign's
`ad_slots` rows at once — empty, `payment_status: "unclaimed"`, codes like
`<slug>-01` through `<slug>-NN`. Advertisers then claim and pay for one
themselves at `/reserve` (Stripe Checkout); the webhook flips a slot to
`paid` once payment actually completes, or releases it back to
`unclaimed` if the Checkout session expires unpaid. Only one campaign
should be `status: "open"` at a time — `/reserve` shows whichever open
campaign was created most recently.

Either way, every `ad_slots` row gets a "Download" button on `/admin`
that generates a PNG QR code encoding `https://<your-domain>/r/<code>`,
ready to hand to a printer — this works the same regardless of which flow
created the row.

`/admin`, `/api/admin/*`, and `/api/reserve` are all gated by
`middleware.ts` requiring a signed-in session; `/admin` and
`/api/admin/*` additionally check `isAdmin()` in the page/route itself —
being signed in isn't enough on its own, only Clerk user ids listed in
`ADMIN_USER_IDS` get in. `/api/webhooks/stripe` is deliberately **not**
in that protected list — Stripe calls it directly with no Clerk session
at all, and its own signature check (`STRIPE_WEBHOOK_SECRET`) is what
authenticates it instead.

### Setting up Stripe

1. Stripe dashboard → **Developers → API keys** → copy the (test-mode,
   to start) secret key into `STRIPE_SECRET_KEY`.
2. Deploy this app so `/api/webhooks/stripe` actually exists at a public
   URL.
3. Stripe dashboard → **Developers → Webhooks** → add an endpoint at
   `https://<your-domain>/api/webhooks/stripe`, listening for
   `checkout.session.completed` and `checkout.session.expired`.
4. Copy the signing secret Stripe gives you into `STRIPE_WEBHOOK_SECRET`,
   redeploy.
5. Test the whole flow with Stripe's test card (`4242 4242 4242 4242`,
   any future expiry/CVC) before switching `STRIPE_SECRET_KEY` to a live
   key.

## Local development

```
npm install
cp .env.example .env.local   # fill in the values above
npm run dev
```

## Status

Technically complete and live at kyovaspotlight.com, including self-serve
slot reservation and payment. Deals closed off-platform (phone/in-person)
still go through `/admin`'s direct-create flow — the sales pipeline
tracking for those (contact info, follow-up dates) lives outside this
repo, in the advertiser tracker spreadsheet.

Needs doing before `/reserve` can actually take a payment:
- Run `supabase/migrations/0001_campaigns_and_reservations.sql` against
  the live database (see "Row Level Security" above for where).
- Set `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` — see "Setting up
  Stripe" above.
- Create the first campaign from `/admin`.

Optional, not blocking:
- Clerk is still on dev/test keys, which work fine on the custom domain
  but show a small Clerk branding badge and a "development mode" banner.
  Switching to a production Clerk instance (live keys, a `clerk.` DNS
  record) removes that — worth doing before real customer data flows
  through sign-in at volume.
- No automated tests. Every change so far has been verified with
  `tsc --noEmit` + `next build` + a real Vercel preview deployment per
  change, not a test suite.
