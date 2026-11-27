"use server";

import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

// Demo gateway "pay" button for donations. Donations always use this sandbox gateway,
// even when subscriptions are paid through Stripe (one-off gifts are outside the draw maths). Conditional updates (only while 'pending')
// make a double-click or a replay harmless: the second one changes nothing.
export async function payDonation(formData: FormData) {
  const me = await requireUser();
  const id = String(formData.get("id") ?? "");
  const outcome = String(formData.get("outcome") ?? "success");

  const admin = createAdminClient();
  const { data: d } = await admin
    .from("donations").select("id, status, charity_id").eq("id", id).eq("user_id", me.id).maybeSingle();
  if (!d) redirect("/charities");
  if (d.status !== "pending") redirect(`/donate/${id}`);

  if (outcome === "decline") {
    await admin.from("donations").update({ status: "failed" }).eq("id", id).eq("status", "pending");
    redirect(`/donate/${id}`);
  }

  const { data: paid } = await admin
    .from("donations")
    .update({ status: "paid", provider_payment_id: `demo_don_${randomUUID()}` })
    .eq("id", id).eq("status", "pending").select("id");
  if (!paid?.length) redirect(`/donate/${id}`);

  const { data: c } = await admin.from("charities").select("slug").eq("id", d.charity_id).maybeSingle();
  redirect(c ? `/charities/${c.slug}?thanks=1` : "/charities");
}
