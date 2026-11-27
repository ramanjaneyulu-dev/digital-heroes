// Instant skeleton for charities so navigation feels immediate while data loads.
export default function Loading() {
  return (
    <main className="min-h-screen bg-zinc-950 px-4 py-8 sm:px-6 sm:py-10" aria-busy="true" aria-label="Loading charities">
      <div className="mx-auto max-w-5xl space-y-5">
        <div className="shimmer h-8 w-56 rounded-lg" />
        <div className="flex gap-2 overflow-hidden">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="shimmer h-8 w-20 shrink-0 rounded-full" />
          ))}
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="shimmer h-28 rounded-2xl" />
          ))}
        </div>
        <div className="shimmer h-56 rounded-2xl" />
      </div>
    </main>
  );
}
