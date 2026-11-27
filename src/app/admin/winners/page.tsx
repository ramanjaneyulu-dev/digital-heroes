import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatMoney } from "@/lib/money";
import { canMarkPaid, canReview, statusLabel, type Payout, type Verification } from "@/lib/winners";
import { approveWinner, rejectWinner, markPaid } from "./actions";
import { AdminNav } from "@/components/admin-nav";
import {
  TrophyIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CheckIcon,
} from "@/components/icons";

const PAGE_SIZE = 10;
const FILTERS = [
  ["all", "All"], ["review", "Needs review"], ["topay", "Approved, to pay"],
  ["paid", "Paid"], ["rejected", "Rejected"], ["awaiting", "Awaiting proof"],
] as const;
const TIER = { match_5: "5 numbers", match_4: "4 numbers", match_3: "3 numbers" } as Record<string, string>;

type Row = {
  id: string; user_id: string; draw_id: string; tier: string; prize_cents: number;
  proof_url: string | null; verification: Verification; payout: Payout; admin_note: string | null;
};

export default async function AdminWinnersPage({
  searchParams,
}: { searchParams: Promise<{ status?: string; page?: string }> }) {
  await requireAdmin();
  const sp = await searchParams;
  const status = FILTERS.some(([k]) => k === sp.status) ? sp.status! : "all";
  const page = Math.max(1, Number.parseInt(sp.page ?? "1", 10) || 1);
  const from = (page - 1) * PAGE_SIZE;

  const admin = createAdminClient();
  let q = admin
    .from("winners")
    .select("id, user_id, draw_id, tier, prize_cents, proof_url, verification, payout, admin_note", { count: "exact" });
  if (status === "review") q = q.eq("verification", "pending");
  if (status === "awaiting") q = q.eq("verification", "none");
  if (status === "rejected") q = q.eq("verification", "rejected");
  if (status === "topay") q = q.eq("verification", "approved").eq("payout", "pending");
  if (status === "paid") q = q.eq("payout", "paid");
  const { data, count } = await q.order("id").range(from, from + PAGE_SIZE - 1);
  const rows = (data ?? []) as Row[];
  const totalPages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE));

  // Look up names, draw labels and short-lived proof links for just this page of rows.
  const userIds = [...new Set(rows.map((r) => r.user_id))];
  const drawIds = [...new Set(rows.map((r) => r.draw_id))];
  const [profiles, draws] = await Promise.all([
    userIds.length ? admin.from("profiles").select("id, full_name, email").in("id", userIds) : { data: [] },
    drawIds.length ? admin.from("draws").select("id, label").in("id", drawIds) : { data: [] },
  ]);
  const who = new Map((profiles.data ?? []).map((p: { id: string; full_name: string | null; email: string | null }) => [p.id, p.full_name || p.email || "Unknown"]));
  const drawLabel = new Map((draws.data ?? []).map((d: { id: string; label: string }) => [d.id, d.label]));
  const proofUrls = new Map<string, string>();
  for (const r of rows) {
    if (!r.proof_url) continue;
    const { data: s } = await admin.storage.from("proofs").createSignedUrl(r.proof_url, 600); // valid 10 minutes
    if (s?.signedUrl) proofUrls.set(r.id, s.signedUrl);
  }

  const href = (s: string, p: number) => `/admin/winners?status=${s}&page=${p}`;

  return (
    <main className="min-h-screen bg-zinc-950 px-3 py-8 text-zinc-100 sm:px-6 sm:py-10">
      <div className="mx-auto w-full max-w-4xl space-y-6">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-amber-400/30 bg-amber-400/10 text-amber-300">
            <TrophyIcon size={18} />
          </span>
          <h1 className="text-xl font-semibold sm:text-2xl">Winners</h1>
        </div>
        <AdminNav current="/admin/winners" />

        {/* Filter pills */}
        <nav className="pill-scroll flex flex-wrap gap-2 overflow-x-auto">
          {FILTERS.map(([k, label]) => (
            <Link
              key={k}
              href={href(k, 1)}
              className={`shrink-0 whitespace-nowrap rounded-full border px-3 py-1 text-sm transition ${
                status === k
                  ? "border-emerald-500 bg-emerald-500/10 text-emerald-300"
                  : "border-zinc-700 text-zinc-300 hover:bg-zinc-800"
              }`}
            >
              {label}
            </Link>
          ))}
        </nav>

        {rows.length === 0 && (
          <p className="rounded-xl border border-dashed border-zinc-700 p-6 text-center text-zinc-400">Nothing here.</p>
        )}

        {rows.map((r) => (
          <section key={r.id} className="glass-card p-4 sm:p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="break-token font-medium text-zinc-100">{who.get(r.user_id) ?? "Unknown"}</p>
                <p className="break-token text-sm text-zinc-400">
                  {drawLabel.get(r.draw_id) ?? "Draw"} · {TIER[r.tier] ?? r.tier}
                </p>
              </div>
              <div className="text-right">
                <p className="text-lg font-semibold text-emerald-300">{formatMoney(r.prize_cents, "INR")}</p>
                <p className="text-xs text-zinc-400">{statusLabel(r.verification, r.payout)}</p>
              </div>
            </div>

            {proofUrls.get(r.id) && (
              <a
                href={proofUrls.get(r.id)}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-block"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={proofUrls.get(r.id)}
                  alt="Winner proof screenshot"
                  className="max-h-40 rounded-lg border border-zinc-700"
                />
              </a>
            )}
            {r.admin_note && <p className="mt-2 break-token text-sm text-amber-300">Note: {r.admin_note}</p>}

            {canReview(r.verification) && (
              <form className="mt-3 flex flex-wrap items-center gap-2">
                <input type="hidden" name="id" value={r.id} />
                <input
                  name="note"
                  placeholder="Note (shown to the user if rejected)"
                  maxLength={300}
                  className="min-w-0 flex-1 rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"
                />
                <button
                  formAction={approveWinner}
                  className="inline-flex items-center gap-1 rounded-lg bg-emerald-500 px-3 py-2 text-sm font-medium text-zinc-950 hover:bg-emerald-400"
                >
                  <CheckIcon size={14} /> Approve
                </button>
                <button
                  formAction={rejectWinner}
                  className="rounded-lg border border-zinc-700 px-3 py-2 text-sm text-red-300 hover:bg-zinc-800"
                >
                  Reject
                </button>
              </form>
            )}
            {canMarkPaid(r.verification, r.payout) && (
              <form action={markPaid} className="mt-3">
                <input type="hidden" name="id" value={r.id} />
                <button className="inline-flex items-center gap-1 rounded-lg bg-amber-400 px-3 py-2 text-sm font-medium text-zinc-950 hover:bg-amber-300">
                  Mark as paid
                </button>
              </form>
            )}
          </section>
        ))}

        {/* Pagination */}
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-zinc-400">
          <span className="break-token">Page {page} of {totalPages} · {count ?? 0} total</span>
          <span className="flex gap-3">
            {page > 1 && (
              <Link className="inline-flex items-center gap-1 text-emerald-400 hover:underline" href={href(status, page - 1)}>
                <ChevronLeftIcon size={14} /> Previous
              </Link>
            )}
            {page < totalPages && (
              <Link className="inline-flex items-center gap-1 text-emerald-400 hover:underline" href={href(status, page + 1)}>
                Next <ChevronRightIcon size={14} />
              </Link>
            )}
          </span>
        </div>
      </div>
    </main>
  );
}
