"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type Section = "dashboard" | "admin";

const TABS: Record<Section, { href: string; label: string }[]> = {
  dashboard: [
    { href: "/dashboard", label: "Overview" },
    { href: "/dashboard/scores", label: "Scores" },
    { href: "/dashboard/draws", label: "Draws" },
    { href: "/dashboard/winnings", label: "Winnings" },
    { href: "/dashboard/charity", label: "Charity" },
  ],
  admin: [
    { href: "/admin", label: "Overview" },
    { href: "/admin/users", label: "Users" },
    { href: "/admin/draws", label: "Draws" },
    { href: "/admin/charities", label: "Charities" },
    { href: "/admin/winners", label: "Winners" },
    { href: "/admin/reports", label: "Reports" },
  ],
};

// One sticky glass app bar for every /dashboard/* and /admin/* page (mounted by their layout.tsx).
// Row 1: brand + quick links + dashboard/admin switcher. Row 2: section tabs (scrolls sideways on phones).
export function AppBar({ section, isAdmin }: { section: Section; isAdmin: boolean }) {
  const pathname = usePathname();
  const tabs = TABS[section];
  const root = `/${section}`;
  const isActive = (href: string) => (href === root ? pathname === root : pathname === href || pathname.startsWith(href + "/"));

  const switcher =
    section === "admin"
      ? { href: "/dashboard", label: "My dashboard", short: "Dashboard" }
      : isAdmin
        ? { href: "/admin", label: "Admin panel", short: "Admin" }
        : null;

  return (
    <header className="sticky top-0 z-40 border-b border-zinc-800 bg-zinc-950/85 backdrop-blur">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
                <div className="flex flex-wrap items-center justify-between gap-2 py-3">
          <div className="flex min-w-0 items-center gap-1.5">
            <Link href="/" className="flex shrink-0 items-center gap-2 font-semibold text-white">
              <span className="relative inline-flex h-2.5 w-2.5" aria-hidden>
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400/60" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400" />
              </span>
              <span className="whitespace-nowrap">Digital Heroes</span>
            </Link>
            {section === "admin" && (
              <span className="shrink-0 rounded-full border border-amber-400/30 bg-amber-400/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-300">Admin</span>
            )}
          </div>

          <div className="flex shrink-0 items-center gap-1 text-xs sm:text-sm">
            <Link href="/" className="hidden rounded-lg px-3 py-1.5 text-zinc-300 transition-colors hover:bg-white/5 hover:text-white sm:inline-flex">Home</Link>
            <Link href="/charities" className="hidden rounded-lg px-3 py-1.5 text-zinc-300 transition-colors hover:bg-white/5 hover:text-white sm:inline-flex">Charities</Link>
            {switcher && (
              <Link href={switcher.href} className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-emerald-300 transition-colors hover:bg-emerald-500/20 sm:px-3 sm:py-1.5">
                <span className="sm:hidden">{switcher.short}</span>
                <span className="hidden sm:inline">{switcher.label}</span>
              </Link>
            )}
          </div>
        </div>


        <nav aria-label={section === "admin" ? "Admin sections" : "Dashboard sections"} className="pill-scroll -mx-1 flex items-center gap-2 overflow-x-auto px-1 pb-3">
          {tabs.map((t) => {
            const active = isActive(t.href);
            return (
              <Link
                key={t.href}
                href={t.href}
                aria-current={active ? "page" : undefined}
                className={`shrink-0 whitespace-nowrap rounded-full border px-3.5 py-1.5 text-sm transition-all duration-200 ${
                  active
                    ? "border-emerald-500/60 bg-emerald-500/10 text-emerald-300 shadow-[0_0_18px_-4px_rgba(16,185,129,0.55)]"
                    : "border-zinc-700 text-zinc-300 hover:border-zinc-500 hover:bg-zinc-800/70 hover:text-white"
                }`}
              >
                {t.label}
              </Link>
            );
          })}
          {/* On phones the Home / Charities quick links live at the end of the scroll row */}
          <span aria-hidden className="mx-1 h-4 w-px shrink-0 bg-zinc-700 sm:hidden" />
          <Link href="/" className="shrink-0 whitespace-nowrap px-1 text-sm text-zinc-400 hover:text-white sm:hidden">Home</Link>
          <Link href="/charities" className="shrink-0 whitespace-nowrap px-1 text-sm text-zinc-400 hover:text-white sm:hidden">Charities</Link>
        </nav>
      </div>
    </header>
  );
}
