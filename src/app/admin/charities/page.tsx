import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatMoney } from "@/lib/money";
import { AdminNav } from "@/components/admin-nav";
import { CharityImage } from "@/components/charity-avatar";

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
    <main className="min-h-screen bg-zinc-950 px-6 py-10 text-zinc-100">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold">Charities</h1>
          <Link href="/admin/charities/new" className="rounded-lg bg-emerald-500 px-4 py-2 font-medium text-zinc-950 hover:bg-emerald-400">Add charity</Link>
        </div>
        <AdminNav current="/admin/charities" />
        <ul className="space-y-3">
          {((data ?? []) as Row[]).map((c) => {
            const x = t.get(c.id);
            return (
              <li key={c.id}>
                <Link href={`/admin/charities/${c.id}`} className="flex items-center gap-4 rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4 hover:border-emerald-500/50">
                  <CharityImage name={c.name} url={c.image_url} className="h-16 w-16 shrink-0 rounded-xl !text-xl" />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{c.name}</p>
                    <p className="text-sm text-zinc-400">{c.category ?? "No category"} · /{c.slug}</p>
                  </div>
                  <div className="text-right text-sm">
                    <p className="text-emerald-300">{formatMoney(Number(x?.contributions_cents ?? 0) + Number(x?.donations_cents ?? 0))}</p>
                    <p className="text-xs text-zinc-500">{Number(x?.supporters ?? 0)} supporters</p>
                  </div>
                  <div className="flex flex-col items-end gap-1 text-xs">
                    {c.is_featured && <span className="rounded-full bg-amber-400/15 px-2 py-0.5 text-amber-300">Featured</span>}
                    <span className={`rounded-full px-2 py-0.5 ${c.is_active ? "bg-emerald-500/15 text-emerald-300" : "bg-zinc-700/50 text-zinc-400"}`}>{c.is_active ? "Visible" : "Hidden"}</span>
                  </div>
                </Link>
              </li>
            );
          })}
          {(data ?? []).length === 0 && <li className="rounded-xl border border-dashed border-zinc-700 p-8 text-center text-zinc-400">No charities yet.</li>}
        </ul>
      </div>
    </main>
  );
}
