"use client";
// Shown if something unexpected breaks while rendering a page. Never shows technical details.
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-zinc-950 px-6 text-center text-zinc-100">
      <h1 className="text-3xl font-semibold">Something went wrong</h1>
      <p className="max-w-md text-zinc-400">Please try again. If it keeps happening, come back in a few minutes.</p>
      <button onClick={reset} className="rounded-lg bg-emerald-500 px-5 py-2 font-medium text-zinc-950 hover:bg-emerald-400">Try again</button>
    </main>
  );
}
