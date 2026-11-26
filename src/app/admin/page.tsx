import { requireAdmin } from "@/lib/auth";

export default async function AdminPage() {
  const admin = await requireAdmin(); // non-admins are redirected to /dashboard

  return (
    <main className="min-h-screen bg-zinc-950 px-6 py-10 text-zinc-100">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-2xl font-semibold">Admin panel</h1>
        <p className="mt-2 text-zinc-400">Signed in as {admin.email}. Admin tools are coming in a later step.</p>
      </div>
    </main>
  );
}
