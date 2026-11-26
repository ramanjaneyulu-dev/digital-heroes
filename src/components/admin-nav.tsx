import Link from "next/link";

const LINKS = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/draws", label: "Draws" },
  { href: "/admin/charities", label: "Charities" },
  { href: "/admin/winners", label: "Winners" },
  { href: "/admin/reports", label: "Reports" },
];

// Tab bar shared by all five admin surfaces (PRD §11) plus the overview.
export function AdminNav({ current }: { current: string }) {
  return (
    <nav aria-label="Admin sections" className="flex flex-wrap gap-2">
      {LINKS.map((l) => (
        <Link key={l.href} href={l.href}
          className={`rounded-full border px-3 py-1 text-sm ${current === l.href ? "border-emerald-500 bg-emerald-500/10 text-emerald-300" : "border-zinc-700 text-zinc-300 hover:bg-zinc-800"}`}>
          {l.label}
        </Link>
      ))}
    </nav>
  );
}
