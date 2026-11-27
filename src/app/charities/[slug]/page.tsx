import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { CharityImage } from "@/components/charity-avatar";
import { createClient } from "@/lib/supabase/server";
import { formatMoney } from "@/lib/money";
import { DonateForm } from "./donate-form";
import {
  CategoryEmblem,
  ChevronLeftIcon,
  HeartHandIcon,
  UsersIcon,
  CoinsIcon,
  ArrowRightIcon,
} from "@/components/icons";

const fmtDate = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

function catKey(c: string | null): string {
  if (!c) return "default";
  const known = ["Education", "Water", "Environment", "Health", "Children", "Hunger", "Animals", "Disaster"];
  return known.includes(c) ? c : "default";
}

export default async function CharityPage({
  params, searchParams,
}: { params: Promise<{ slug: string }>; searchParams: Promise<{ thanks?: string }> }) {
  const { slug } = await params;
  const { thanks } = await searchParams;
  const supabase = await createClient();

  const { data: charity } = await supabase
    .from("charities")
    .select("id, name, slug, description, image_url, category, is_featured")
    .eq("slug", slug).eq("is_active", true).maybeSingle();
  if (!charity) notFound();

  const today = new Date().toISOString().slice(0, 10);
  const [{ data: events }, { data: totals }] = await Promise.all([
    supabase.from("charity_events").select("id, title, event_date, location, description")
      .eq("charity_id", charity.id).gte("event_date", today).order("event_date").limit(10),
    supabase.rpc("charity_totals"),
  ]);
  const mine = ((totals ?? []) as { charity_id: string; raised_cents: number; supporters: number }[]).find((t) => t.charity_id === charity.id);
  const ck = catKey(charity.category);
  const raisedRupees = Number(mine?.raised_cents ?? 0);
  const supporterCount = Number(mine?.supporters ?? 0);

  return (
    <div className="flex min-h-screen flex-col bg-zinc-950 text-zinc-100">
      <SiteHeader />
      <main className="mx-auto w-full max-w-5xl flex-1 px-3 py-10 sm:px-6">
        <Link href="/charities" className="inline-flex items-center gap-1 text-sm text-emerald-400 hover:underline">
          <ChevronLeftIcon size={14} /> All charities
        </Link>

        {thanks && (
          <p className="alert-banner mt-4" data-tone="emerald">
            <HeartHandIcon size={18} className="mt-0.5 text-emerald-300" />
            <span>Thank you! Your donation to {charity.name} was received.</span>
          </p>
        )}

        {/* Hero banner: category-themed gradient + emblem + featured badge */}
        <div className="cat-banner mt-6 flex flex-wrap items-center justify-between gap-4 p-6" data-cat={ck}>
          <div className="flex items-center gap-3">
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-white/15 text-white ring-1 ring-white/30">
              <CategoryEmblem category={charity.category} size={22} />
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-white/80">
                {charity.category ?? "Cause"}
              </p>
              <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold text-white sm:text-3xl">
                {charity.name}
              </h1>
            </div>
          </div>
          {charity.is_featured && (
            <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-white">
              Featured
            </span>
          )}
        </div>

        <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_320px]">
          {/* Main column: image, description, events */}
          <div className="min-w-0">
            <CharityImage name={charity.name} url={charity.image_url} className="h-56 w-full rounded-2xl sm:h-64" />
            <p className="mt-6 whitespace-pre-line text-zinc-300">{charity.description}</p>

            {/* Emotional impact metrics */}
            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              <div className="glass-card p-4">
                <CoinsIcon size={18} className="text-emerald-300" />
                <p className="mt-2 text-xs text-zinc-400">Raised so far</p>
                <p className="text-lg font-semibold text-emerald-300">{formatMoney(raisedRupees)}</p>
              </div>
              <div className="glass-card p-4">
                <UsersIcon size={18} className="text-emerald-300" />
                <p className="mt-2 text-xs text-zinc-400">Backers</p>
                <p className="text-lg font-semibold text-zinc-100">{supporterCount}</p>
              </div>
              <div className="glass-card p-4">
                <HeartHandIcon size={18} className="text-emerald-300" />
                <p className="mt-2 text-xs text-zinc-400">Minimum share</p>
                <p className="text-lg font-semibold text-zinc-100">10% of fee</p>
              </div>
            </div>

            {/* Upcoming events */}
            <h2 className="eyebrow mt-10">Upcoming events</h2>
            {(events ?? []).length === 0 ? (
              <p className="mt-3 rounded-xl border border-dashed border-zinc-700 p-5 text-sm text-zinc-400">
                No events scheduled right now.
              </p>
            ) : (
              <ul className="mt-3 space-y-3">
                {(events ?? []).map((e: { id: string; title: string; event_date: string; location: string | null; description: string | null }) => (
                  <li key={e.id} className="glass-card p-4">
                    <p className="font-medium text-zinc-100">{e.title}</p>
                    <p className="text-sm text-emerald-300">
                      {fmtDate(e.event_date)}{e.location ? ` · ${e.location}` : ""}
                    </p>
                    {e.description && <p className="mt-1 text-sm text-zinc-400">{e.description}</p>}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Sidebar: donate + subscribe CTAs */}
          <aside className="space-y-6">
            <div className="glass-card p-5">
              <p className="text-xs text-zinc-400">Raised so far</p>
              <p className="text-3xl font-semibold text-emerald-300">{formatMoney(raisedRupees)}</p>
              <p className="mt-1 text-sm text-zinc-400">
                {supporterCount} subscriber{supporterCount === 1 ? "" : "s"} backing this cause
              </p>
              <Link
                href="/subscribe"
                className="mt-4 inline-flex w-full items-center justify-center gap-1 rounded-lg bg-emerald-500 px-4 py-2.5 text-center font-medium text-zinc-950 transition hover:bg-emerald-400"
              >
                Subscribe and back this cause <ArrowRightIcon size={14} />
              </Link>
            </div>
            <div className="glass-card p-5">
              <h2 className="font-medium text-zinc-100">Make a one-off donation</h2>
              <p className="mt-1 text-xs text-zinc-500">A gift separate from the draw — every rupee reaches the cause.</p>
              <div className="mt-4">
                <DonateForm slug={charity.slug} />
              </div>
            </div>
          </aside>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
