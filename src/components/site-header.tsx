import Link from "next/link";
import { getProfile } from "@/lib/auth";

// Shared top bar for public pages. Shows Log in / Get started to visitors and
// Dashboard (+ Admin) to signed-in users.
export async function SiteHeader() {
  const profile = await getProfile();
  return (
    <header className="border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6 sm:py-4">
        <Link href="/" className="flex shrink-0 items-center gap-2 text-base font-semibold text-white sm:text-lg">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-emerald-400" aria-hidden />
          Digital Heroes
        </Link>
        <nav className="flex flex-wrap items-center justify-end gap-x-3 gap-y-1 text-xs sm:gap-5 sm:text-sm">
          <Link href="/charities" className="text-zinc-300 hover:text-white">Charities</Link>
          {profile ? (
            <>
              {profile.role === "admin" && <Link href="/admin" className="text-zinc-300 hover:text-white">Admin</Link>}
              <Link href="/dashboard" className="rounded-lg bg-emerald-500 px-3 py-1.5 font-medium text-zinc-950 hover:bg-emerald-400">Dashboard</Link>
            </>
          ) : (
            <>
              <Link href="/login" className="text-zinc-300 hover:text-white">Log in</Link>
              <Link href="/signup" className="rounded-lg bg-emerald-500 px-3 py-1.5 font-medium text-zinc-950 hover:bg-emerald-400">Get started</Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
