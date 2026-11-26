"use server";
// Admin draw actions. Every action re-checks the admin role on the server.
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { simulateDraw, publishDraw } from "@/lib/draw/service";
import type { DrawResult } from "@/lib/draw";

export type DrawActionState = { error?: string; result?: DrawResult; published?: boolean };

export async function createDraft(formData: FormData) {
  await requireAdmin();
  const p = z.object({
    label: z.string().trim().min(1).max(80),
    month: z.string().regex(/^\d{4}-\d{2}$/),
    mode: z.enum(["random", "algorithmic_common", "algorithmic_rare"]),
  }).safeParse(Object.fromEntries(formData));
  if (!p.success) return;
  await createAdminClient().from("draws").insert({
    label: p.data.label, draw_month: `${p.data.month}-01`, mode: p.data.mode, status: "draft",
  });
  revalidatePath("/admin/draws");
}

export async function simulateAction(_p: DrawActionState, formData: FormData): Promise<DrawActionState> {
  const r = await simulateDraw(String(formData.get("id") ?? ""));
  revalidatePath("/admin/draws");
  return r.ok ? { result: r.result } : { error: r.error };
}

export async function publishAction(_p: DrawActionState, formData: FormData): Promise<DrawActionState> {
  const r = await publishDraw(String(formData.get("id") ?? ""));
  revalidatePath("/admin/draws");
  return r.ok ? { result: r.result, published: true } : { error: r.error };
}
