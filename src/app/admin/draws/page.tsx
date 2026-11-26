// Minimal draws admin (Step 4 testing). Step 8 will extend this into the full draw console.
import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatMoney } from "@/lib/money";
import { createDraft } from "./actions";
import { DrawControls } from "./draw-controls";
import { AdminNav } from "@/components/admin-nav";

export default async function AdminDrawsPage() {
  await requireAdmin();
  const { data } = await createAdminClient()
    .from("draws")
    .select("id, label, draw_month, mode, status, winning_numbers, pool_total_cents, rollover_out_cents")
    .order("draw_month", { ascending: false })
    .limit(20);
  const draws = data ?? [];

  return (
    <main className="min-h-screen bg-zinc-950 px-6 py-10 text-zinc-100">
      <div className="mx-auto max-w-3xl space-y-6">
        <h1 className="text-2xl font-semibold">Draws</h1>
        <AdminNav current="/admin/draws" />

        <form action={createDraft} className="flex flex-wrap items-end gap-3 rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5">
          <label className="text-sm"><span className="mb-1 block text-zinc-400">Label</span>
            <input name="label" required defaultValue="November 2026 draw" className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2" /></label>
          <label className="text-sm"><span className="mb-1 block text-zinc-400">Month</span>
            <input name="month" type="month" required defaultValue="2026-11" className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2" /></label>
          <label className="text-sm"><span className="mb-1 block text-zinc-400">Mode</span>
            <select name="mode" className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2">
              <option value="random">Random</option>
              <option value="algorithmic_common">Algorithmic: favour common scores</option>
              <option value="algorithmic_rare">Algorithmic: favour rare scores</option>
            </select></label>
          <button className="rounded-lg bg-emerald-500 px-4 py-2 font-medium text-zinc-950 hover:bg-emerald-400">Create draft</button>
        </form>

        {draws.length === 0 && <p className="text-zinc-400">No draws yet.</p>}
        {draws.map((d) => (
          <section key={d.id} className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5">
            <div className="flex items-center justify-between">
              <h2 className="font-medium">{d.label}</h2>
              <span className="rounded-full bg-zinc-800 px-3 py-1 text-xs capitalize">{d.status}</span>
            </div>
            <p className="text-sm text-zinc-400">{d.draw_month} · {String(d.mode).replace("_", " ")}</p>
            {d.status === "published" && (
              <p className="mt-2 text-sm text-zinc-300">
                Numbers {d.winning_numbers?.join(", ")} · Pool {formatMoney(d.pool_total_cents ?? 0, "INR")} · Rolled over {formatMoney(d.rollover_out_cents ?? 0, "INR")}
              </p>
            )}
            <DrawControls id={d.id} status={d.status} />
          </section>
        ))}
      </div>
    </main>
  );
}
