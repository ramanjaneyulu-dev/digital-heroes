"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signup } from "../actions";
import {
  BrandMark,
  ShieldCheckIcon,
  LockIcon,
  SparkleIcon,
  ArrowRightIcon,
  HeartHandIcon,
} from "@/components/icons";

export default function SignupPage() {
  const [state, action, pending] = useActionState(signup, null);

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-950 px-3 py-8 sm:px-4">
      {/* Background glows */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="glow-drift-a absolute -top-40 left-1/2 h-[420px] w-[680px] -translate-x-1/2 rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="glow-drift-c absolute -right-10 top-1/3 h-48 w-48 rounded-full bg-amber-400/10 blur-3xl" />
      </div>

      <div className="grid w-full max-w-4xl gap-6 lg:grid-cols-2">
        {/* Left: brand + trust panel (hidden on phones) */}
        <aside className="glass-card hidden flex-col justify-between p-8 lg:flex">
          <div>
            <Link href="/" className="flex items-center gap-2 text-base font-semibold text-white">
              <BrandMark size={22} /> Digital Heroes
            </Link>
            <h1 className="section-title mt-8 text-3xl font-semibold leading-tight">
              Play your game.{" "}
              <span className="bg-gradient-to-r from-emerald-300 to-teal-300 bg-clip-text text-transparent">
                Fund their future.
              </span>
            </h1>
            <p className="mt-4 text-sm leading-relaxed text-zinc-400">
              Create an account to subscribe, log your five latest Stableford scores, and back a charity with at least 10% of every payment.
            </p>
          </div>
          <ul className="mt-8 space-y-3 text-sm text-zinc-300">
            <li className="flex items-start gap-3">
              <HeartHandIcon size={18} className="mt-0.5 text-emerald-300" />
              <span>You choose the cause. You choose how much above 10%.</span>
            </li>
            <li className="flex items-start gap-3">
              <ShieldCheckIcon size={18} className="mt-0.5 text-emerald-300" />
              <span>Auto-entry into every monthly draw while your subscription is active.</span>
            </li>
            <li className="flex items-start gap-3">
              <LockIcon size={18} className="mt-0.5 text-emerald-300" />
              <span>Demo gateway: no real charges, no card details collected.</span>
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
          <h2 className="mt-4 text-2xl font-semibold text-white lg:mt-0">Create your account</h2>
          <p className="mb-6 mt-1 text-sm text-zinc-400">Play, win, and give back — all in one place.</p>

          <form action={action} className="space-y-4">
            <div>
              <label htmlFor="full_name" className="mb-1 block text-sm text-zinc-300">Full name</label>
              <input
                id="full_name"
                name="full_name"
                required
                autoComplete="name"
                className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-zinc-100 outline-none focus:border-emerald-500"
              />
            </div>
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
                minLength={8}
                autoComplete="new-password"
                className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-zinc-100 outline-none focus:border-emerald-500"
              />
              <p className="mt-1 text-xs text-zinc-500">Minimum 8 characters.</p>
            </div>
            {state?.error && <p role="alert" className="text-sm text-red-400">{state.error}</p>}
            {state?.message && <p className="text-sm text-emerald-400">{state.message}</p>}
            <button
              type="submit"
              disabled={pending}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-500 px-4 py-2 font-medium text-zinc-950 transition hover:bg-emerald-400 disabled:opacity-60"
            >
              {pending ? "Creating account…" : <>Sign up <ArrowRightIcon size={14} /></>}
            </button>
          </form>

          <div className="alert-banner mt-6" data-tone="amber">
            <SparkleIcon size={18} className="mt-0.5 text-amber-300" />
            <p className="min-w-0 text-xs text-zinc-300">
              <span className="font-semibold text-amber-300">Demo build.</span>{" "}
              Payments use a clearly labelled test gateway — no real money moves and no card details are collected.
            </p>
          </div>

          <p className="mt-6 text-center text-sm text-zinc-400">
            Already have an account?{" "}
            <Link href="/login" className="text-emerald-400 hover:underline">Log in</Link>
          </p>
        </section>
      </div>
    </main>
  );
}
