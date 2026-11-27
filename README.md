# Digital Heroes: play, give, win

A subscription web app that combines **golf score tracking**, **charity fundraising** and a **monthly prize draw**.
It leads with charitable impact, not sport. Built for the Digital Heroes PRD (Level 1, 2026 edition).

| | |
|---|---|
| **Live site** | https://digital-heroes-rho-pied.vercel.app |
| **Source code** | https://github.com/ramanjaneyulu-dev/digital-heroes |
| **Demo subscriber** | `demo.subscriber@example.com` / `Demo@12345` |
| **Demo admin** | `demo.admin@example.com` / `Admin@12345` |
| **Payments** | Stripe Checkout in **test (sandbox) mode**. No real money moves. |

## Testing a payment (Stripe sandbox)

1. Log in with any account that has no active subscription (or sign up), open **Subscribe**, choose a plan, a charity and a percentage (minimum 10%).
2. On the Stripe page use the test card **`4242 4242 4242 4242`**, any future expiry (for example `12/34`), any 3-digit CVC, any name and postcode.
3. You return to the dashboard with an active subscription, the renewal date, and a payment row split into charity / prize pool / platform.
4. To see a failure, use the decline test card **`4000 0000 0000 0002`**.

The demo accounts already have active subscriptions, scores, draws and winners, so every screen has data without paying.

## Stack

| Area | Choice | Why |
|---|---|---|
| Framework | Next.js 16 (App Router), React 19, TypeScript | Server Actions keep rules on the server; one codebase |
| UI | Tailwind CSS v4, Framer Motion, Recharts | Fast, consistent, motion-enhanced, mobile-first |
| Backend | Supabase (Postgres, Auth, Storage, RLS) | Real constraints, triggers and row-level security |
| Payments | Stripe Checkout (hosted) + webhook; built-in demo gateway as fallback | No card data ever touches this app (PCI-friendly) |
| Tests | Vitest (`npm test`) | Money, score, draw, charity and winner rules are pure, tested modules |
| Hosting | Vercel (new account) + Supabase (new project) | Per PRD §15.1. Vercel function region `bom1` matches Supabase `ap-south-1` for low latency |

## Architecture

```
Browser ──> Next.js (Server Components + Server Actions + Route Handler) ──> Supabase Postgres
              │  requireUser / requireAdmin: role checks on the server       │ constraints, triggers, RLS
              │  src/lib/draw      pure draw engine (no DB/UI imports)       │ SECURITY DEFINER functions
              │  src/lib/money     pure integer money maths                  │ (callable by the service role only)
              │  src/lib/payments  PaymentProvider interface                 └ Storage: proofs (private),
              │      ├─ stripe.ts  hosted Checkout session                     charity-media (public)
              │      └─ demo.ts    built-in test gateway
              └─ /webhooks/stripe  verifies the signature, then calls complete_checkout()

Stripe ──checkout.session.completed──> /webhooks/stripe ──> complete_checkout(session, payment_id)  (idempotent)
         └─ success redirect ──> /checkout/success re-checks the session with Stripe (backup path, same idempotent function)
```

Principles: money is stored as **integers** (paise); business rules live **in the database** (constraints, triggers, RLS)
and in **pure tested modules**; money and draw operations are **idempotent**; admin checks happen **on the server**;
the secret key is used **only in server code**; percentages are **settings-driven**, not hard-coded.

## Payments in detail

- **Provider switch:** `PAYMENT_PROVIDER=stripe` uses Stripe; `demo` uses the built-in test gateway. Adding another gateway (for example Razorpay) means one adapter file plus one `case` in `src/lib/payments/index.ts`.
- **Flow:** the server creates a `payment_sessions` row (price always read from the database, never from the browser), then a Stripe Checkout Session in INR (amount in paise) with the internal session id in `client_reference_id` and `metadata`.
- **Recording the payment:** Stripe calls **`POST /webhooks/stripe`** (event `checkout.session.completed`). The route verifies the `stripe-signature` header with `STRIPE_WEBHOOK_SECRET`, then calls the database function `complete_checkout`, which writes the `payments` ledger row, activates the subscription and stores the charity choice **in one transaction**. The success page re-checks the session with Stripe as a backup. Both paths use the Stripe payment id as a UNIQUE key, so a payment can never be counted twice.
- **Money split:** `charity = round(price × charity%)`, `prize pool = floor((price − charity) × prize_pool_share)`, `platform = the rest`. A CHECK constraint forces the three parts to add up to the price exactly. Example: ₹499 at 10% → charity 4,990 / prize pool 22,455 / platform 22,455 paise.
- **One-off donations** (independent of the draw) use the built-in sandbox gateway in every mode.

## Environment variables

| Name | Where | Purpose |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | public | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | public | Supabase publishable key |
| `SUPABASE_SECRET_KEY` | **server only** | Bypasses RLS. Used only in server code |
| `NEXT_PUBLIC_APP_URL` | public | The site's public URL (Stripe return links) |
| `PAYMENT_PROVIDER` | server | `stripe` or `demo` |
| `STRIPE_SECRET_KEY` | **server only** | Stripe test secret key (`sk_test_...`) |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | public | Stripe test publishable key (hosted Checkout does not need it; reserved for client-side use) |
| `STRIPE_WEBHOOK_SECRET` | **server only** | Signing secret of the webhook endpoint (`whsec_...`) |

Secrets live only in environment variables (`.env.local` locally, Vercel project settings in production). `.env.local` is git-ignored.

## Run locally

```bash
npm install
cp .env.example .env.local        # then fill in your own values
npm run dev                       # http://localhost:3000
npm test                          # unit tests
npx tsc --noEmit                  # type-check
```

1. **Database:** in the Supabase SQL Editor run, in order, `supabase/001_schema.sql`, `002_payments.sql`, `003_draws.sql`, `004_charities.sql`, `005_admin_reports.sql`.
2. **Admin:** `update profiles set role = 'admin' where email = '<your email>';`
3. **Demo data (optional):** `npx tsx --env-file=.env.local scripts/seed.ts` creates 17 subscribers, the demo logins, two published draws (with a jackpot rollover), winners in every verification state and sample donations.
4. **Payments without Stripe:** leave `PAYMENT_PROVIDER=demo`. A labelled test checkout page and dashboard "demo tools" (simulate renewal / end of period) appear.
5. **Payments with Stripe (test mode):** set `PAYMENT_PROVIDER=stripe` plus the three Stripe variables. For local webhooks run `stripe listen --forward-to localhost:3000/webhooks/stripe` and copy the printed `whsec_...` into `STRIPE_WEBHOOK_SECRET`. In production add an endpoint `https://<your-domain>/webhooks/stripe` for the event `checkout.session.completed` in the Stripe dashboard.
6. **Supabase Auth:** set Site URL and Redirect URLs to your app URL. "Confirm email" is off so reviewers can sign up instantly.

## What was built (PRD coverage)

- **Public visitor:** emotion-first landing page with live charity totals, how-it-works, prize tiers, charity spotlight, pricing and FAQ; charity directory with search, category filter and profiles with events.
- **Subscriber:** signup/login; monthly and yearly plans; charity choice with a 10–100% slider; score entry with 5-score rolling logic; dashboard with subscription status and renewal date, scores, charity and %, draw participation and upcoming draw, winnings and payout status, payment history; winner proof upload; independent donations.
- **Admin:** overview; user management (edit profile and scores, manage subscription); draw management (random or algorithmic, simulate, publish); charity CRUD with events and images; winner review (approve / reject / mark paid); reports with charts (users, prize pool, charity totals, draw statistics).

## PRD ambiguities and how they were resolved

| Gap in the PRD | Decision |
|---|---|
| What are the "draw numbers"? | 5 distinct numbers from 1–45 (the Stableford range). A user matches against the **distinct values** of their 5 scores. |
| Who is eligible? | An active, paid-up subscription **and exactly 5 stored scores**. Scores are **snapshotted** into `draw_entries` so results stay auditable. |
| "Fixed portion" of a subscription to the pool | `settings.prize_pool_share` (default 50%) of the fee **after** the charity cut. Configurable. Yearly plans contribute fee ÷ 12 per draw. |
| "Algorithmic, weighted by score frequency" | Two admin-selectable modes: favour the most common scores, or the rarest. Every number keeps weight ≥ 1. |
| Jackpot rollover | `rollover_in_cents` / `rollover_out_cents` per draw. Only the 5-match tier rolls over (per the PRD table). |
| Rounding and equal splits | Floor division. Leftover paise roll over, so **prizes + rollover + unclaimed = pool exactly** (property-tested). |
| Simulation vs publish | `draft → simulated → published`. A simulation writes no winners. Publish runs in **one database transaction**, locks the draw, and cannot run twice. |
| More than one draw a month | `draws.draw_month` is not unique, so several draws per month are allowed. |
| Duplicate score date | `UNIQUE(user_id, played_on)`. Edit or delete instead. No future dates. |
| Rolling 5 retention | A Postgres **BEFORE INSERT trigger** (with an advisory lock) deletes the oldest score. A date older than all 5 is rejected. |
| Independent donation | A separate `donations` table, outside the subscription and draw maths. |
| "Restricted access" for non-subscribers | They can log in and see a locked dashboard with a Subscribe prompt. Score writes are blocked by the server **and** by RLS. |
| Charity minimum | CHECK constraint 10–100 in the database plus server validation. |
| Real-time subscription check | `getSubscriptionState()` runs on every authenticated request and flips expired subscriptions to `lapsed`. |

## Draw algorithm

1. Eligible entrants are read in pages from `draw_eligible_entries()`.
2. Winning numbers: crypto-random (Fisher–Yates), or weighted sampling without replacement from score frequencies.
3. Each entrant's distinct scores are matched: 5 / 4 / 3 matches → tiers `match_5/4/3`.
4. Pool = sum of `prize_pool_cents / billing_months` over payments whose paid period covers the draw, **plus the rollover** from the last published draw.
5. Tier amount = `floor(pool × split%)` (default 40/35/25, validated to total 100). Winners in a tier split equally.
6. An empty 5-match tier rolls over; empty 4- and 3-match tiers stay unclaimed.
7. `publish_draw()` writes entries, winners and totals atomically and re-checks the rollover under a lock.

## Security

Three roles (visitor, subscriber, admin). Protected routes are guarded by `proxy.ts` **and** by `requireUser()` / `requireAdmin()` in every page and Server Action. Row Level Security is on for every table. Winner proofs live in a **private** bucket and are shown through 10-minute signed links; uploads are validated by file **content** (PNG/JPG/WebP) and size (5 MB). Stripe webhooks are signature-verified. Raw database errors are never shown to users. Security headers are set in `next.config.ts`.

## Scalability

Indexed score and draw-entry queries · pagination on all admin lists · rolling-5 enforced at write time · pure draw engine isolated from the UI · simulation never publishes · prize maths safe to re-run · several draws per month · charities added without a redeploy · pool percentages stored in `settings` · reporting aggregates computed in SQL functions · payment provider behind one interface.

## Known limitations

- Stripe runs in **test mode** only. Each billing period is one Checkout payment, so renewals are not charged automatically (Stripe Billing subscriptions would be the next step). In demo mode the dashboard offers renewal and end-of-period simulators so the full lifecycle can be seen.
- One-off donations use the sandbox gateway.
- Changing plan while subscribed (monthly ↔ yearly) and a full "payment failed" recovery journey are not built.
- Two draws in the same month would each count the same subscriptions in their pools.
- Email confirmation is switched off for easy reviewing.
