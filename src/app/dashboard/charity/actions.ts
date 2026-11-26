"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { MIN_CHARITY_PCT } from "@/lib/charities";

export type CharityFormState = { error?: string; success?: string } | null;

const schema = z.object({
  charityId: z.string().uuid("Choose a charity"),
  charityPct: z.coerce.number().min(MIN_CHARITY_PCT, `The minimum is ${MIN_CHARITY_PCT}%`).max(100, "The maximum is 100%"),
});

// Runs as the logged-in user, so Row Level Security (own profile only) and the
// database CHECK (10-100%) both apply on top of this validation.
export async function updateCharity(_prev: CharityFormState, formData: FormData): Promise<CharityFormState> {
  const me = await requireUser();
  const parsed = schema.safeParse({ charityId: formData.get("charityId"), charityPct: formData.get("charityPct") });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const { data: charity } = await supabase.from("charities").select("id").eq("id", parsed.data.charityId).eq("is_active", true).maybeSingle();
  if (!charity) return { error: "That charity is not available." };

  const { error } = await supabase.from("profiles").update({ charity_id: charity.id, charity_pct: parsed.data.charityPct }).eq("id", me.id);
  if (error) return { error: "Couldn't save your choice. Please try again." };

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/charity");
  return { success: "Saved. This applies from your next payment." };
}
