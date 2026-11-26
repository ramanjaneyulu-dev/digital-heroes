"use server";
// Admin user management. Every action re-checks the admin role on the server and uses the
// secret-key client, so the same database rules (CHECKs, the rolling-5 trigger) still apply.
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { addMonthsUtc } from "@/lib/dates";
import { friendlyScoreError, parseScoreInput } from "@/lib/scores";

export type AdminFormState = { error?: string; success?: string } | null;
const refresh = (id: string) => { revalidatePath(`/admin/users/${id}`); revalidatePath("/admin/users"); };
const uuid = z.string().uuid();

const profileSchema = z.object({
  userId: uuid,
  full_name: z.string().trim().max(80),
  charity_id: z.union([uuid, z.literal("")]),
  charity_pct: z.coerce.number().min(10, "Charity share must be at least 10%").max(100),
  role: z.enum(["subscriber", "admin"]),
});

export async function updateProfile(_prev: AdminFormState, formData: FormData): Promise<AdminFormState> {
  const me = await requireAdmin();
  const p = profileSchema.safeParse(Object.fromEntries(formData));
  if (!p.success) return { error: p.error.issues[0].message };
  if (p.data.userId === me.id && p.data.role !== "admin") return { error: "You can't remove your own admin role." };

  const { error } = await createAdminClient().from("profiles").update({
    full_name: p.data.full_name || null,
    charity_id: p.data.charity_id || null,
    charity_pct: p.data.charity_pct,
    role: p.data.role,
  }).eq("id", p.data.userId);
  if (error) return { error: "Couldn't save the profile." };
  refresh(p.data.userId);
  return { success: "Profile saved." };
}

const OPS = ["grant_month", "grant_year", "cancel_now", "deactivate"] as const;

// Support tools: complimentary access (no payment is recorded), or end access immediately.
export async function subscriptionAction(formData: FormData) {
  await requireAdmin();
  const userId = uuid.safeParse(formData.get("userId"));
  const op = z.enum(OPS).safeParse(formData.get("op"));
  if (!userId.success || !op.success) return;

  const admin = createAdminClient();
  const now = new Date();
  const nowIso = now.toISOString();

  if (op.data === "grant_month" || op.data === "grant_year") {
    const months = op.data === "grant_month" ? 1 : 12;
    const { data: cur } = await admin.from("subscriptions").select("status, current_period_end").eq("user_id", userId.data).maybeSingle();
    // Extend from the current end if still paid up, otherwise from now.
    const base = cur?.status === "active" && cur.current_period_end && new Date(cur.current_period_end) > now ? new Date(cur.current_period_end) : now;
    await admin.from("subscriptions").upsert({
      user_id: userId.data, plan_id: months === 1 ? "monthly" : "yearly", status: "active",
      current_period_end: addMonthsUtc(base, months).toISOString(), cancel_at_period_end: false, updated_at: nowIso,
    }, { onConflict: "user_id" });
  } else if (op.data === "cancel_now") {
    await admin.from("subscriptions").update({ status: "canceled", current_period_end: nowIso, cancel_at_period_end: true, updated_at: nowIso }).eq("user_id", userId.data);
  } else {
    await admin.from("subscriptions").update({ status: "inactive", current_period_end: null, cancel_at_period_end: false, updated_at: nowIso }).eq("user_id", userId.data);
  }
  refresh(userId.data);
}

// ---- Scores (PRD §11.1: "Edit golf scores") ----
export async function adminAddScore(_prev: AdminFormState, formData: FormData): Promise<AdminFormState> {
  await requireAdmin();
  const userId = uuid.safeParse(formData.get("userId"));
  const parsed = parseScoreInput({ score: formData.get("score"), played_on: formData.get("played_on") });
  if (!userId.success) return { error: "Missing user." };
  if (!parsed.ok) return { error: parsed.error };
  const { error } = await createAdminClient().from("scores").insert({ user_id: userId.data, ...parsed.data });
  if (error) return { error: friendlyScoreError(error) };
  refresh(userId.data);
  return { success: "Score added." };
}

export async function adminUpdateScore(_prev: AdminFormState, formData: FormData): Promise<AdminFormState> {
  await requireAdmin();
  const userId = uuid.safeParse(formData.get("userId"));
  const id = uuid.safeParse(formData.get("id"));
  const parsed = parseScoreInput({ score: formData.get("score"), played_on: formData.get("played_on") });
  if (!userId.success || !id.success) return { error: "Missing score." };
  if (!parsed.ok) return { error: parsed.error };
  const { error } = await createAdminClient().from("scores").update(parsed.data).eq("id", id.data).eq("user_id", userId.data);
  if (error) return { error: friendlyScoreError(error) };
  refresh(userId.data);
  return { success: "Score updated." };
}

export async function adminDeleteScore(formData: FormData) {
  await requireAdmin();
  const userId = uuid.safeParse(formData.get("userId"));
  const id = uuid.safeParse(formData.get("id"));
  if (!userId.success || !id.success) return;
  await createAdminClient().from("scores").delete().eq("id", id.data).eq("user_id", userId.data);
  refresh(userId.data);
}
