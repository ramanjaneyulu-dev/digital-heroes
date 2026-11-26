import Link from "next/link";

// Temporary home page. The full emotion-led landing page comes in the UI step.
export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-zinc-950 px-4 text-center text-zinc-100">
      <h1 className="text-4xl font-semibold">Digital Heroes</h1>
      <p className="max-w-md text-zinc-400">Your game. Their future.</p>
      <div className="flex gap-3">
        <Link href="/signup" className="rounded-lg bg-emerald-500 px-5 py-2 font-medium text-zinc-950 hover:bg-emerald-400">Get started</Link>
        <Link href="/login" className="rounded-lg border border-zinc-700 px-5 py-2 hover:bg-zinc-900">Log in</Link>
      </div>
    </main>
  );
}
