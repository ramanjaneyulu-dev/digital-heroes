// Real-time subscription status. Called on every request that needs it, so a
// subscription whose paid period has ended stops counting as active immediately.
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export type SubscriptionStatus = "inactive" | "active" | "past_due" | "canceled" | "lapsed";

export type SubscriptionState = {
  status: SubscriptionStatus;
  planId: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  isActive: boolean;
};

const INACTIVE: SubscriptionState = {
  status: "inactive",
  planId: null,
  currentPeriodEnd: null,
  cancelAtPeriodEnd: false,
  isActive: false,
};

export async function getSubscriptionState(userId: string): Promise<SubscriptionState> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("subscriptions")
    .select("status, plan_id, current_period_end, cancel_at_period_end")
    .eq("user_id", userId)
    .maybeSingle();

  if (!data) return INACTIVE;

  let status = data.status as SubscriptionStatus;
  const periodEnded =
    !!data.current_period_end && new Date(data.current_period_end).getTime() <= Date.now();

  // Paid period is over: flip the stored status so reports and the database agree.
  if (status === "active" && periodEnded) {
    status = data.cancel_at_period_end ? "canceled" : "lapsed";
    await createAdminClient()
      .from("subscriptions")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("user_id", userId)
      .eq("status", "active");
  }

  return {
    status,
    planId: data.plan_id ?? null,
    currentPeriodEnd: data.current_period_end ?? null,
    cancelAtPeriodEnd: !!data.cancel_at_period_end,
    isActive: status === "active",
  };
}

// Use at the top of pages that need an active subscription (e.g. score entry).
export async function requireActiveSubscription(userId: string): Promise<SubscriptionState> {
  const state = await getSubscriptionState(userId);
  if (!state.isActive) redirect("/subscribe");
  return state;
}
