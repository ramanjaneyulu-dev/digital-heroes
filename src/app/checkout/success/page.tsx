import { redirect } from "next/navigation";
import Stripe from "stripe";
import { requireUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export default async function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>;
}) {
  const { session_id } = await searchParams;
  await requireUser();

  if (!session_id) redirect("/dashboard");

  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) redirect("/dashboard");

  const stripe = new Stripe(secretKey, {
    apiVersion: "2025-02-24.acacia" as Stripe.LatestApiVersion,
  });

  try {
    const session = await stripe.checkout.sessions.retrieve(session_id);
    const internalSessionId = session.metadata?.sessionId || session.client_reference_id;
    const stripePaymentId = typeof session.payment_intent === "string" 
      ? session.payment_intent 
      : session.id;

    if (session.payment_status === "paid" && internalSessionId && stripePaymentId) {
      const admin = createAdminClient();
      await admin.rpc("complete_checkout", {
        p_session_id: internalSessionId,
        p_provider_payment_id: stripePaymentId,
      });
    }
  } catch (err) {
    console.error("Error verifying Stripe session:", err);
  }

  redirect("/dashboard?subscribed=1");
}