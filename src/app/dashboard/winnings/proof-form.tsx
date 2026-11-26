"use client";
import { useActionState } from "react";
import { uploadProof, type ProofState } from "./actions";

export function ProofForm({ winnerId }: { winnerId: string }) {
  const [state, action, pending] = useActionState<ProofState, FormData>(uploadProof, {});
  return (
    <form action={action} className="mt-3 space-y-2">
      <input type="hidden" name="winner_id" value={winnerId} />
      <label className="block text-sm text-zinc-400">
        Screenshot of your scores from the golf platform (PNG, JPG or WebP, max 5 MB)
        <input
          type="file" name="proof" accept="image/png,image/jpeg,image/webp" required
          className="mt-1 block w-full text-sm text-zinc-300 file:mr-3 file:rounded-lg file:border-0 file:bg-zinc-800 file:px-3 file:py-2 file:text-zinc-100"
        />
      </label>
      {state.error && <p role="alert" className="text-sm text-red-300">{state.error}</p>}
      {state.success && <p role="status" className="text-sm text-emerald-300">{state.success}</p>}
      <button disabled={pending} className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-zinc-950 hover:bg-emerald-400 disabled:opacity-60">
        {pending ? "Uploading…" : "Submit proof"}
      </button>
    </form>
  );
}
