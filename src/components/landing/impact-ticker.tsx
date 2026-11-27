// Scrolling "impact" strip under the hero. Pure CSS (no JS, no packages): the list is rendered
// twice and slid left by 50% so the loop is seamless. Pauses on hover; static for reduced motion.
export function ImpactTicker({ items }: { items: string[] }) {
  const row = (hidden: boolean) => (
    <ul className="flex shrink-0 items-center gap-10 pr-10" aria-hidden={hidden || undefined}>
      {items.map((t, i) => (
        <li key={i} className="flex items-center gap-10 whitespace-nowrap text-sm text-zinc-300">
          <span>{t}</span>
          <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-emerald-400/70" />
        </li>
      ))}
    </ul>
  );
  return (
    <div className="ticker relative border-y border-white/5 bg-zinc-900/40 py-3" role="marquee" aria-label="Impact highlights">
      <div className="ticker-track flex w-max">
        {row(false)}
        {row(true)}
      </div>
      <div aria-hidden className="pointer-events-none absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-zinc-950 to-transparent" />
      <div aria-hidden className="pointer-events-none absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-zinc-950 to-transparent" />
    </div>
  );
}
