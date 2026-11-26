"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { login } from "../actions";

function LoginForm() {
  const [state, action, pending] = useActionState(login, null);
  const next = useSearchParams().get("next") ?? "";

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="next" value={next} />
      <div>
        <label htmlFor="email" className="mb-1 block text-sm text-zinc-300">Email</label>
        <input id="email" name="email" type="email" required autoComplete="email"
          className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-zinc-100 outline-none focus:border-emerald-500" />
      </div>
      <div>
        <label htmlFor="password" className="mb-1 block text-sm text-zinc-300">Password</label>
        <input id="password" name="password" type="password" required autoComplete="current-password"
          className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-zinc-100 outline-none focus:border-emerald-500" />
      </div>
      {state?.error && <p role="alert" className="text-sm text-red-400">{state.error}</p>}
      <button type="submit" disabled={pending}
        className="w-full rounded-lg bg-emerald-500 px-4 py-2 font-medium text-zinc-950 transition hover:bg-emerald-400 disabled:opacity-60">
        {pending ? "Logging in…" : "Log in"}
      </button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-950 px-4">
      <div className="w-full max-w-sm rounded-2xl border border-zinc-800 bg-zinc-900/50 p-8">
        <h1 className="mb-1 text-2xl font-semibold text-white">Welcome back</h1>
        <p className="mb-6 text-sm text-zinc-400">Log in to enter scores and see your draws.</p>
        <Suspense>
          <LoginForm />
        </Suspense>
        <p className="mt-6 text-center text-sm text-zinc-400">
          New here?{" "}
          <Link href="/signup" className="text-emerald-400 hover:underline">Create an account</Link>
        </p>
      </div>
    </main>
  );
}
