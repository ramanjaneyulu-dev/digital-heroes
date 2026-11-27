"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

type Props = { loggedIn: boolean; isAdmin: boolean };

// Sticky glass navbar: active link state on desktop, slide-down drawer under 640px.
export function SiteHeaderClient({ loggedIn, isAdmin }: Props) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // Close on Escape and lock page scroll while the drawer is open.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  const links: { href: string; label: string }[] = [{ href: "/charities", label: "Charities" }];
  if (loggedIn && isAdmin) links.push({ href: "/admin", label: "Admin" });
  if (!loggedIn) links.push({ href: "/login", label: "Log in" });

  const cta = loggedIn ? { href: "/dashboard", label: "Dashboard" } : { href: "/signup", label: "Get started" };
  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");

  return (
    <header className="sticky top-0 z-50 border-b border-white/5 bg-zinc-950/60 backdrop-blur-xl supports-[backdrop-filter]:bg-zinc-950/50">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6 sm:py-4">
        <Link href="/" onClick={() => setOpen(false)} className="flex shrink-0 items-center gap-2 text-lg font-semibold text-white">
          <span className="relative inline-flex h-2.5 w-2.5" aria-hidden>
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400/60" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400" />
          </span>
          Digital Heroes
        </Link>

        {/* Desktop / tablet */}
        <nav className="hidden items-center gap-6 text-sm sm:flex" aria-label="Main">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              aria-current={isActive(l.href) ? "page" : undefined}
              className={`relative py-1 transition-colors ${isActive(l.href) ? "text-white" : "text-zinc-300 hover:text-white"}`}
            >
              {l.label}
              <span
                className={`absolute inset-x-0 -bottom-0.5 h-px origin-left bg-emerald-400 transition-transform duration-300 ${isActive(l.href) ? "scale-x-100" : "scale-x-0"}`}
              />
            </Link>
          ))}
          <Link href={cta.href} className="rounded-lg bg-emerald-500 px-3.5 py-1.5 font-medium text-zinc-950 hover:bg-emerald-400">
            {cta.label}
          </Link>
        </nav>

        {/* Mobile hamburger */}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls="mobile-menu"
          aria-label={open ? "Close menu" : "Open menu"}
          className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 text-zinc-200 transition-colors hover:bg-white/5 sm:hidden"
        >
          <span className="relative block h-3.5 w-5" aria-hidden>
            <span className={`absolute left-0 h-0.5 w-5 rounded bg-current transition-all duration-300 ${open ? "top-1.5 rotate-45" : "top-0"}`} />
            <span className={`absolute left-0 top-1.5 h-0.5 w-5 rounded bg-current transition-opacity duration-200 ${open ? "opacity-0" : "opacity-100"}`} />
            <span className={`absolute left-0 h-0.5 w-5 rounded bg-current transition-all duration-300 ${open ? "top-1.5 -rotate-45" : "top-3"}`} />
          </span>
        </button>
      </div>

      {/* Mobile drawer */}
      <div
        id="mobile-menu"
        className={`grid overflow-hidden border-white/5 transition-[grid-template-rows,opacity] duration-300 sm:hidden ${open ? "grid-rows-[1fr] border-t opacity-100" : "grid-rows-[0fr] opacity-0"}`}
      >
        <nav className="min-h-0 overflow-hidden" aria-label="Mobile">
          <div className="flex flex-col gap-1 px-4 pb-4 pt-3">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                tabIndex={open ? 0 : -1}
                aria-current={isActive(l.href) ? "page" : undefined}
                className={`rounded-lg px-3 py-3 text-base transition-colors ${isActive(l.href) ? "bg-emerald-500/10 text-emerald-300" : "text-zinc-200 hover:bg-white/5"}`}
              >
                {l.label}
              </Link>
            ))}
            <Link
              href={cta.href}
              onClick={() => setOpen(false)}
              tabIndex={open ? 0 : -1}
              className="mt-2 rounded-lg bg-emerald-500 px-3 py-3 text-center text-base font-medium text-zinc-950 hover:bg-emerald-400"
            >
              {cta.label}
            </Link>
          </div>
        </nav>
      </div>
    </header>
  );
}
