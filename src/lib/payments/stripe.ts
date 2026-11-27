import Stripe from "stripe";
import type { PaymentProvider } from "./types";
import { createAdminClient } from "@/lib/supabase/admin";

function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("Missing STRIPE_SECRET_KEY in environment variables.");
  return new Stripe(key);
}

export const stripeProvider: PaymentProvider = {
  name: "stripe",

  async getCheckoutUrl(sessionId: string): Promise<string> {
    const stripe = getStripe();
    const admin = createAdminClient();

    // 1. Fetch the pending session created in Supabase
    const { data: session, error } = await admin
      .from("payment_sessions")
      .select("id, user_id, plan_id, amount_cents, charity_pct")
      .eq("id", sessionId)
      .single();

    if (error || !session) {
      throw new Error(`Payment session not found: ${error?.message}`);
    }

    const { data: plan } = await admin
      .from("plans")
      .select("name")
      .eq("id", session.plan_id)
      .single();

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    // 2. Create hosted checkout session on Stripe (Dynamic Payment Methods)
    const checkoutSession = await stripe.checkout.sessions.create({
      line_items: [
        {
          price_data: {
            currency: "inr",
            product_data: {
              name: `Digital Heroes — ${plan?.name ?? "Membership Plan"}`,
              description: `Includes ${Number(session.charity_pct)}% guaranteed charity contribution + Monthly Prize Draw entry.`,
            },
            unit_amount: session.amount_cents, // amount in paise (e.g. 49900 = ₹499)
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      client_reference_id: session.id,
      metadata: {
        sessionId: session.id,
        userId: session.user_id,
      },
      success_url: `${appUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/subscribe`,
    });

    if (!checkoutSession.url) throw new Error("Stripe failed to return a checkout URL.");
    return checkoutSession.url;
  },

  async cancelSubscription(): Promise<void> {
    // Handled in platform database
  },
};