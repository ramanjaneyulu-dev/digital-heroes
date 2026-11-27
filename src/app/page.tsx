import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatMoney } from "@/lib/money";
import { SiteHeader } from "@/components/site-header";
import { CharityImage } from "@/components/charity-avatar";
import { Reveal } from "@/components/landing/reveal";
import { AnimatedCounter } from "@/components/landing/counter";
import { ImpactTicker } from "@/components/landing/impact-ticker";

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
  { n: "1", title: "Subscribe and choose a cause", text: "Pick monthly or yearly, then choose the charity that receives at least 10% of your fee. Give more if you like." },
  { n: "2", title: "Log your five latest scores", text: "Add your Stableford scores (1 to 45) after each round. We keep your latest five, newest first." },
  { n: "3", title: "Win and give, every month", text: "Each month we draw five numbers. Match three or more of your scores and share the prize pool." },
];

const TIERS = [
  { match: "5 numbers", share: "40%", note: "The jackpot. If nobody wins, it rolls over to the next draw.", accent: "text-amber-300" },
  { match: "4 numbers", share: "35%", note: "Shared equally between everyone who matches four.", accent: "text-emerald-300" },
  { match: "3 numbers", share: "25%", note: "Shared equally between everyone who matches three.", accent: "text-emerald-300" },
];

const FAQ = [
  ["How does the draw work?", "Every month an admin runs a draw of five numbers between 1 and 45. If at least three of your five stored scores match, you win a share of that tier's prize pool. Admins simulate a draw before publishing it."],
  ["How much goes to charity?", "At least 10% of every subscription, and you choose the charity and can raise the share any time. You can also make separate one-off donations that have nothing to do with the draw."],
  ["How are prizes calculated?", "A fixed part of each subscription feeds the prize pool. The pool is split 40% / 35% / 25% across the three tiers and shared equally between winners in each tier. An unclaimed jackpot carries forward."],
  ["How do I claim a prize?", "Upload a screenshot of your scores from your golf platform. An admin reviews it, approves or rejects it, and then marks the payout as paid."],
  ["Is the payment real?", "No. This is a demonstration build: checkout uses a clearly labelled test gateway, no card details are collected and no real money moves. The payment layer is built so a real provider can be plugged in."],
];

export default async function Home() {
  let d: Awaited<ReturnType<typeof loadLiveNumbers>> | null = null;
  try { d = await loadLiveNumbers(); } catch { d = null; } // the page still renders if live numbers fail

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <SiteHeader />

      {/* Hero */}
      <section className="relative overflow-hidden">
        {/* Animated glow: three slow-drifting blurred orbs plus a faint dot grid */}
        <div aria-hidden className="hero-grid pointer-events-none absolute inset-0 opacity-40" />
        <div aria-hidden className="glow-drift-a pointer-events-none absolute -top-40 left-1/2 h-[520px] w-[820px] -translate-x-1/2 rounded-full bg-emerald-500/15 blur-3xl" />
        <div aria-hidden className="glow-drift-b pointer-events-none absolute -left-24 top-40 h-64 w-64 rounded-full bg-teal-400/10 blur-3xl" />
        <div aria-hidden className="glow-drift-c pointer-events-none absolute -right-10 top-24 h-56 w-56 rounded-full bg-amber-400/10 blur-3xl" />
        <div className="relative mx-auto max-w-4xl px-4 pb-16 pt-16 text-center sm:px-6 sm:pt-20">
          <Reveal>
            <p className="mb-4 text-sm uppercase tracking-[0.2em] text-emerald-400">Play. Give. Win.</p>
            <h1 className="font-[family-name:var(--font-display)] text-5xl font-semibold leading-tight sm:text-6xl">
              Your game. <span className="bg-gradient-to-r from-emerald-300 via-emerald-400 to-teal-300 bg-clip-text text-transparent">Their future.</span>
            </h1>

            {/* Cinematic impact line: words rise in one after another */}
            <p className="mx-auto mt-6 max-w-2xl font-[family-name:var(--font-display)] text-xl italic leading-snug text-zinc-200 sm:text-2xl" aria-label="Every round you play puts someone's tomorrow in motion.">
              {["Every", "round", "you", "play", "puts", "someone's", "tomorrow", "in", "motion."].map((w, i) => (
                <span key={i} aria-hidden className={`impact-word ${w === "tomorrow" ? "text-emerald-300" : ""}`} style={{ ["--i" as string]: i } as React.CSSProperties}>{w}{" "}</span>
              ))}
            </p>
            <p className="mx-auto mt-4 max-w-2xl text-base text-zinc-400 sm:text-lg">
              Every subscription funds a charity you choose, and every month your latest scores could win a share of the prize pool.
            </p>

            {/* Decorative draw balls (aria-hidden): the lottery feel at a glance */}
            <div aria-hidden className="mt-8 flex justify-center gap-2.5 sm:gap-3">
              {[7, 18, 24, 33, 41].map((n, i) => (
                <span key={n} className="draw-ball" style={{ ["--i" as string]: i } as React.CSSProperties}>{n}</span>
              ))}
            </div>

            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link href="/subscribe" className="cta-pulse rounded-xl bg-emerald-500 px-7 py-3.5 text-lg font-semibold text-zinc-950 shadow-lg shadow-emerald-500/20 transition hover:-translate-y-0.5 hover:bg-emerald-400 active:translate-y-0">
                Start giving: subscribe
              </Link>
              <a href="#how" className="rounded-xl border border-zinc-700 px-7 py-3.5 text-lg transition hover:bg-zinc-900">See how it works</a>
            </div>
          </Reveal>

          {d && (
            <Reveal delay={0.15} className="mt-14 grid gap-4 sm:grid-cols-3">
              {[
                { label: "Raised for charity so far", node: <AnimatedCounter value={d.raisedRupees} prefix="₹" /> },
                { label: "Prize pool for the next draw", node: <AnimatedCounter value={d.poolRupees} prefix="₹" /> },
                { label: "Active supporters", node: <AnimatedCounter value={d.supporters} /> },
              ].map((s) => (
                <div key={s.label} className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5">
                  <p className="text-3xl font-semibold text-emerald-300">{s.node}</p>
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

      {/* How it works */}
      <section id="how" className="mx-auto max-w-5xl px-6 py-16">
        <Reveal><h2 className="font-[family-name:var(--font-display)] text-3xl font-semibold">How it works</h2></Reveal>
        <div className="mt-8 grid gap-5 md:grid-cols-3">
          {STEPS.map((s, i) => (
            <Reveal key={s.n} delay={i * 0.1}>
              <div className="h-full rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6 transition hover:border-emerald-500/40">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-500/15 font-semibold text-emerald-300">{s.n}</span>
                <h3 className="mt-4 font-medium">{s.title}</h3>
                <p className="mt-2 text-sm text-zinc-400">{s.text}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Prize tiers */}
      <section className="mx-auto max-w-5xl px-6 py-12">
        <Reveal>
          <h2 className="font-[family-name:var(--font-display)] text-3xl font-semibold">How you win</h2>
          <p className="mt-2 max-w-2xl text-zinc-400">Three ways to win each month. The pool is shared out automatically.</p>
        </Reveal>
        <div className="mt-8 grid gap-5 md:grid-cols-3">
          {TIERS.map((t, i) => (
            <Reveal key={t.match} delay={i * 0.1}>
              <div className="h-full rounded-2xl border border-zinc-800 bg-gradient-to-b from-zinc-900/80 to-zinc-900/30 p-6">
                <p className="text-sm text-zinc-400">Match {t.match}</p>
                <p className={`mt-1 text-4xl font-semibold ${t.accent}`}>{t.share}</p>
                <p className="mt-3 text-sm text-zinc-400">{t.note}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Charity spotlight */}
      {d?.charity && (
        <section className="mx-auto max-w-5xl px-6 py-16">
          <Reveal>
            <Link href={`/charities/${d.charity.slug}`} className="grid overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-900/50 transition hover:border-emerald-500/40 md:grid-cols-2">
              <CharityImage name={d.charity.name} url={d.charity.image_url} className="h-64 w-full md:h-full" />
              <div className="p-8">
                <p className="text-xs uppercase tracking-widest text-amber-300">Charity spotlight</p>
                <h2 className="mt-2 font-[family-name:var(--font-display)] text-3xl font-semibold">{d.charity.name}</h2>
                {d.charity.category && <p className="mt-1 text-sm text-emerald-300">{d.charity.category}</p>}
                <p className="mt-4 line-clamp-4 text-zinc-400">{d.charity.description}</p>
                <p className="mt-6 text-emerald-400">Meet this cause →</p>
              </div>
            </Link>
          </Reveal>
          <p className="mt-4 text-center text-sm"><Link href="/charities" className="text-emerald-400 hover:underline">Explore all charities →</Link></p>
        </section>
      )}

      {/* Pricing */}
      {d?.monthly && d?.yearly && (
        <section className="mx-auto max-w-4xl px-6 py-12">
          <Reveal><h2 className="text-center font-[family-name:var(--font-display)] text-3xl font-semibold">Simple pricing</h2></Reveal>
          <div className="mt-8 grid gap-5 md:grid-cols-2">
            {[d.monthly, d.yearly].map((p) => (
              <Reveal key={p.id}>
                <div className={`rounded-2xl border p-7 ${p.id === "yearly" ? "border-emerald-500/60 bg-emerald-500/5" : "border-zinc-800 bg-zinc-900/50"}`}>
                  {p.id === "yearly" && <p className="mb-2 inline-block rounded-full bg-amber-400/15 px-3 py-0.5 text-xs text-amber-300">Best value</p>}
                  <h3 className="text-lg font-medium">{p.name}</h3>
                  <p className="mt-2 text-4xl font-semibold">{formatMoney(p.price_cents)}<span className="text-base font-normal text-zinc-400"> / {p.billing_months === 12 ? "year" : "month"}</span></p>
                  <p className="mt-2 text-sm text-zinc-400">At least 10% goes to your chosen charity.</p>
                  <Link href="/subscribe" className="mt-6 block rounded-xl bg-emerald-500 px-5 py-3 text-center font-semibold text-zinc-950 transition hover:bg-emerald-400">Subscribe</Link>
                </div>
              </Reveal>
            ))}
          </div>
        </section>
      )}

      {/* FAQ */}
      <section className="mx-auto max-w-3xl px-6 py-16">
        <Reveal><h2 className="font-[family-name:var(--font-display)] text-3xl font-semibold">Questions</h2></Reveal>
        <div className="mt-6 divide-y divide-zinc-800 rounded-2xl border border-zinc-800 bg-zinc-900/50">
          {FAQ.map(([q, a]) => (
            <details key={q} className="group p-5">
              <summary className="cursor-pointer list-none font-medium marker:hidden">{q}</summary>
              <p className="mt-3 text-sm text-zinc-400">{a}</p>
            </details>
          ))}
        </div>
      </section>

      <footer className="border-t border-zinc-800 px-6 py-8 text-center text-sm text-zinc-500">
        Digital Heroes · demonstration build · checkout uses a test gateway, no real money moves.
      </footer>
    </div>
  );
}
