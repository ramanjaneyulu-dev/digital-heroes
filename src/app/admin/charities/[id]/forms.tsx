"use client";
import { useActionState } from "react";
import { addEvent, saveCharity, type CharityAdminState } from "../actions";

const input = "w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-emerald-500";

export function CharityForm(props: {
  id: string; name: string; slug: string; category: string; description: string; imageUrl: string; featured: boolean; active: boolean;
}) {
  const [state, action, pending] = useActionState<CharityAdminState, FormData>(saveCharity, null);
  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2">
      <input type="hidden" name="id" value={props.id} />
      <label className="text-sm sm:col-span-2"><span className="mb-1 block text-zinc-400">Name</span>
        <input name="name" defaultValue={props.name} required className={input} /></label>
      <label className="text-sm"><span className="mb-1 block text-zinc-400">Web address (optional)</span>
        <input name="slug" defaultValue={props.slug} placeholder="auto from the name" className={input} /></label>
      <label className="text-sm"><span className="mb-1 block text-zinc-400">Category</span>
        <input name="category" defaultValue={props.category} placeholder="Education, Health…" className={input} /></label>
      <label className="text-sm sm:col-span-2"><span className="mb-1 block text-zinc-400">Description</span>
        <textarea name="description" defaultValue={props.description} rows={5} className={input} /></label>
      <label className="text-sm"><span className="mb-1 block text-zinc-400">Image link (https://…)</span>
        <input name="image_url" defaultValue={props.imageUrl} className={input} /></label>
      <label className="text-sm"><span className="mb-1 block text-zinc-400">…or upload a picture (PNG/JPG/WebP, max 3 MB)</span>
        <input name="image" type="file" accept="image/png,image/jpeg,image/webp" className={input} /></label>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="is_featured" defaultChecked={props.featured} className="accent-emerald-500" /> Featured on the homepage</label>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="is_active" defaultChecked={props.active} className="accent-emerald-500" /> Visible to the public</label>
      <div className="sm:col-span-2">
        {state?.error && <p role="alert" className="mb-2 text-sm text-red-400">{state.error}</p>}
        {state?.success && <p className="mb-2 text-sm text-emerald-300">{state.success}</p>}
        <button disabled={pending} className="rounded-lg bg-emerald-500 px-5 py-2 font-medium text-zinc-950 hover:bg-emerald-400 disabled:opacity-60">
          {pending ? "Saving…" : props.id === "new" ? "Create charity" : "Save changes"}
        </button>
      </div>
    </form>
  );
}

export function EventForm({ charityId }: { charityId: string }) {
  const [state, action, pending] = useActionState<CharityAdminState, FormData>(addEvent, null);
  return (
    <form action={action} className="grid gap-3 sm:grid-cols-2">
      <input type="hidden" name="charityId" value={charityId} />
      <input name="title" placeholder="Event title" required className={input} aria-label="Event title" />
      <input name="event_date" type="date" required className={input} aria-label="Event date" />
      <input name="location" placeholder="Location" className={input} aria-label="Location" />
      <input name="description" placeholder="Short description" className={input} aria-label="Description" />
      <div className="sm:col-span-2">
        {state?.error && <p role="alert" className="mb-2 text-sm text-red-400">{state.error}</p>}
        {state?.success && <p className="mb-2 text-sm text-emerald-300">{state.success}</p>}
        <button disabled={pending} className="rounded-lg border border-zinc-700 px-4 py-2 text-sm hover:bg-zinc-800 disabled:opacity-60">{pending ? "Adding…" : "Add event"}</button>
      </div>
    </form>
  );
}
