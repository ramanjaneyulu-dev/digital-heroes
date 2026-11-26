"use server";

import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isDemoMode } from "@/lib/payments";

// The demo gateway's "pay" button. A real gateway would call us back with a
// signed webhook instead; either way the money is recorded by the same database
// function (complete_checkout), which is atomic and ignores duplicate events.
export async function payWithTestCard(formData: FormData) {
  if (!isDemoMode()) throw new Error("Demo checkout is disabled");

  const sessionId = String(formData.get("sessionId") ?? "");
  const outcome = String(formData.get("outcome") ?? "success");

  const profile = await requireUser();
  const supabase = await createClient();
  const { data: session } = await supabase
    .from("payment_sessions")
    .select("id, status, user_id")
    .eq("id", sessionId)
    .maybeSingle();

  if (!session || session.user_id !== profile.id) redirect("/subscribe");
  if (session.status !== "pending") redirect(`/checkout/${sessionId}`);

  const admin = createAdminClient();

  if (outcome === "decline") {
    await admin.rpc("fail_checkout", { p_session_id: sessionId, p_reason: "card_declined" });
    redirect(`/checkout/${sessionId}`);
  }

  const { error } = await admin.rpc("complete_checkout", {
    p_session_id: sessionId,
    p_provider_payment_id: `demo_pay_${randomUUID()}`,
  });
  if (error) redirect(`/checkout/${sessionId}?error=1`);

  redirect("/dashboard?subscribed=1");
}
