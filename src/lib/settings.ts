import { createClient } from "@/lib/supabase/server";

// Pool percentages, currency etc. live in the `settings` table, not in code.
export async function getSettings() {
  const supabase = await createClient();
  const { data } = await supabase.from("settings").select("key, value");
  const map: Record<string, unknown> = {};
  for (const row of data ?? []) map[row.key as string] = row.value;

  return {
    prizePoolShare: Number(map.prize_pool_share ?? 0.5),
    currency: String(map.currency ?? "INR"),
  };
}
