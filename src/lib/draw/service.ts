// Server-side glue: reads the database, calls the PURE engine, saves results.
// Only admins may call these (checked again here, not just in the UI).
import "server-only";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  cryptoRng, runDraw, parsePoolSplit, parseRolloverTier,
  DEFAULT_SPLIT, DEFAULT_ROLLOVER_TIER, type DrawResult, type DrawMode, type EntryInput,
} from "./index";

type Admin = ReturnType<typeof createAdminClient>;
export type DrawServiceResult = { ok: true; result: DrawResult } | { ok: false; error: string };

const PAGE = 1000; // PostgREST returns at most 1000 rows per request, so we page.

async function loadInputs(admin: Admin) {
  const [settings, pool, rollover, subs] = await Promise.all([
    admin.from("settings").select("key, value").in("key", ["pool_split", "rollover_tier"]),
    admin.rpc("draw_pool_cents"),
    admin.rpc("current_rollover_cents"),
    admin.from("subscriptions").select("user_id", { count: "exact", head: true })
      .eq("status", "active").gt("current_period_end", new Date().toISOString()),
  ]);
  if (settings.error || pool.error || rollover.error || subs.error) throw new Error("load_failed");

  const byKey = new Map((settings.data ?? []).map((r: { key: string; value: unknown }) => [r.key, r.value]));
  const split = parsePoolSplit(byKey.get("pool_split")) ?? DEFAULT_SPLIT;
  const rolloverTier = parseRolloverTier(byKey.get("rollover_tier")) ?? DEFAULT_ROLLOVER_TIER;

  const entries: EntryInput[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await admin.rpc("draw_eligible_entries").range(from, from + PAGE - 1);
    if (error) throw new Error("load_failed");
    for (const r of (data ?? []) as { user_id: string; scores: number[] }[]) entries.push({ userId: r.user_id, scores: r.scores });
    if (!data || data.length < PAGE) break;
  }

  return {
    split, rolloverTier, entries,
    basePoolCents: Number(pool.data ?? 0),
    rolloverInCents: Number(rollover.data ?? 0),
    activeSubscribers: subs.count ?? 0,
  };
}

async function getDraw(admin: Admin, drawId: string) {
  const { data } = await admin.from("draws").select("id, mode, status, winning_numbers").eq("id", drawId).maybeSingle();
  return data as { id: string; mode: DrawMode; status: string; winning_numbers: number[] | null } | null;
}

/** Run the draw and store a PREVIEW on the draw row. Creates no winners and does not lock the draw. */
export async function simulateDraw(drawId: string): Promise<DrawServiceResult> {
  await requireAdmin();
  const admin = createAdminClient();
  try {
    const draw = await getDraw(admin, drawId);
    if (!draw) return { ok: false, error: "Draw not found." };
    if (draw.status === "published") return { ok: false, error: "This draw is already published." };

    const i = await loadInputs(admin);
    const result = runDraw({ ...i, mode: draw.mode, rng: cryptoRng() }); // fresh numbers each simulation

    const { error } = await admin.from("draws").update({
      status: "simulated",
      winning_numbers: result.winningNumbers,
      simulated_at: new Date().toISOString(),
      active_subscribers: i.activeSubscribers,
      pool_total_cents: result.totalPoolCents,
      rollover_in_cents: result.rolloverInCents,
      rollover_out_cents: result.rolloverOutCents,
    }).eq("id", drawId);
    if (error) return { ok: false, error: "Couldn't save the simulation." };
    return { ok: true, result };
  } catch {
    return { ok: false, error: "Couldn't run the simulation. Please try again." };
  }
}

/**
 * Publish: re-run against CURRENT data using the numbers the admin saw in the simulation,
 * then save everything in one database transaction (publish_draw). Cannot be published twice.
 */
export async function publishDraw(drawId: string): Promise<DrawServiceResult> {
  await requireAdmin();
  const admin = createAdminClient();
  try {
    const draw = await getDraw(admin, drawId);
    if (!draw) return { ok: false, error: "Draw not found." };
    if (draw.status === "published") return { ok: false, error: "This draw is already published." };
    if (draw.status !== "simulated" || !draw.winning_numbers) return { ok: false, error: "Run a simulation before publishing." };

    const i = await loadInputs(admin);
    const r = runDraw({ ...i, mode: draw.mode, winningNumbers: draw.winning_numbers });

    const { error } = await admin.rpc("publish_draw", {
      p_draw_id: drawId,
      p_winning: r.winningNumbers,
      p_entries: r.entries.map((e) => ({ user_id: e.userId, scores: e.scores, match_count: e.matchCount, tier: e.tier })),
      p_winners: r.winners.map((w) => ({ user_id: w.userId, tier: w.tier, prize_cents: w.prizeCents })),
      p_active_subscribers: i.activeSubscribers,
      p_pool_total: r.totalPoolCents,
      p_rollover_in: r.rolloverInCents,
      p_rollover_out: r.rolloverOutCents,
      p_config: { mode: draw.mode, split: i.split, rolloverTier: i.rolloverTier, basePoolCents: i.basePoolCents },
    });

    if (error) {
      const m = error.message ?? "";
      if (m.includes("already_published")) return { ok: false, error: "This draw is already published." };
      if (m.includes("rollover_changed")) return { ok: false, error: "Another draw was just published. Run the simulation again." };
      return { ok: false, error: "Couldn't publish the draw. Nothing was saved." };
    }
    return { ok: true, result: r };
  } catch {
    return { ok: false, error: "Couldn't publish the draw. Nothing was saved." };
  }
}
