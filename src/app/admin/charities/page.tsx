import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatMoney } from "@/lib/money";
import { AdminNav } from "@/components/admin-nav";
import { CharityImage } from "@/components/charity-avatar";
import { HeartHandIcon, CoinsIcon, UsersIcon, ChevronRightIcon } from "@/components/icons";

type Row = { id: string; name: string; slug: string; category: string | null; image_url: string | null; is_featured: boolean; is_active: boolean };
type Totals = { charity_id: string; contributions_cents: number; donations_cents: number; supporters: number };

export default async function AdminCharitiesPage() {
  await requireAdmin();
  const admin = createAdminClient();
  const [{ data }, { data: totals }] = await Promise.all([
    admin.from("charities").select("id, name, slug, category, image_url, is_featured, is_active").order("name"),
    admin.rpc("admin_charity_totals"),
  ]);
  const t = new Map(((totals ?? []) as Totals[]).map((x) => [x.charity_id, x]));

  return (
    <main className="min-h-screen bg-zinc-950 px-3 py-8 text-zinc-100 sm:px-6 sm:py-10">
      <div className="mx-auto w-full max-w-5xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-300">
              <HeartHandIcon size={18} />
            </span>
            <h1 className="text-xl font-semibold sm:text-2xl">Charities</h1>
          </div>
          <Link
            href="/admin/charities/new"
            className="rounded-lg bg-emerald-500 px-4 py-2 font-medium text-zinc-950 hover:bg-emerald-400"
          >
            Add charity
          </Link>
        </div>
        <AdminNav current="/admin/charities" />

        <ul className="space-y-3">
          {((data ?? []) as Row[]).map((c) => {
            const x = t.get(c.id);
            const total = Number(x?.contributions_cents ?? 0) + Number(x?.donations_cents ?? 0);
            return (
              <li key={c.id}>
                <Link
                  href={`/admin/charities/${c.id}`}
                  className="glass-card group flex flex-col gap-3 p-4 transition hover:border-emerald-500/50 sm:flex-row sm:items-center sm:gap-4"
                >
                  <div className="flex min-w-0 flex-1 items-center gap-4">
                    <CharityImage
                      name={c.name}
                      url={c.image_url}
                      className="h-14 w-14 shrink-0 rounded-xl !text-lg sm:h-16 sm:w-16 sm:!text-xl"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="break-words font-medium text-zinc-100 group-hover:text-emerald-300">{c.name}</p>
                      <p className="break-words text-sm text-zinc-400">
                        {c.category ?? "No category"} · /{c.slug}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-3 sm:justify-end">
                    <div className="text-sm sm:text-right">
                      <p className="inline-flex items-center gap-1 text-emerald-300">
                        <CoinsIcon size={12} /> {formatMoney(total)}
                      </p>
                      <p className="mt-0.5 inline-flex items-center gap-1 text-xs text-zinc-500">
                        <UsersIcon size={10} /> {Number(x?.supporters ?? 0)} supporters
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1 text-xs">
                      {c.is_featured && (
                        <span className="rounded-full border border-amber-400/40 bg-amber-400/15 px-2 py-0.5 text-amber-300">
                          Featured
                        </span>
                      )}
                      <span
                        className={`rounded-full border px-2 py-0.5 ${
                          c.is_active
                            ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                            : "border-zinc-700 bg-zinc-700/30 text-zinc-400"
                        }`}
                      >
                        {c.is_active ? "Visible" : "Hidden"}
                      </span>
                    </div>
                    <ChevronRightIcon size={16} className="hidden text-emerald-400 sm:block" />
                  </div>
                </Link>
              </li>
            );
          })}
          {(data ?? []).length === 0 && (
            <li className="rounded-xl border border-dashed border-zinc-700 p-8 text-center text-zinc-400">
              No charities yet.
            </li>
          )}
        </ul>
      </div>
    </main>
  );
}
