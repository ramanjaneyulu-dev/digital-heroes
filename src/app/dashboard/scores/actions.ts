"use server";
// Score writes. They run as the LOGGED-IN user (not the secret key), so Row Level
// Security, the UNIQUE(user_id, played_on) rule and the rolling-5 trigger all apply.
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getSubscriptionState } from "@/lib/subscription";
import { parseScoreInput, friendlyScoreError } from "@/lib/scores";

export type ScoreFormState = { error?: string; success?: string };

async function guard() {
  const profile = await requireUser();
  const sub = await getSubscriptionState(profile.id); // real-time check
  return { profile, active: sub.isActive };
}

export async function addScore(_prev: ScoreFormState, formData: FormData): Promise<ScoreFormState> {
  const { profile, active } = await guard();
  if (!active) return { error: "You need an active subscription to enter scores." };

  const parsed = parseScoreInput({ score: formData.get("score"), played_on: formData.get("played_on") });
  if (!parsed.ok) return { error: parsed.error };

  const supabase = await createClient();
  const { error } = await supabase.from("scores").insert({ user_id: profile.id, ...parsed.data });
  if (error) return { error: friendlyScoreError(error) };

  revalidatePath("/dashboard/scores");
  revalidatePath("/dashboard");
  return { success: "Score saved." };
}

export async function updateScore(_prev: ScoreFormState, formData: FormData): Promise<ScoreFormState> {
  const { profile, active } = await guard();
  if (!active) return { error: "You need an active subscription to edit scores." };

  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Missing score." };
  const parsed = parseScoreInput({ score: formData.get("score"), played_on: formData.get("played_on") });
  if (!parsed.ok) return { error: parsed.error };

  const supabase = await createClient();
  const { error } = await supabase
    .from("scores")
    .update(parsed.data)
    .eq("id", id)
    .eq("user_id", profile.id);
  if (error) return { error: friendlyScoreError(error) };

  revalidatePath("/dashboard/scores");
  return { success: "Score updated." };
}

export async function deleteScore(formData: FormData) {
  const { profile, active } = await guard();
  if (!active) return;
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const supabase = await createClient();
  await supabase.from("scores").delete().eq("id", id).eq("user_id", profile.id);
  revalidatePath("/dashboard/scores");
  revalidatePath("/dashboard");
}
