"use server";

import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { isDemoMode } from "@/lib/payments";

// Demo gateway "pay" button for donations. Conditional updates (only while 'pending')
// make a double-click or a replay harmless: the second one changes nothing.
export async function payDonation(formData: FormData) {
  if (!isDemoMode()) throw new Error("Demo checkout is disabled");
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
