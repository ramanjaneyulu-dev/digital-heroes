"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSubscriptionState } from "@/lib/subscription";
import { getPaymentProvider } from "@/lib/payments";

export type CheckoutState = { error?: string } | null;

const schema = z.object({
  planId: z.string().min(1, "Choose a plan"),
  charityId: z.string().uuid("Choose a charity"),
  charityPct: z.coerce
    .number()
    .min(10, "The minimum charity contribution is 10%")
    .max(100, "The maximum is 100%"),
});

export async function startCheckout(
  _prev: CheckoutState,
  formData: FormData
): Promise<CheckoutState> {
  const profile = await requireUser();

  const parsed = schema.safeParse({
    planId: formData.get("planId"),
    charityId: formData.get("charityId"),
    charityPct: formData.get("charityPct"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const state = await getSubscriptionState(profile.id);
  if (state.isActive) redirect("/dashboard");

  // The price always comes from the database, never from the browser.
  const supabase = await createClient();
  const [{ data: plan }, { data: charity }] = await Promise.all([
    supabase
      .from("plans")
      .select("id, price_cents")
      .eq("id", parsed.data.planId)
      .eq("is_active", true)
      .maybeSingle(),
    supabase
      .from("charities")
      .select("id")
      .eq("id", parsed.data.charityId)
      .eq("is_active", true)
      .maybeSingle(),
  ]);
  if (!plan) return { error: "That plan is not available" };
  if (!charity) return { error: "That charity is not available" };

  const provider = getPaymentProvider();
  const { data: session, error } = await createAdminClient()
    .from("payment_sessions")
    .insert({
      user_id: profile.id,
      plan_id: plan.id,
      charity_id: charity.id,
      charity_pct: parsed.data.charityPct,
      amount_cents: plan.price_cents,
      provider: provider.name,
    })
    .select("id")
    .single();

  if (error || !session) return { error: "Could not start checkout. Please try again." };
  const checkoutUrl = await provider.getCheckoutUrl(session.id);
  redirect(checkoutUrl);
}
