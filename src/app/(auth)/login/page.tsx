"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { login } from "../actions";
import {
  BrandMark,
  ShieldCheckIcon,
  LockIcon,
  SparkleIcon,
  ArrowRightIcon,
} from "@/components/icons";

function LoginForm() {
  const [state, action, pending] = useActionState(login, null);
  const next = useSearchParams().get("next") ?? "";

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="next" value={next} />
      <div>
        <label htmlFor="email" className="mb-1 block text-sm text-zinc-300">Email</label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-zinc-100 outline-none focus:border-emerald-500"
        />
      </div>
      <div>
        <label htmlFor="password" className="mb-1 block text-sm text-zinc-300">Password</label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-zinc-100 outline-none focus:border-emerald-500"
        />
      </div>
      {state?.error && <p role="alert" className="text-sm text-red-400">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-500 px-4 py-2 font-medium text-zinc-950 transition hover:bg-emerald-400 disabled:opacity-60"
      >
        {pending ? "Logging in…" : <>Log in <ArrowRightIcon size={14} /></>}
      </button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-950 px-3 py-8 sm:px-4">
      {/* Background glows */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="glow-drift-a absolute -top-40 left-1/2 h-[420px] w-[680px] -translate-x-1/2 rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="glow-drift-b absolute -left-10 top-1/3 h-48 w-48 rounded-full bg-teal-400/10 blur-3xl" />
      </div>

      <div className="grid w-full max-w-4xl gap-6 lg:grid-cols-2">
        {/* Left: trust + brand panel (hidden on phones) */}
        <aside className="glass-card hidden flex-col justify-between p-8 lg:flex">
          <div>
            <Link href="/" className="flex items-center gap-2 text-base font-semibold text-white">
              <BrandMark size={22} /> Digital Heroes
            </Link>
            <h1 className="section-title mt-8 text-3xl font-semibold leading-tight">
              Welcome back to the{" "}
              <span className="bg-gradient-to-r from-emerald-300 to-teal-300 bg-clip-text text-transparent">
                game that gives.
              </span>
            </h1>
            <p className="mt-4 text-sm leading-relaxed text-zinc-400">
              Log in to enter your latest scores, see your draw entries, and track every rupee you&apos;ve sent to a cause you care about.
            </p>
          </div>
          <ul className="mt-8 space-y-3 text-sm text-zinc-300">
            <li className="flex items-start gap-3">
              <ShieldCheckIcon size={18} className="mt-0.5 text-emerald-300" />
              <span>10% of every subscription goes to a verified charity of your choice.</span>
            </li>
            <li className="flex items-start gap-3">
              <LockIcon size={18} className="mt-0.5 text-emerald-300" />
              <span>Demo gateway: no real charges, no card details collected.</span>
            </li>
            <li className="flex items-start gap-3">
              <SparkleIcon size={18} className="mt-0.5 text-emerald-300" />
              <span>Subtle motion, instant feedback, no clutter.</span>
            </li>
          </ul>
        </aside>

        {/* Right: form panel */}
        <section className="glass-card p-5 sm:p-8">
          <div className="lg:hidden">
            <Link href="/" className="flex items-center gap-2 text-base font-semibold text-white">
              <BrandMark size={22} /> Digital Heroes
            </Link>
          </div>
          <h2 className="mt-4 text-2xl font-semibold text-white lg:mt-0">Welcome back</h2>
          <p className="mb-6 mt-1 text-sm text-zinc-400">Log in to enter scores and see your draws.</p>

          <Suspense>
            <LoginForm />
          </Suspense>

          {/* Demo credentials: break-all so long emails never overflow at 262px */}
          <div className="alert-banner mt-6" data-tone="amber">
            <SparkleIcon size={18} className="mt-0.5 text-amber-300" />
            <div className="min-w-0 text-xs text-zinc-300">
              <p className="mb-2 font-semibold text-amber-300">Demo accounts (test data)</p>
              <p className="break-token">
                Subscriber: <span className="break-all font-mono text-zinc-100">demo.subscriber@example.com</span>{" "}
                / <span className="break-all font-mono text-zinc-100">Demo@12345</span>
              </p>
              <p className="mt-1 break-token">
                Admin: <span className="break-all font-mono text-zinc-100">demo.admin@example.com</span>{" "}
                / <span className="break-all font-mono text-zinc-100">Admin@12345</span>
              </p>
            </div>
          </div>

          <p className="mt-6 text-center text-sm text-zinc-400">
            New here?{" "}
            <Link href="/signup" className="text-emerald-400 hover:underline">Create an account</Link>
          </p>
        </section>
      </div>
    </main>
  );
}
