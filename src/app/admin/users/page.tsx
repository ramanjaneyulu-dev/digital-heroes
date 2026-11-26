import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { sanitizeSearch } from "@/lib/charities";
import { AdminNav } from "@/components/admin-nav";

const PAGE_SIZE = 15;
type Row = { id: string; full_name: string | null; email: string | null; role: string; created_at: string };
type Sub = { user_id: string; status: string; plan_id: string | null; current_period_end: string | null };

const fmt = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" }) : "-");

// A subscription whose paid period has passed is shown as lapsed even before the next page view updates it.
function effective(s: Sub | undefined): string {
  if (!s) return "inactive";
  if (s.status === "active" && s.current_period_end && new Date(s.current_period_end).getTime() <= Date.now()) return "lapsed";
  return s.status;
}

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
    <main className="min-h-screen bg-zinc-950 px-6 py-10 text-zinc-100">
      <div className="mx-auto max-w-5xl space-y-6">
        <h1 className="text-2xl font-semibold">Users</h1>
        <AdminNav current="/admin/users" />
        <form className="flex gap-3">
          <input name="q" defaultValue={q} placeholder="Search by name or email" aria-label="Search users"
            className="w-full max-w-sm rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 outline-none focus:border-emerald-500" />
          <button className="rounded-lg bg-emerald-500 px-4 py-2 font-medium text-zinc-950 hover:bg-emerald-400">Search</button>
        </form>

        <div className="overflow-x-auto rounded-2xl border border-zinc-800 bg-zinc-900/50">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-wide text-zinc-400">
              <tr><th className="px-4 py-3">User</th><th className="px-4 py-3">Role</th><th className="px-4 py-3">Subscription</th><th className="px-4 py-3">Paid until</th><th className="px-4 py-3">Joined</th></tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {rows.map((r) => {
                const s = subs.get(r.id);
                return (
                  <tr key={r.id} className="hover:bg-zinc-900">
                    <td className="px-4 py-3"><Link href={`/admin/users/${r.id}`} className="font-medium text-emerald-300 hover:underline">{r.full_name || r.email}</Link><span className="block text-xs text-zinc-500">{r.email}</span></td>
                    <td className="px-4 py-3 capitalize">{r.role}</td>
                    <td className="px-4 py-3 capitalize">{effective(s)}{s?.plan_id ? <span className="text-zinc-500"> · {s.plan_id}</span> : null}</td>
                    <td className="px-4 py-3">{fmt(s?.current_period_end ?? null)}</td>
                    <td className="px-4 py-3">{fmt(r.created_at)}</td>
                  </tr>
                );
              })}
              {rows.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-zinc-400">No users found.</td></tr>}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between text-sm text-zinc-400">
          <span>Page {page} of {totalPages} · {count ?? 0} users</span>
          <span className="flex gap-4">
            {page > 1 && <Link className="text-emerald-400 hover:underline" href={href(page - 1)}>← Previous</Link>}
            {page < totalPages && <Link className="text-emerald-400 hover:underline" href={href(page + 1)}>Next →</Link>}
          </span>
        </div>
      </div>
    </main>
  );
}
