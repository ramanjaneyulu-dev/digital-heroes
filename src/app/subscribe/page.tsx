import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getSettings } from "@/lib/settings";
import { getSubscriptionState } from "@/lib/subscription";
import { isDemoMode } from "@/lib/payments";
import { SubscribeForm } from "./subscribe-form";

export default async function SubscribePage() {
  const profile = await requireUser();
  const state = await getSubscriptionState(profile.id);
  if (state.isActive) redirect("/dashboard");

  const supabase = await createClient();
  const [{ data: plans }, { data: charities }, settings] = await Promise.all([
    supabase.from("plans").select("id, name, price_cents, billing_months").eq("is_active", true).order("price_cents"),
    supabase.from("charities").select("id, name, description").eq("is_active", true).order("name"),
    getSettings(),
  ]);

  return (
    <main className="min-h-screen bg-zinc-950 px-6 py-10 text-zinc-100">
      <div className="mx-auto max-w-3xl">
        <Link href="/dashboard" className="text-sm text-zinc-400 hover:text-zinc-200">← Back to dashboard</Link>
        <h1 className="mt-4 text-3xl font-semibold">Join the draw. Fund a cause.</h1>
        <p className="mb-8 mt-2 text-zinc-400">Every plan backs a charity of your choice and enters you into the monthly prize draw.</p>
        {isDemoMode() && (
          <p className="mb-8 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
            Demo payments: no real money is charged and no card details are collected.
          </p>
        )}
        {(plans?.length ?? 0) === 0 || (charities?.length ?? 0) === 0 ? (
          <p className="text-zinc-400">Plans or charities are not set up yet.</p>
        ) : (
          <SubscribeForm
            plans={plans ?? []}
            charities={charities ?? []}
            defaultCharityId={profile.charity_id}
            defaultPct={Number(profile.charity_pct)}
            prizeShare={settings.prizePoolShare}
            currency={settings.currency}
          />
        )}
      </div>
    </main>
  );
}
