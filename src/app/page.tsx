import Link from "next/link";
import { Fragment } from "react";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatMoney } from "@/lib/money";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { CharityImage } from "@/components/charity-avatar";
import { Reveal } from "@/components/landing/reveal";
import { AnimatedCounter } from "@/components/landing/counter";
import { ImpactTicker } from "@/components/landing/impact-ticker";
import {
  HeartHandIcon,
  ScoreCardIcon,
  TrophyIcon,
  ChevronDownIcon,
  ArrowRightIcon,
  CheckIcon,
  ShieldCheckIcon,
  GiftIcon,
} from "@/components/icons";

// Public landing page. Leads with charitable impact (PRD §12), then explains what you do,
// how you win, and what it costs, with one clear call to action.
async function loadLiveNumbers() {
  const admin = createAdminClient();
  const [raised, pool, rollover, subs, plans, featured] = await Promise.all([
    admin.rpc("total_raised_cents"),
    admin.rpc("draw_pool_cents"),
    admin.rpc("current_rollover_cents"),
    admin.from("subscriptions").select("user_id", { count: "exact", head: true }).eq("status", "active").gt("current_period_end", new Date().toISOString()),
    admin.from("plans").select("id, name, price_cents, billing_months").eq("is_active", true),
    admin.from("charities").select("name, slug, description, image_url, category").eq("is_active", true)
      .order("is_featured", { ascending: false }).order("name").limit(1),
  ]);
  const planRows = (plans.data ?? []) as { id: string; name: string; price_cents: number; billing_months: number }[];
  return {
    raisedRupees: Math.floor(Number(raised.data ?? 0) / 100),
    poolRupees: Math.floor((Number(pool.data ?? 0) + Number(rollover.data ?? 0)) / 100),
    supporters: subs.count ?? 0,
    monthly: planRows.find((p) => p.id === "monthly"),
    yearly: planRows.find((p) => p.id === "yearly"),
    charity: ((featured.data ?? [])[0] ?? null) as { name: string; slug: string; description: string | null; image_url: string | null; category: string | null } | null,
  };
}

const STEPS = [
  {
    n: "1",
    title: "Subscribe & choose a cause",
    text: "Pick monthly or yearly, then choose the charity that receives at least 10% of your fee. Give more if you like.",
    Icon: HeartHandIcon,
  },
  {
    n: "2",
    title: "Log your five latest scores",
    text: "Add your Stableford scores (1 to 45) after each round. We keep your latest five, newest first.",
    Icon: ScoreCardIcon,
  },
  {
    n: "3",
    title: "Win & give, every month",
    text: "Each month we draw five numbers. Match three or more of your scores and share the prize pool.",
    Icon: TrophyIcon,
  },
];

const TIERS = [
  {
    match: "5 numbers",
    share: "40%",
    note: "The jackpot. If nobody wins, it rolls over to the next draw.",
    accent: "gold" as const,
    badge: "Jackpot",
  },
  {
    match: "4 numbers",
    share: "35%",
    note: "Shared equally between everyone who matches four.",
    accent: "emerald" as const,
    badge: "Tier 2",
  },
  {
    match: "3 numbers",
    share: "25%",
    note: "Shared equally between everyone who matches three.",
    accent: "teal" as const,
    badge: "Tier 3",
  },
];

const FAQ = [
  ["How does the draw work?", "Every month an admin runs a draw of five numbers between 1 and 45. If at least three of your five stored scores match, you win a share of that tier's prize pool. Admins simulate a draw before publishing it."],
  ["How much goes to charity?", "At least 10% of every subscription, and you choose the charity and can raise the share any time. You can also make separate one-off donations that have nothing to do with the draw."],
  ["How are prizes calculated?", "A fixed part of each subscription feeds the prize pool. The pool is split 40% / 35% / 25% across the three tiers and shared equally between winners in each tier. An unclaimed jackpot carries forward."],
  ["How do I claim a prize?", "Upload a screenshot of your scores from your golf platform. An admin reviews it, approves or rejects it, and then marks the payout as paid."],
  ["Is the payment real?", "No. This is a demonstration build: checkout uses a clearly labelled test gateway, no card details are collected and no real money moves. The payment layer is built so a real provider can be plugged in."],
];

// Visual subscription split bar (Charity vs Prize Pool vs Operations).
// Shares are illustrative; the actual minimum is 10% charity + the configured prize pool share.
const SPLIT = [
  { label: "Charity", pct: 25, color: "linear-gradient(90deg, rgb(52 211 153), rgb(20 184 166))" },
  { label: "Prize pool", pct: 50, color: "linear-gradient(90deg, rgb(251 191 36), rgb(217 119 6))" },
  { label: "Operations", pct: 25, color: "linear-gradient(90deg, rgb(82 82 91), rgb(63 63 70))" },
];

export default async function Home() {
  let d: Awaited<ReturnType<typeof loadLiveNumbers>> | null = null;
  try { d = await loadLiveNumbers(); } catch { d = null; } // the page still renders if live numbers fail

  return (
    <div className="flex min-h-screen flex-col bg-zinc-950 text-zinc-100">
      <SiteHeader />

      {/* Hero */}
      <section className="relative overflow-hidden">
        {/* Animated glow: three slow-drifting blurred orbs plus a faint dot grid */}
        <div aria-hidden className="hero-grid pointer-events-none absolute inset-0 opacity-40" />
        <div aria-hidden className="glow-drift-a pointer-events-none absolute -top-40 left-1/2 h-[520px] w-[820px] -translate-x-1/2 rounded-full bg-emerald-500/15 blur-3xl" />
        <div aria-hidden className="glow-drift-b pointer-events-none absolute -left-24 top-40 h-64 w-64 rounded-full bg-teal-400/10 blur-3xl" />
        <div aria-hidden className="glow-drift-c pointer-events-none absolute -right-10 top-24 h-56 w-56 rounded-full bg-amber-400/10 blur-3xl" />

        <div className="relative mx-auto max-w-4xl px-4 pb-12 pt-14 text-center sm:px-6 sm:pt-20">
          <Reveal>
            <p className="eyebrow mb-4">Play. Give. Win.</p>
            <h1 className="section-title text-4xl font-semibold leading-tight sm:text-6xl">
              Your game.{" "}
              <span className="bg-gradient-to-r from-emerald-300 via-emerald-400 to-teal-300 bg-clip-text text-transparent">
                Their future.
              </span>
            </h1>

            {/* Cinematic impact line: words rise in one after another.
                The space lives OUTSIDE the inline-block span so it isn't trimmed. */}
            <p
              className="mx-auto mt-6 max-w-2xl font-[family-name:var(--font-display)] text-xl italic leading-snug text-zinc-200 sm:text-2xl"
              aria-label="Every round you play puts someone's tomorrow in motion."
            >
              {["Every", "round", "you", "play", "puts", "someone's", "tomorrow", "in", "motion."].map((w, i) => (
                <Fragment key={i}>
                  <span
                    aria-hidden
                    className={`impact-word ${w === "tomorrow" ? "text-emerald-300" : ""}`}
                    style={{ ["--i" as string]: i } as React.CSSProperties}
                  >
                    {w}
                  </span>{" "}
                </Fragment>
              ))}
            </p>
            <p className="mx-auto mt-4 max-w-2xl text-base text-zinc-400 sm:text-lg">
              Every subscription funds a charity you choose, and every month your latest scores could win a share of the prize pool.
            </p>

            {/* Decorative draw balls (aria-hidden): the lottery feel at a glance */}
            <div aria-hidden className="mt-8 flex justify-center gap-2 sm:gap-3">
              {[7, 18, 24, 33, 41].map((n, i) => (
                <span key={n} className="draw-ball" style={{ ["--i" as string]: i } as React.CSSProperties}>
                  {n}
                </span>
              ))}
            </div>

            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link
                href="/subscribe"
                className="cta-pulse rounded-xl bg-emerald-500 px-6 py-3.5 text-base font-semibold text-zinc-950 shadow-lg shadow-emerald-500/20 transition hover:-translate-y-0.5 hover:bg-emerald-400 active:translate-y-0 sm:px-7 sm:text-lg"
              >
                Start giving: subscribe
              </Link>
              <a
                href="#how"
                className="rounded-xl border border-zinc-700 px-6 py-3.5 text-base transition hover:bg-zinc-900 sm:px-7 sm:text-lg"
              >
                See how it works
              </a>
            </div>
          </Reveal>

          {d && (
            <Reveal delay={0.15} className="mt-14 grid gap-4 sm:grid-cols-3">
              {[
                { label: "Raised for charity so far", node: <AnimatedCounter value={d.raisedRupees} prefix="₹" />, tone: "emerald" as const },
                { label: "Prize pool for the next draw", node: <AnimatedCounter value={d.poolRupees} prefix="₹" />, tone: "gold" as const },
                { label: "Active supporters", node: <AnimatedCounter value={d.supporters} />, tone: "teal" as const },
              ].map((s) => (
                <div
                  key={s.label}
                  className="kpi-card p-5"
                  data-accent={s.tone}
                >
                  <p className={`text-3xl font-semibold ${s.tone === "gold" ? "text-gold-gradient" : "text-emerald-300"}`}>
                    {s.node}
                  </p>
                  <p className="mt-1 text-sm text-zinc-400">{s.label}</p>
                </div>
              ))}
            </Reveal>
          )}
        </div>

        <ImpactTicker
          items={[
            ...(d ? [`₹${d.raisedRupees.toLocaleString("en-IN")} raised for charity so far`] : []),
            "At least 10% of every subscription goes to your chosen cause",
            ...(d ? [`₹${d.poolRupees.toLocaleString("en-IN")} in the next prize pool`] : []),
            "Match 5 numbers to win the jackpot, and it rolls over if unclaimed",
            ...(d ? [`${d.supporters.toLocaleString("en-IN")} active supporters and counting`] : []),
            "Every month, a new draw. Every month, a new chance to give.",
          ]}
        />
      </section>

      {/* How it works — illustrated step cards */}
      <section id="how" className="mx-auto w-full max-w-5xl px-4 py-16 sm:px-6">
        <Reveal>
          <p className="eyebrow">Three steps</p>
          <h2 className="section-title mt-2 text-3xl font-semibold">How it works</h2>
        </Reveal>
        <div className="mt-8 grid gap-5 md:grid-cols-3">
          {STEPS.map((s, i) => (
            <Reveal key={s.n} delay={i * 0.1}>
              <div className="glass-card group h-full p-6">
                <div className="flex items-start justify-between gap-3">
                  <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 transition-transform duration-300 group-hover:scale-110">
                    <s.Icon size={22} />
                  </span>
                  <span className="font-[family-name:var(--font-display)] text-3xl font-semibold text-white/10 transition-colors duration-300 group-hover:text-emerald-500/25 sm:text-4xl">
                    {s.n}
                  </span>
                </div>
                <h3 className="mt-4 font-medium text-zinc-100">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-zinc-400">{s.text}</p>
              </div>
            </Reveal>
          ))}
        </div>

        {/* Visual subscription split bar */}
        <Reveal delay={0.1}>
          <div className="glass-card mt-8 p-6">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="font-medium text-zinc-100">Where your subscription goes</h3>
              <p className="text-xs text-zinc-500">Example split · charity share is user-controlled (min 10%)</p>
            </div>
            <div className="split-bar mt-4">
              {SPLIT.map((s) => (
                <span
                  key={s.label}
                  title={`${s.label} · ${s.pct}%`}
                  style={{ width: `${s.pct}%`, background: s.color }}
                />
              ))}
            </div>
            <ul className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
              {SPLIT.map((s) => (
                <li key={s.label} className="flex items-center gap-2">
                  <span
                    aria-hidden
                    className="inline-block h-2.5 w-2.5 rounded-full"
                    style={{ background: s.color }}
                  />
                  <span className="text-zinc-300">{s.label}</span>
                  <span className="ml-auto font-semibold text-zinc-100">{s.pct}%</span>
                </li>
              ))}
            </ul>
          </div>
        </Reveal>
      </section>

      {/* Prize tiers — richer cards */}
      <section className="mx-auto w-full max-w-5xl px-4 py-12 sm:px-6">
        <Reveal>
          <p className="eyebrow">The draw</p>
          <h2 className="section-title mt-2 text-3xl font-semibold">How you win</h2>
          <p className="mt-2 max-w-2xl text-zinc-400">
            Three ways to win each month. The pool is shared out automatically.
          </p>
        </Reveal>
        <div className="mt-8 grid gap-5 md:grid-cols-3">
          {TIERS.map((t, i) => (
            <Reveal key={t.match} delay={i * 0.1}>
              <div
                className={`kpi-card h-full p-6 ${t.accent === "gold" ? "ring-1 ring-amber-400/20" : ""}`}
                data-accent={t.accent}
              >
                <div className="flex items-center justify-between">
                  <span className="accent-badge" data-tone={t.accent}>{t.badge}</span>
                  <TrophyIcon size={18} className={t.accent === "gold" ? "text-amber-300" : "text-emerald-300"} />
                </div>
                <p className="mt-4 text-sm text-zinc-400">Match {t.match}</p>
                <p
                  className={`mt-1 text-4xl font-semibold ${t.accent === "gold" ? "text-gold-gradient" : "text-emerald-300"}`}
                >
                  {t.share}
                </p>
                <p className="mt-3 text-sm leading-relaxed text-zinc-400">{t.note}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Charity spotlight */}
      {d?.charity && (
        <section className="mx-auto w-full max-w-5xl px-4 py-16 sm:px-6">
          <Reveal>
            <Link
              href={`/charities/${d.charity.slug}`}
              className="glass-card group grid overflow-hidden md:grid-cols-2"
            >
              <CharityImage name={d.charity.name} url={d.charity.image_url} className="h-64 w-full md:h-full" />
              <div className="p-6 sm:p-8">
                <p className="text-xs uppercase tracking-widest text-amber-300">Charity spotlight</p>
                <h2 className="section-title mt-2 text-2xl sm:text-3xl">{d.charity.name}</h2>
                {d.charity.category && (
                  <p className="mt-1 text-sm text-emerald-300">{d.charity.category}</p>
                )}
                <p className="mt-4 line-clamp-4 text-zinc-400">{d.charity.description}</p>
                <p className="mt-6 inline-flex items-center gap-1 text-emerald-400 transition group-hover:gap-2">
                  Meet this cause <ArrowRightIcon size={14} />
                </p>
              </div>
            </Link>
          </Reveal>
          <p className="mt-4 text-center text-sm">
            <Link href="/charities" className="text-emerald-400 hover:underline">Explore all charities →</Link>
          </p>
        </section>
      )}

      {/* Pricing */}
      {d?.monthly && d?.yearly && (
        <section className="mx-auto w-full max-w-4xl px-4 py-12 sm:px-6">
          <Reveal>
            <p className="eyebrow text-center">Simple pricing</p>
            <h2 className="section-title mt-2 text-center text-3xl font-semibold">Simple pricing</h2>
          </Reveal>
          <div className="mt-8 grid gap-5 md:grid-cols-2">
            {[d.monthly, d.yearly].map((p) => {
              const yearly = p.id === "yearly";
              return (
                <Reveal key={p.id}>
                  <div
                    className={`glass-card relative p-6 sm:p-7 ${yearly ? "ring-1 ring-emerald-500/40" : ""}`}
                  >
                    {yearly && (
                      <span className="absolute -top-3 left-6 inline-flex items-center gap-1 rounded-full border border-amber-400/40 bg-amber-400/15 px-3 py-1 text-xs font-semibold text-amber-300">
                        <CheckIcon size={12} /> Best value
                      </span>
                    )}
                    <h3 className="text-lg font-medium text-zinc-100">{p.name}</h3>
                    <p className="mt-2 text-4xl font-semibold text-white">
                      {formatMoney(p.price_cents)}
                      <span className="text-base font-normal text-zinc-400"> / {p.billing_months === 12 ? "year" : "month"}</span>
                    </p>
                    <ul className="mt-4 space-y-2 text-sm text-zinc-400">
                      <li className="flex items-center gap-2">
                        <GiftIcon size={14} className="text-emerald-300" />
                        At least 10% to your chosen charity
                      </li>
                      <li className="flex items-center gap-2">
                        <TrophyIcon size={14} className="text-amber-300" />
                        Auto entry into every monthly draw
                      </li>
                      <li className="flex items-center gap-2">
                        <ShieldCheckIcon size={14} className="text-emerald-300" />
                        Cancel anytime · test gateway, no real charges
                      </li>
                    </ul>
                    <Link
                      href="/subscribe"
                      className="mt-6 block rounded-xl bg-emerald-500 px-5 py-3 text-center font-semibold text-zinc-950 transition hover:bg-emerald-400"
                    >
                      Subscribe
                    </Link>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </section>
      )}

      {/* FAQ — accordion */}
      <section className="mx-auto w-full max-w-3xl px-4 py-16 sm:px-6">
        <Reveal>
          <p className="eyebrow">Questions</p>
          <h2 className="section-title mt-2 text-3xl font-semibold">Frequently asked</h2>
        </Reveal>
        <div className="mt-6 space-y-2">
          {FAQ.map(([q, a]) => (
            <details key={q} className="faq-item">
              <summary>
                <span>{q}</span>
                <ChevronDownIcon size={16} className="chev" />
              </summary>
              <div className="faq-body">{a}</div>
            </details>
          ))}
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
