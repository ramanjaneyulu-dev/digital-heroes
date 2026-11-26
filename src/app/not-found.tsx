import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-zinc-950 px-6 text-center text-zinc-100">
      <p className="text-sm uppercase tracking-widest text-emerald-400">404</p>
      <h1 className="text-3xl font-semibold">We couldn&rsquo;t find that page</h1>
      <p className="max-w-md text-zinc-400">The link may be old, or the page may have moved.</p>
      <Link href="/" className="rounded-lg bg-emerald-500 px-5 py-2 font-medium text-zinc-950 hover:bg-emerald-400">Back to home</Link>
    </main>
  );
}
