"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signup } from "../actions";

export default function SignupPage() {
  const [state, action, pending] = useActionState(signup, null);

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-950 px-4">
      <div className="w-full max-w-sm rounded-2xl border border-zinc-800 bg-zinc-900/50 p-8">
        <h1 className="mb-1 text-2xl font-semibold text-white">Create your account</h1>
        <p className="mb-6 text-sm text-zinc-400">Play, win, and give back, all in one place.</p>
        <form action={action} className="space-y-4">
          <div>
            <label htmlFor="full_name" className="mb-1 block text-sm text-zinc-300">Full name</label>
            <input id="full_name" name="full_name" required autoComplete="name"
              className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-zinc-100 outline-none focus:border-emerald-500" />
          </div>
          <div>
            <label htmlFor="email" className="mb-1 block text-sm text-zinc-300">Email</label>
            <input id="email" name="email" type="email" required autoComplete="email"
              className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-zinc-100 outline-none focus:border-emerald-500" />
          </div>
          <div>
            <label htmlFor="password" className="mb-1 block text-sm text-zinc-300">Password</label>
            <input id="password" name="password" type="password" required minLength={8} autoComplete="new-password"
              className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-zinc-100 outline-none focus:border-emerald-500" />
          </div>
          {state?.error && <p role="alert" className="text-sm text-red-400">{state.error}</p>}
          {state?.message && <p className="text-sm text-emerald-400">{state.message}</p>}
          <button type="submit" disabled={pending}
            className="w-full rounded-lg bg-emerald-500 px-4 py-2 font-medium text-zinc-950 transition hover:bg-emerald-400 disabled:opacity-60">
            {pending ? "Creating account…" : "Sign up"}
          </button>
        </form>
        <p className="mt-6 text-center text-sm text-zinc-400">
          Already have an account?{" "}
          <Link href="/login" className="text-emerald-400 hover:underline">Log in</Link>
        </p>
      </div>
    </main>
  );
}
