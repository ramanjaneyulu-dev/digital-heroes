import Link from "next/link";
import { BrandMark } from "@/components/icons";

// Polished, responsive multi-column footer for every public page that mounts <SiteHeader />.
// Mirrors the public header: same brand mark, same accent emerald, but slower / quieter.
const NAV: { href: string; label: string }[] = [
  { href: "/", label: "Home" },
  { href: "/charities", label: "Charities" },
  { href: "/login", label: "Log in" },
  { href: "/signup", label: "Get started" },
];

const CAUSES = [
  "Education", "Water", "Environment", "Health", "Children", "Hunger",
];

export function SiteFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="relative mt-20 border-t border-white/5 bg-gradient-to-b from-zinc-950/80 to-zinc-950 text-zinc-400">
      {/* Top hairline glow */}
      <div aria-hidden className="absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-emerald-500/40 to-transparent" />

      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          {/* Brand mission */}
          <div className="sm:col-span-2 lg:col-span-1">
            <Link href="/" className="flex items-center gap-2 text-base font-semibold text-white">
              <BrandMark size={22} />
              Digital Heroes
            </Link>
            <p className="mt-3 max-w-xs text-sm leading-relaxed">
              Every subscription sends at least 10% to a charity you choose, while your latest scores
              enter a monthly draw. Play. Give. Win.
            </p>
            <p className="mt-4 text-xs text-zinc-500">
              Built for the Digital Heroes 2026 selection process.
            </p>
          </div>

          {/* Quick nav */}
          <nav aria-label="Footer navigation">
            <p className="text-xs uppercase tracking-widest text-zinc-500">Platform</p>
            <ul className="mt-3 space-y-2 text-sm">
              {NAV.map((n) => (
                <li key={n.href}>
                  <Link href={n.href} className="u-link text-zinc-300 transition-colors hover:text-emerald-300">
                    {n.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* Causes we support */}
          <div>
            <p className="text-xs uppercase tracking-widest text-zinc-500">Causes we support</p>
            <ul className="mt-3 grid grid-cols-2 gap-y-2 text-sm">
              {CAUSES.map((c) => (
                <li key={c} className="text-zinc-400">{c}</li>
              ))}
            </ul>
            <Link href="/charities" className="mt-3 inline-flex items-center gap-1 text-sm text-emerald-300 hover:text-emerald-200">
              Browse all charities →
            </Link>
          </div>

          {/* Responsible play + transparency */}
          <div>
            <p className="text-xs uppercase tracking-widest text-zinc-500">Transparency</p>
            <ul className="mt-3 space-y-2 text-xs leading-relaxed text-zinc-500">
              <li>
                <span className="text-emerald-300">10% minimum</span> of every subscription
                goes to a verified charity of your choice.
              </li>
              <li>
                Draws are run by an admin and may be simulated before publish.
                The 5-number jackpot rolls over only when unclaimed.
              </li>
              <li>
                This is a demonstration build: checkout uses a clearly labelled test gateway,
                no real money moves and no card details are collected.
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-start justify-between gap-3 border-t border-white/5 pt-6 text-xs text-zinc-500 sm:flex-row sm:items-center">
          <p>© {year} Digital Heroes · digitalheroes.co.in</p>
          <p className="break-token">Play responsibly. Give intentionally. Win graciously.</p>
        </div>
      </div>
    </footer>
  );
}
