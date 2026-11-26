// Skeleton shown while a page loads (keeps the layout steady instead of a blank screen).
export default function Loading() {
  return (
    <main className="min-h-screen bg-zinc-950 px-6 py-10" aria-busy="true" aria-label="Loading">
      <div className="mx-auto max-w-4xl animate-pulse space-y-4">
        <div className="h-8 w-48 rounded-lg bg-zinc-800" />
        <div className="h-32 rounded-2xl bg-zinc-900" />
        <div className="h-32 rounded-2xl bg-zinc-900" />
      </div>
    </main>
  );
}
