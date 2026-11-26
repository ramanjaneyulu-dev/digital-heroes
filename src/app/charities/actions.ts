"use server";

import { redirect } from "next/navigation";
import { getProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { parseDonationAmount } from "@/lib/charities";

export type DonateState = { error?: string } | null;

// Starts an independent donation (PRD §08: not tied to gameplay or the subscription).
export async function startDonation(_prev: DonateState, formData: FormData): Promise<DonateState> {
  const slug = String(formData.get("slug") ?? "");
  const me = await getProfile();
  if (!me) redirect(`/login?next=${encodeURIComponent(`/charities/${slug}`)}`);

  const amount = parseDonationAmount(formData.get("amount"));
  if (!amount.ok) return { error: amount.error };

  const supabase = await createClient();
  const { data: charity } = await supabase
    .from("charities").select("id").eq("slug", slug).eq("is_active", true).maybeSingle();
  if (!charity) return { error: "That charity is not available." };

  // The row is written by the server (secret key); users have no insert policy on donations.
  const { data: donation, error } = await createAdminClient()
    .from("donations")
    .insert({ user_id: me.id, charity_id: charity.id, amount_cents: amount.cents, status: "pending" })
    .select("id")
    .single();
  if (error || !donation) return { error: "Could not start the donation. Please try again." };

  redirect(`/donate/${donation.id}`);
}
