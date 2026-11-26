# Digital Heroes: play, give, win

A subscription web app that combines **golf score tracking**, **charity fundraising** and a **monthly prize draw**.
It leads with charitable impact, not sport.

- **Live site:** `<PASTE VERCEL URL>`
- **Demo subscriber:** `demo.subscriber@example.com` / `Demo@12345`
- **Demo admin:** `demo.admin@example.com` / `Admin@12345`
- **Source:** `<PASTE GITHUB URL>`

> **Honest note on payments.** Stripe is invite-only and Razorpay needs a PAN in India, so the live site uses a
> clearly labelled **Demo Gateway**: no card data is collected and no real money moves. Payments sit behind a
> `PaymentProvider` interface (`src/lib/payments/`), so a real gateway is **one adapter file plus one `case`** away.

## Stack

| Area | Choice | Why |
|---|---|---|
| Framework | Next.js 16 (App Router), React 19, TypeScript | Server Actions keep rules on the server; one codebase |
| UI | Tailwind CSS v4, Framer Motion, Recharts | Fast, consistent, motion-enhanced |
| Backend | Supabase (Postgres, Auth, Storage, RLS) | Real constraints, triggers and row-level security |
| Tests | Vitest (50 tests) | Money, score, draw and winner rules are pure, tested modules |
| Hosting | Vercel (new account) | Per PRD §15.1 |

## Architecture in one picture

```
Browser ──> Next.js (Server Components + Server Actions) ──> Supabase Postgres
              │  requireUser / requireAdmin (server-side role checks)      │ constraints, triggers, RLS
              │  src/lib/draw   (pure draw engine, no DB/UI imports)       │ SECURITY DEFINER functions
              │  src/lib/money  (pure integer money maths)                 │ (service role only)
              └─ src/lib/payments (provider interface + demo gateway)     └─ Storage: proofs (private), charity-media (public)
```

Principles: money is stored as **integers** (paise); business rules live **in the database** (constraints, triggers, RLS)
and in **pure tested modules**; money and draw operations are **idempotent**; admin checks happen **on the server**;
the secret key is used **only in server code**; percentages are **settings-driven**, not hard-coded.

## PRD ambiguities and how they were resolved

| Gap in the PRD | Decision |
|---|---|
| What are the "draw numbers"? | 5 distinct numbers from 1-45 (the Stableford range). A user matches against the **distinct values** of their 5 scores. |
| Who is eligible? | An active, paid-up subscription **and exactly 5 stored scores**. Scores are **snapshotted** into `draw_entries` so results stay auditable. |
| "Fixed portion" of a subscription to the pool | `settings.prize_pool_share` (default 50%) of the fee **after** the charity cut. Configurable. Yearly plans contribute fee / 12 per draw. |
| "Algorithmic, weighted by score frequency" | Two admin-selectable modes: favour the most common scores, or the rarest. Every number keeps weight >= 1. |
| Jackpot rollover | `rollover_in_cents` / `rollover_out_cents` per draw. Only the 5-match tier rolls over (per the PRD table). |
| Rounding and equal splits | Floor division. Leftover paise (rounding and uneven splits) roll over, so **prizes + rollover + unclaimed = pool exactly** (property-tested). |
| Simulation vs publish | `draft -> simulated -> published`. A simulation writes no winners. Publish runs in **one database transaction**, locks the draw, and cannot run twice. |
| More than one draw a month | `draws.draw_month` is not unique. Limitation: two draws in one month would each count the same subscriptions in their pool. |
| Duplicate score date | `UNIQUE(user_id, played_on)`. Edit or delete instead. No future dates. |
| Rolling 5 retention | A Postgres **BEFORE INSERT trigger** (with an advisory lock) deletes the oldest score. A date older than all 5 is rejected. |
| Independent donation | A separate `donations` table, outside the subscription and draw maths. |
| "Restricted access" for non-subscribers | They can log in and see a locked dashboard with a Subscribe prompt. Score writes are blocked by the server **and** by RLS. |
| Charity minimum | CHECK constraint 10-100 in the database plus server validation. |
| Real-time subscription check | `getSubscriptionState()` runs on every authenticated request and flips expired subscriptions to `lapsed`. |

## Money flow

For a payment of price P with charity share c%: `charity = round(P x c/100)`; `prize pool = floor((P - charity) x prize_pool_share)`;
`platform = the rest`. A database CHECK enforces that the three parts add up to P exactly. Example: Rs 499 at 10% ->
charity 4,990 / prize pool 22,455 / platform 22,455 paise. Every successful payment is one row in the `payments`
ledger with a UNIQUE `provider_payment_id`, so replaying an event can never double-count.

## Draw algorithm

1. Eligible entrants are read in pages from `draw_eligible_entries()`.
2. Winning numbers: crypto-random (Fisher-Yates), or weighted sampling without replacement from score frequencies.
3. Each entrant's distinct scores are matched: 5 / 4 / 3 matches -> tiers `match_5/4/3`.
4. Pool = sum of `prize_pool_cents / billing_months` over payments whose paid period covers the draw, **plus the rollover** from the last published draw.
5. Tier amount = `floor(pool x split%)` (default 40/35/25, validated to sum to 100). Winners split equally.
6. An empty 5-match tier rolls over; empty 4/3 tiers stay unclaimed.
7. `publish_draw()` writes entries, winners and totals atomically and re-checks the rollover under a lock.

## Roles and security

Public visitor, subscriber and admin. Protected routes are guarded by `proxy.ts` **and** by `requireUser()` / `requireAdmin()`
in every page and Server Action. Row Level Security is enabled on every table. Winner proofs live in a **private** bucket
and are shown through 10-minute signed links. Uploads are validated by file **content** (PNG/JPG/WebP) and size (5 MB).
Raw database errors are never shown. Secrets live only in environment variables.

## Scalability decisions

Indexed score and draw-entry queries - pagination on all admin lists - rolling-5 enforced at write time - pure draw engine isolated
from the UI - simulation never publishes - prize maths is safe to re-run - several draws per month supported - charities added
without a redeploy - pool percentages stored in `settings` - reporting aggregates computed in SQL functions.

## Run locally

```bash
npm install
cp .env.example .env.local     # fill in your own Supabase values
npm run dev                    # http://localhost:3000
npm test                       # 50 tests
```

In the Supabase SQL Editor run, in order: `supabase/001_schema.sql`, `002_payments.sql`, `003_draws.sql`, `004_charities.sql`, `005_admin_reports.sql`.
Optional demo data: `npm i -D tsx` then `npx tsx --env-file=.env.local scripts/seed.ts`.
Make yourself an admin: `update profiles set role = 'admin' where email = '<email>';`

### Environment variables

| Name | Purpose |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Public (publishable) key |
| `SUPABASE_SECRET_KEY` | **Server only.** Bypasses RLS |
| `NEXT_PUBLIC_APP_URL` | The site's public URL |
| `PAYMENT_PROVIDER` | `demo` |

## Known limitations

- Demo payment gateway only (no real charges).
- Plan change while subscribed (monthly <-> yearly) and a full failed-renewal ("past due") journey are not built.
- Two draws in the same month would double-count the same subscription money in their pools.
- Email confirmation is switched off so evaluators can sign up instantly.
