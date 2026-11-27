// Minimal draws admin (Step 4 testing). Step 8 will extend this into the full draw console.
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatMoney } from "@/lib/money";
import { createDraft } from "./actions";
import { DrawControls } from "./draw-controls";
import { AdminNav } from "@/components/admin-nav";
import { TicketIcon, TrophyIcon } from "@/components/icons";

const STATUS_TONE: Record<string, string> = {
  draft: "border-zinc-700 bg-zinc-800/60 text-zinc-300",
  simulated: "border-amber-500/40 bg-amber-500/10 text-amber-300",
  published: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300",
  archived: "border-zinc-700 bg-zinc-800/40 text-zinc-500",
};

export default async function AdminDrawsPage() {
  await requireAdmin();
  const { data } = await createAdminClient()
    .from("draws")
    .select("id, label, draw_month, mode, status, winning_numbers, pool_total_cents, rollover_out_cents")
    .order("draw_month", { ascending: false })
    .limit(20);
  const draws = data ?? [];

  return (
    <main className="min-h-screen bg-zinc-950 px-3 py-8 text-zinc-100 sm:px-6 sm:py-10">
      <div className="mx-auto w-full max-w-3xl space-y-6">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-300">
            <TicketIcon size={18} />
          </span>
          <h1 className="text-xl font-semibold sm:text-2xl">Draws</h1>
        </div>
        <AdminNav current="/admin/draws" />

        <form
          action={createDraft}
          className="glass-card flex flex-wrap items-end gap-3 p-4 sm:p-5"
        >
          <label className="block text-sm">
            <span className="mb-1 block text-zinc-400">Label</span>
            <input
              name="label"
              required
              defaultValue="November 2026 draw"
              className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-zinc-400">Month</span>
            <input
              name="month"
              type="month"
              required
              defaultValue="2026-11"
              className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-zinc-400">Mode</span>
            <select name="mode" className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2">
              <option value="random">Random</option>
              <option value="algorithmic_common">Algorithmic: favour common scores</option>
              <option value="algorithmic_rare">Algorithmic: favour rare scores</option>
            </select>
          </label>
          <button className="rounded-lg bg-emerald-500 px-4 py-2 font-medium text-zinc-950 hover:bg-emerald-400">
            Create draft
          </button>
        </form>

        {draws.length === 0 && (
          <p className="rounded-xl border border-dashed border-zinc-700 p-6 text-center text-zinc-400">
            No draws yet.
          </p>
        )}

        {draws.map((d) => (
          <section key={d.id} className="glass-card p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="break-token font-medium text-zinc-100">{d.label}</h2>
              <span
                className={`shrink-0 rounded-full border px-3 py-1 text-xs capitalize ${STATUS_TONE[d.status] ?? STATUS_TONE.draft}`}
              >
                {d.status}
              </span>
            </div>
            <p className="mt-1 break-token text-sm text-zinc-400">
              {d.draw_month} · {String(d.mode).replace("_", " ")}
            </p>
            {d.status === "published" && (
              <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-950 px-3 py-1.5 ring-1 ring-white/5">
                  <TrophyIcon size={14} className="text-amber-300" />
                  <span className="break-token text-zinc-300">Numbers {d.winning_numbers?.join(", ")}</span>
                </span>
                <span className="break-token rounded-lg bg-zinc-950 px-3 py-1.5 text-zinc-300 ring-1 ring-white/5">
                  Pool {formatMoney(d.pool_total_cents ?? 0, "INR")}
                </span>
                <span className="break-token rounded-lg bg-zinc-950 px-3 py-1.5 text-amber-300 ring-1 ring-white/5">
                  Rolled over {formatMoney(d.rollover_out_cents ?? 0, "INR")}
                </span>
              </div>
            )}
            <DrawControls id={d.id} status={d.status} />
          </section>
        ))}
      </div>
    </main>
  );
}
