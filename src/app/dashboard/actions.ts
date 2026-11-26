"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSubscriptionState } from "@/lib/subscription";
import { getPaymentProvider, isDemoMode } from "@/lib/payments";

// Stop the plan renewing; the subscriber keeps access until the paid period ends.
export async function cancelSubscription() {
  const profile = await requireUser();
  const state = await getSubscriptionState(profile.id);
  if (!state.isActive) return;

  const admin = createAdminClient();
  const { data } = await admin
    .from("subscriptions")
    .select("provider_subscription_id")
    .eq("user_id", profile.id)
    .maybeSingle();

  await getPaymentProvider().cancelSubscription(data?.provider_subscription_id ?? null);
  await admin
    .from("subscriptions")
    .update({ cancel_at_period_end: true, updated_at: new Date().toISOString() })
    .eq("user_id", profile.id);
  revalidatePath("/dashboard");
}

export async function resumeSubscription() {
  const profile = await requireUser();
  const state = await getSubscriptionState(profile.id);
  if (!state.isActive) return;

  await createAdminClient()
    .from("subscriptions")
    .update({ cancel_at_period_end: false, updated_at: new Date().toISOString() })
    .eq("user_id", profile.id);
  revalidatePath("/dashboard");
}

// ---- Demo-only tools: let reviewers see the whole lifecycle without waiting a month ----

export async function demoRenew() {
  if (!isDemoMode()) return;
  const profile = await requireUser();
  const state = await getSubscriptionState(profile.id);
  if (!state.planId || state.cancelAtPeriodEnd) return;

  await createAdminClient().rpc("renew_subscription", {
    p_user_id: profile.id,
    p_provider_payment_id: `demo_renew_${randomUUID()}`,
  });
  revalidatePath("/dashboard");
}

export async function demoLapse() {
  if (!isDemoMode()) return;
  const profile = await requireUser();

  await createAdminClient()
    .from("subscriptions")
    .update({
      current_period_end: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", profile.id)
    .eq("status", "active");
  revalidatePath("/dashboard");
}
