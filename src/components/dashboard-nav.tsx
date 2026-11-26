import Link from "next/link";

const LINKS = [
  { href: "/dashboard", label: "Overview" },
  { href: "/dashboard/scores", label: "Scores" },
  { href: "/dashboard/draws", label: "Draws" },
  { href: "/dashboard/winnings", label: "Winnings" },
  { href: "/dashboard/charity", label: "Charity" },
];

// Simple tab bar shared by the subscriber pages.
export function DashboardNav({ current }: { current: string }) {
  return (
    <nav aria-label="Dashboard sections" className="flex flex-wrap gap-2">
      {LINKS.map((l) => (
        <Link key={l.href} href={l.href}
          className={`rounded-full border px-3 py-1 text-sm ${current === l.href ? "border-emerald-500 bg-emerald-500/10 text-emerald-300" : "border-zinc-700 text-zinc-300 hover:bg-zinc-800"}`}>
          {l.label}
        </Link>
      ))}
    </nav>
  );
}
