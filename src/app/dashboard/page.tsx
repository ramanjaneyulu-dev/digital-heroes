import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { logout } from "@/app/(auth)/actions";

export default async function DashboardPage() {
  const profile = await requireUser();

  const supabase = await createClient();
  const { data: sub } = await supabase
    .from("subscriptions")
    .select("status, plan_id, current_period_end")
    .eq("user_id", profile.id)
    .maybeSingle();

  return (
    <main className="min-h-screen bg-zinc-950 px-6 py-10 text-zinc-100">
      <div className="mx-auto max-w-3xl space-y-6">
        <header className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Hello, {profile.full_name || profile.email}</h1>
          <form action={logout}>
            <button className="rounded-lg border border-zinc-700 px-3 py-1.5 text-sm hover:bg-zinc-900">Log out</button>
          </form>
        </header>

        <section className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6">
          <h2 className="mb-3 text-sm uppercase tracking-wide text-zinc-400">Auth check</h2>
          <dl className="grid grid-cols-2 gap-2 text-sm">
            <dt className="text-zinc-400">Email</dt><dd>{profile.email}</dd>
            <dt className="text-zinc-400">Role</dt><dd>{profile.role}</dd>
            <dt className="text-zinc-400">Subscription</dt><dd>{sub?.status ?? "none"}</dd>
            <dt className="text-zinc-400">Charity %</dt><dd>{profile.charity_pct}%</dd>
          </dl>
        </section>

        {profile.role === "admin" && (
          <a href="/admin" className="inline-block text-emerald-400 hover:underline">Go to admin panel →</a>
        )}
      </div>
    </main>
  );
}
