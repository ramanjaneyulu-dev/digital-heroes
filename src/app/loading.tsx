// Skeleton shown while a page loads (keeps the layout steady instead of a blank screen).
export default function Loading() {
  return (
    <main className="min-h-screen bg-zinc-950 px-3 py-8 sm:px-6 sm:py-10" aria-busy="true" aria-label="Loading">
      <div className="mx-auto w-full max-w-4xl space-y-4">
        <div className="shimmer h-8 w-48 rounded-lg" />
        <div className="shimmer h-32 rounded-2xl" />
        <div className="shimmer h-32 rounded-2xl" />
      </div>
    </main>
  );
}
