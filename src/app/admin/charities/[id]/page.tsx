import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { AdminNav } from "@/components/admin-nav";
import { deleteCharity, deleteEvent } from "../actions";
import { CharityForm, EventForm } from "./forms";
import { ChevronLeftIcon, HeartHandIcon, AlertIcon } from "@/components/icons";

const h2 = "mb-4 text-sm uppercase tracking-wide text-zinc-400";
const fmtDay = (d: string) =>
  new Date(`${d}T00:00:00Z`).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

// "new" creates a charity; a UUID edits one.
export default async function AdminCharityPage({
  params, searchParams,
}: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string }> }) {
  const { id } = await params;
  const { error } = await searchParams;
  await requireAdmin();

  if (id === "new") {
    return (
      <main className="min-h-screen bg-zinc-950 px-3 py-8 text-zinc-100 sm:px-6 sm:py-10">
        <div className="mx-auto w-full max-w-3xl space-y-6">
          <Link href="/admin/charities" className="inline-flex items-center gap-1 text-sm text-emerald-400 hover:underline">
            <ChevronLeftIcon size={14} /> All charities
          </Link>
          <div className="flex items-center gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-300">
              <HeartHandIcon size={18} />
            </span>
            <h1 className="text-xl font-semibold sm:text-2xl">Add a charity</h1>
          </div>
          <AdminNav current="/admin/charities" />
          <section className="glass-card p-5 sm:p-6">
            <CharityForm id="new" name="" slug="" category="" description="" imageUrl="" featured={false} active />
          </section>
        </div>
      </main>
    );
  }
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();

  const admin = createAdminClient();
  const { data: c } = await admin.from("charities").select("id, name, slug, category, description, image_url, is_featured, is_active").eq("id", id).maybeSingle();
  if (!c) notFound();
  const { data: events } = await admin.from("charity_events").select("id, title, event_date, location").eq("charity_id", id).order("event_date");

  return (
    <main className="min-h-screen bg-zinc-950 px-3 py-8 text-zinc-100 sm:px-6 sm:py-10">
      <div className="mx-auto w-full max-w-3xl space-y-6">
        <Link href="/admin/charities" className="inline-flex items-center gap-1 text-sm text-emerald-400 hover:underline">
          <ChevronLeftIcon size={14} /> All charities
        </Link>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-300">
              <HeartHandIcon size={18} />
            </span>
            <h1 className="break-words text-xl font-semibold sm:text-2xl">{c.name}</h1>
          </div>
          <Link href={`/charities/${c.slug}`} className="text-sm text-emerald-400 hover:underline">
            View public page →
          </Link>
        </div>
        <AdminNav current="/admin/charities" />

        {error === "delete" && (
          <p className="alert-banner" data-tone="amber">
            <AlertIcon size={18} className="mt-0.5 text-amber-300" />
            <span className="flex-1 text-sm">
              This charity has donation records, so it can&apos;t be deleted. Untick &ldquo;Visible to the public&rdquo; to hide it instead.
            </span>
          </p>
        )}

        <section className="glass-card p-5 sm:p-6">
          <h2 className={h2}>Details</h2>
          <CharityForm
            id={c.id}
            name={c.name}
            slug={c.slug}
            category={c.category ?? ""}
            description={c.description ?? ""}
            imageUrl={c.image_url ?? ""}
            featured={c.is_featured}
            active={c.is_active}
          />
        </section>

        <section className="glass-card p-5 sm:p-6">
          <h2 className={h2}>Events (golf days and more)</h2>
          <ul className="mb-5 divide-y divide-white/5 text-sm">
            {((events ?? []) as { id: string; title: string; event_date: string; location: string | null }[]).map((e) => (
              <li key={e.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                <span className="break-token">
                  {e.title}
                  <span className="ml-1 text-zinc-500">· {fmtDay(e.event_date)}{e.location ? ` · ${e.location}` : ""}</span>
                </span>
                <form action={deleteEvent}>
                  <input type="hidden" name="id" value={e.id} />
                  <input type="hidden" name="charityId" value={c.id} />
                  <button className="rounded-lg border border-zinc-700 px-2.5 py-1 text-xs text-red-300 hover:bg-zinc-800">
                    Remove
                  </button>
                </form>
              </li>
            ))}
            {(events ?? []).length === 0 && <li className="py-2 text-zinc-400">No events yet.</li>}
          </ul>
          <EventForm charityId={c.id} />
        </section>

        <section className="glass-card p-5 sm:p-6" style={{ borderColor: "rgb(248 113 113 / 0.35)" }}>
          <h2 className={`${h2} text-red-300`}>Danger zone</h2>
          <form action={deleteCharity}>
            <input type="hidden" name="id" value={c.id} />
            <button className="rounded-lg border border-red-500/40 px-4 py-2 text-sm text-red-300 hover:bg-red-500/10">
              Delete this charity
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
