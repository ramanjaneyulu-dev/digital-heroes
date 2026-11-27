import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { sanitizeSearch } from "@/lib/charities";
import { AdminNav } from "@/components/admin-nav";
import { SearchIcon, ChevronLeftIcon, ChevronRightIcon, UsersIcon } from "@/components/icons";

const PAGE_SIZE = 15;
type Row = { id: string; full_name: string | null; email: string | null; role: string; created_at: string };
type Sub = { user_id: string; status: string; plan_id: string | null; current_period_end: string | null };

const fmt = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" }) : "-";

// A subscription whose paid period has passed is shown as lapsed even before the next page view updates it.
function effective(s: Sub | undefined): string {
  if (!s) return "inactive";
  if (s.status === "active" && s.current_period_end && new Date(s.current_period_end).getTime() <= Date.now()) return "lapsed";
  return s.status;
}

const STATUS_TONE: Record<string, string> = {
  active: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300",
  inactive: "border-zinc-700 bg-zinc-800/50 text-zinc-400",
  lapsed: "border-amber-500/40 bg-amber-500/10 text-amber-300",
  canceled: "border-red-500/40 bg-red-500/10 text-red-300",
  past_due: "border-amber-500/40 bg-amber-500/10 text-amber-300",
};

export default async function AdminUsersPage({ searchParams }: { searchParams: Promise<{ q?: string; page?: string }> }) {
  await requireAdmin();
  const sp = await searchParams;
  const q = sanitizeSearch(sp.q);
  const page = Math.max(1, Number.parseInt(sp.page ?? "1", 10) || 1);
  const from = (page - 1) * PAGE_SIZE;

  const admin = createAdminClient();
  let query = admin.from("profiles").select("id, full_name, email, role, created_at", { count: "exact" });
  if (q) query = query.or(`full_name.ilike.%${q}%,email.ilike.%${q}%`);
  const { data, count } = await query.order("created_at", { ascending: false }).range(from, from + PAGE_SIZE - 1);
  const rows = (data ?? []) as Row[];
  const totalPages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE));

  const { data: subRows } = rows.length
    ? await admin.from("subscriptions").select("user_id, status, plan_id, current_period_end").in("user_id", rows.map((r) => r.id))
    : { data: [] };
  const subs = new Map(((subRows ?? []) as Sub[]).map((s) => [s.user_id, s]));
  const href = (p: number) => `/admin/users?${new URLSearchParams({ ...(q ? { q } : {}), page: String(p) })}`;

  return (
    <main className="min-h-screen bg-zinc-950 px-3 py-8 text-zinc-100 sm:px-6 sm:py-10">
      <div className="mx-auto w-full max-w-5xl space-y-6">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-300">
            <UsersIcon size={18} />
          </span>
          <h1 className="text-xl font-semibold sm:text-2xl">Users</h1>
        </div>
        <AdminNav current="/admin/users" />

        {/* Search */}
        <form className="flex flex-wrap gap-3">
          <div className="relative w-full max-w-sm">
            <SearchIcon size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              name="q"
              defaultValue={q}
              placeholder="Search by name or email"
              aria-label="Search users"
              className="w-full rounded-lg border border-zinc-700 bg-zinc-900 pl-9 pr-3 py-2 outline-none focus:border-emerald-500"
            />
          </div>
          <button className="rounded-lg bg-emerald-500 px-4 py-2 font-medium text-zinc-950 hover:bg-emerald-400">Search</button>
        </form>

        {/* Card list (mobile-first) + table on >= sm */}
        {rows.length === 0 ? (
          <p className="rounded-xl border border-dashed border-zinc-700 p-8 text-center text-zinc-400">No users found.</p>
        ) : (
          <>
            {/* Mobile: card list */}
            <ul className="space-y-3 sm:hidden">
              {rows.map((r) => {
                const s = subs.get(r.id);
                const status = effective(s);
                return (
                  <li key={r.id}>
                    <Link
                      href={`/admin/users/${r.id}`}
                      className="glass-card block p-4 transition hover:border-emerald-500/40"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="break-token font-medium text-emerald-300">{r.full_name || r.email}</p>
                          <p className="break-token text-xs text-zinc-500">{r.email}</p>
                        </div>
                        <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] capitalize ${STATUS_TONE[status] ?? STATUS_TONE.inactive}`}>
                          {status}
                        </span>
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-zinc-400">
                        <p>Role: <span className="capitalize text-zinc-200">{r.role}</span></p>
                        <p>Plan: <span className="text-zinc-200">{s?.plan_id ?? "-"}</span></p>
                        <p>Joined: <span className="text-zinc-200">{fmt(r.created_at)}</span></p>
                        <p>Paid until: <span className="text-zinc-200">{fmt(s?.current_period_end ?? null)}</span></p>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>

            {/* Desktop / tablet: table */}
            <div className="hidden overflow-x-auto rounded-2xl border border-white/8 bg-zinc-900/50 sm:block">
              <table className="w-full text-sm">
                <thead className="text-left text-xs uppercase tracking-wide text-zinc-400">
                  <tr>
                    <th className="px-4 py-3">User</th>
                    <th className="px-4 py-3">Role</th>
                    <th className="px-4 py-3">Subscription</th>
                    <th className="px-4 py-3">Paid until</th>
                    <th className="px-4 py-3">Joined</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {rows.map((r) => {
                    const s = subs.get(r.id);
                    const status = effective(s);
                    return (
                      <tr key={r.id} className="hover:bg-zinc-900">
                        <td className="px-4 py-3">
                          <Link href={`/admin/users/${r.id}`} className="break-token font-medium text-emerald-300 hover:underline">
                            {r.full_name || r.email}
                          </Link>
                          <span className="block break-token text-xs text-zinc-500">{r.email}</span>
                        </td>
                        <td className="px-4 py-3 capitalize">{r.role}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs capitalize ${STATUS_TONE[status] ?? STATUS_TONE.inactive}`}>
                            {status}
                          </span>
                          {s?.plan_id && <span className="ml-2 text-zinc-500">· {s.plan_id}</span>}
                        </td>
                        <td className="px-4 py-3">{fmt(s?.current_period_end ?? null)}</td>
                        <td className="px-4 py-3">{fmt(r.created_at)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* Pagination */}
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-zinc-400">
          <span className="break-token">Page {page} of {totalPages} · {count ?? 0} users</span>
          <span className="flex gap-4">
            {page > 1 && (
              <Link className="inline-flex items-center gap-1 text-emerald-400 hover:underline" href={href(page - 1)}>
                <ChevronLeftIcon size={14} /> Previous
              </Link>
            )}
            {page < totalPages && (
              <Link className="inline-flex items-center gap-1 text-emerald-400 hover:underline" href={href(page + 1)}>
                Next <ChevronRightIcon size={14} />
              </Link>
            )}
          </span>
        </div>
      </div>
    </main>
  );
}
