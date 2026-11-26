import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { CharityImage } from "@/components/charity-avatar";
import { createClient } from "@/lib/supabase/server";
import { formatMoney } from "@/lib/money";
import { DonateForm } from "./donate-form";

const fmtDate = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

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

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-6 py-10">
        <Link href="/charities" className="text-sm text-emerald-400 hover:underline">← All charities</Link>

        {thanks && (
          <p className="mt-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-emerald-200">
            Thank you! Your donation to {charity.name} was received.
          </p>
        )}

        <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_320px]">
          <div>
            <CharityImage name={charity.name} url={charity.image_url} className="h-64 w-full rounded-2xl" />
            <div className="mt-6 flex items-center gap-2">
              {charity.category && <span className="rounded-full bg-zinc-800 px-2.5 py-0.5 text-xs text-zinc-300">{charity.category}</span>}
              {charity.is_featured && <span className="rounded-full bg-amber-400/15 px-2.5 py-0.5 text-xs text-amber-300">Featured</span>}
            </div>
            <h1 className="mt-3 text-3xl font-semibold">{charity.name}</h1>
            <p className="mt-4 whitespace-pre-line text-zinc-300">{charity.description}</p>

            <h2 className="mb-3 mt-10 text-sm uppercase tracking-wide text-zinc-400">Upcoming events</h2>
            {(events ?? []).length === 0 ? (
              <p className="rounded-xl border border-dashed border-zinc-700 p-5 text-sm text-zinc-400">No events scheduled right now.</p>
            ) : (
              <ul className="space-y-3">
                {(events ?? []).map((e: { id: string; title: string; event_date: string; location: string | null; description: string | null }) => (
                  <li key={e.id} className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
                    <p className="font-medium">{e.title}</p>
                    <p className="text-sm text-emerald-300">{fmtDate(e.event_date)}{e.location ? ` · ${e.location}` : ""}</p>
                    {e.description && <p className="mt-1 text-sm text-zinc-400">{e.description}</p>}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <aside className="space-y-6">
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5">
              <p className="text-sm text-zinc-400">Raised so far</p>
              <p className="text-3xl font-semibold text-emerald-300">{formatMoney(Number(mine?.raised_cents ?? 0))}</p>
              <p className="mt-1 text-sm text-zinc-400">{Number(mine?.supporters ?? 0)} subscriber{Number(mine?.supporters ?? 0) === 1 ? "" : "s"} backing this cause</p>
              <Link href="/subscribe" className="mt-4 block rounded-lg bg-emerald-500 px-4 py-2.5 text-center font-medium text-zinc-950 hover:bg-emerald-400">Subscribe and back this cause</Link>
            </div>
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5">
              <h2 className="mb-3 font-medium">Make a one-off donation</h2>
              <DonateForm slug={charity.slug} />
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
