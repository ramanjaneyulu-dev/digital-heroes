import Link from "next/link";

type Item = { href: string; label: string };

// Horizontal pill tabs. On narrow screens it scrolls sideways instead of wrapping,
// with a soft fade on the right edge so people can tell there is more.
export function PillNav({ items, current, label }: { items: Item[]; current: string; label: string }) {
  return (
    <nav aria-label={label} className="pill-scroll -mx-1 flex gap-2 overflow-x-auto px-1 py-1">
      {items.map((l) => {
        const active = current === l.href;
        return (
          <Link
            key={l.href}
            href={l.href}
            aria-current={active ? "page" : undefined}
            className={`shrink-0 whitespace-nowrap rounded-full border px-3.5 py-1.5 text-sm transition-all duration-200 ${
              active
                ? "border-emerald-500/60 bg-emerald-500/10 text-emerald-300 shadow-[0_0_18px_-4px_rgba(16,185,129,0.55)]"
                : "border-zinc-700 text-zinc-300 hover:border-zinc-500 hover:bg-zinc-800/70 hover:text-white"
            }`}
          >
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
