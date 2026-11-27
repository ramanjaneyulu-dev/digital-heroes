import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getSettings } from "@/lib/settings";
import { getSubscriptionState } from "@/lib/subscription";
import { isDemoMode } from "@/lib/payments";
import { SubscribeForm } from "./subscribe-form";
import { ChevronLeftIcon, HeartHandIcon, AlertIcon } from "@/components/icons";

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
    <main className="min-h-screen bg-zinc-950 px-3 py-8 text-zinc-100 sm:px-6 sm:py-10">
      <div className="mx-auto w-full max-w-3xl space-y-6">
        <Link href="/dashboard" className="inline-flex items-center gap-1 text-sm text-zinc-400 hover:text-zinc-200">
          <ChevronLeftIcon size={14} /> Back to dashboard
        </Link>
        <div className="flex items-center gap-3">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-300">
            <HeartHandIcon size={18} />
          </span>
          <div>
            <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold sm:text-3xl">Join the draw. Fund a cause.</h1>
            <p className="mt-1 text-sm text-zinc-400 sm:text-base">
              Every plan backs a charity of your choice and enters you into the monthly prize draw.
            </p>
          </div>
        </div>

        {isDemoMode() && (
          <p className="alert-banner" data-tone="amber">
            <AlertIcon size={18} className="mt-0.5 text-amber-300" />
            <span className="flex-1 text-sm">
              Demo payments: no real money is charged and no card details are collected.
            </span>
          </p>
        )}

        {(plans?.length ?? 0) === 0 || (charities?.length ?? 0) === 0 ? (
          <p className="rounded-xl border border-dashed border-zinc-700 p-6 text-center text-zinc-400">
            Plans or charities are not set up yet.
          </p>
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
