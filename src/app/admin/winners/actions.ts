"use server";
// Admin winner review. Each action re-checks the admin role and uses a CONDITIONAL update
// (e.g. only where verification = 'pending'), so a double-click or stale page can't skip a state.
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

const done = () => { revalidatePath("/admin/winners"); revalidatePath("/dashboard/winnings"); };
const idOf = (f: FormData) => String(f.get("id") ?? "");
const noteOf = (f: FormData) => String(f.get("note") ?? "").trim().slice(0, 300);

export async function approveWinner(formData: FormData) {
  const me = await requireAdmin();
  const id = idOf(formData);
  if (!id) return;
  await createAdminClient().from("winners")
    .update({ verification: "approved", reviewed_by: me.id, reviewed_at: new Date().toISOString(), admin_note: noteOf(formData) || null })
    .eq("id", id).eq("verification", "pending");
  done();
}

export async function rejectWinner(formData: FormData) {
  const me = await requireAdmin();
  const id = idOf(formData);
  if (!id) return;
  const note = noteOf(formData) || "Proof could not be verified. Please upload a clearer screenshot.";
  await createAdminClient().from("winners")
    .update({ verification: "rejected", reviewed_by: me.id, reviewed_at: new Date().toISOString(), admin_note: note })
    .eq("id", id).eq("verification", "pending");
  done();
}

export async function markPaid(formData: FormData) {
  await requireAdmin();
  const id = idOf(formData);
  if (!id) return;
  await createAdminClient().from("winners")
    .update({ payout: "paid", paid_at: new Date().toISOString() })
    .eq("id", id).eq("verification", "approved").eq("payout", "pending");
  done();
}
