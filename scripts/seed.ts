/**
 * Demo data seeder. Run from the project folder:
 *   npm i -D tsx
 *   npx tsx --env-file=.env.local scripts/seed.ts
 *
 * Creates: 1 demo admin, 1 demo subscriber and 16 more subscribers (monthly + yearly, different
 * charities and percentages, 5 scores each), real payments through the same database functions
 * the app uses, two PUBLISHED draws (the first rolls its jackpot over to the second), winners in
 * every verification/payout state, a few donations and an upcoming draft draw.
 * Uses the SECRET key, so run it only on your own machine. It refuses to run twice.
 */
import { createClient } from "@supabase/supabase-js";
import { runDraw, parsePoolSplit, parseRolloverTier, DEFAULT_SPLIT, DEFAULT_ROLLOVER_TIER, type EntryInput } from "../src/lib/draw";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY;
if (!url || !key) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY (run with --env-file=.env.local).");
const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

const SUBSCRIBER = { email: "demo.subscriber@example.com", password: "Demo@12345", name: "Demo Subscriber" };
const ADMIN = { email: "demo.admin@example.com", password: "Admin@12345", name: "Demo Admin" };
const NAMES = ["Aarav Reddy", "Diya Sharma", "Kabir Singh", "Meera Nair", "Rohan Gupta", "Ananya Iyer", "Vikram Rao", "Isha Patel",
  "Arjun Mehta", "Sana Khan", "Dev Malhotra", "Priya Das", "Karthik Raj", "Nisha Verma", "Rahul Bose", "Tara Joshi"];
const PCTS = [10, 15, 20, 25, 50];
const PNG_1X1 = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==", "base64");

// The first four subscribers get fixed scores so the two demo draws have predictable winners.
const FIXED: number[][] = [
  [10, 15, 20, 25, 30],
  [10, 15, 20, 25, 31],
  [10, 15, 20, 26, 32],
  [10, 15, 20, 27, 33],
];
let seed = 12345; // tiny deterministic random generator, so every run produces the same data
const rand = () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; };
function randomScores(): number[] {
  const pool = Array.from({ length: 45 }, (_, i) => i + 1).filter((n) => ![10, 15, 20, 25, 30, 40].includes(n)); // keep the demo draws predictable
  const out: number[] = [];
  while (out.length < 5) out.push(pool.splice(Math.floor(rand() * pool.length), 1)[0]);
  return out;
}
const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString().slice(0, 10);
const must = <T>(r: { data: T | null; error: { message: string } | null }, what: string): T => {
  if (r.error || r.data === null) throw new Error(`${what}: ${r.error?.message ?? "no data"}`);
  return r.data;
};

async function main() {
  // Safety: do not seed twice.
  const existing = await db.from("profiles").select("id").eq("email", SUBSCRIBER.email).maybeSingle();
  if (existing.data) throw new Error("Demo data already exists. Run the reset SQL from the guide first.");

  const plans = must(await db.from("plans").select("id, price_cents"), "plans");
  const price = (id: string) => plans.find((p: { id: string }) => p.id === id)!.price_cents as number;
  const charities = must(await db.from("charities").select("id").eq("is_active", true).order("name"), "charities") as { id: string }[];
  if (charities.length === 0) throw new Error("No charities found. Run the schema SQL first.");

  // ---- users ----
  async function createUser(email: string, password: string, name: string): Promise<string> {
    const r = await db.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { full_name: name } });
    if (r.error || !r.data.user) throw new Error(`createUser ${email}: ${r.error?.message}`);
    return r.data.user.id;
  }
  const adminId = await createUser(ADMIN.email, ADMIN.password, ADMIN.name);
  await db.from("profiles").update({ role: "admin" }).eq("id", adminId);

  const subs: { id: string; email: string }[] = [];
  const people = [SUBSCRIBER, ...NAMES.map((name, i) => ({ email: `hero${String(i + 1).padStart(2, "0")}@example.com`, password: "Hero@12345", name }))];
  for (let i = 0; i < people.length; i++) {
    const p = people[i];
    const id = await createUser(p.email, p.password, p.name);
    subs.push({ id, email: p.email });
    const charity = charities[i % charities.length].id;
    const pct = PCTS[i % PCTS.length];
    const plan = i % 3 === 0 ? "yearly" : "monthly";

    await db.from("profiles").update({ charity_id: charity, charity_pct: pct }).eq("id", id);

    // Real payment through the same database functions the app uses (ledger split + subscription).
    const session = must(await db.from("payment_sessions").insert({
      user_id: id, plan_id: plan, charity_id: charity, charity_pct: pct, amount_cents: price(plan), provider: "demo", status: "pending",
    }).select("id").single(), "payment_session") as { id: string };
    const paid = await db.rpc("complete_checkout", { p_session_id: session.id, p_provider_payment_id: `seed_pay_${id}` });
    if (paid.error) throw new Error(`complete_checkout: ${paid.error.message}`);

    // Five scores on five different past dates (oldest first so the rolling-5 trigger is happy).
    const scores = i < FIXED.length ? FIXED[i] : randomScores();
    for (let s = 0; s < 5; s++) {
      const ins = await db.from("scores").insert({ user_id: id, score: scores[s], played_on: daysAgo(35 - s * 7) });
      if (ins.error) throw new Error(`score: ${ins.error.message}`);
    }
  }
  console.log(`Created ${subs.length} subscribers + 1 admin.`);

  // ---- donations ----
  for (let i = 0; i < 5; i++) {
    await db.from("donations").insert({
      user_id: subs[i].id, charity_id: charities[i % charities.length].id,
      amount_cents: [50000, 100000, 25000, 75000, 150000][i], status: "paid", provider_payment_id: `seed_don_${i}`,
    });
  }

  // ---- draws (published with the same database function the admin screen uses) ----
  const settings = must(await db.from("settings").select("key, value").in("key", ["pool_split", "rollover_tier"]), "settings") as { key: string; value: unknown }[];
  const get = (k: string) => settings.find((s) => s.key === k)?.value;
  const split = parsePoolSplit(get("pool_split")) ?? DEFAULT_SPLIT;
  const rolloverTier = parseRolloverTier(get("rollover_tier")) ?? DEFAULT_ROLLOVER_TIER;

  async function publish(label: string, month: string, numbers: number[]): Promise<string> {
    const draw = must(await db.from("draws").insert({
      label, draw_month: month, mode: "random", status: "simulated", winning_numbers: numbers,
      created_by: adminId, simulated_at: new Date().toISOString(),
    }).select("id").single(), "draw") as { id: string };

    const entries: EntryInput[] = [];
    for (let from = 0; ; from += 1000) {
      const page = await db.rpc("draw_eligible_entries").range(from, from + 999);
      if (page.error) throw new Error(`entries: ${page.error.message}`);
      for (const r of (page.data ?? []) as { user_id: string; scores: number[] }[]) entries.push({ userId: r.user_id, scores: r.scores });
      if (!page.data || page.data.length < 1000) break;
    }
    const pool = Number((await db.rpc("draw_pool_cents")).data ?? 0);
    const rollover = Number((await db.rpc("current_rollover_cents")).data ?? 0);
    const active = (await db.from("subscriptions").select("user_id", { count: "exact", head: true }).eq("status", "active")).count ?? 0;

    const r = runDraw({ mode: "random", entries, basePoolCents: pool, rolloverInCents: rollover, split, rolloverTier, winningNumbers: numbers });
    const res = await db.rpc("publish_draw", {
      p_draw_id: draw.id, p_winning: r.winningNumbers,
      p_entries: r.entries.map((e) => ({ user_id: e.userId, scores: e.scores, match_count: e.matchCount, tier: e.tier })),
      p_winners: r.winners.map((w) => ({ user_id: w.userId, tier: w.tier, prize_cents: w.prizeCents })),
      p_active_subscribers: active, p_pool_total: r.totalPoolCents, p_rollover_in: r.rolloverInCents, p_rollover_out: r.rolloverOutCents,
      p_config: { mode: "random", split, rolloverTier, basePoolCents: pool, seeded: true },
    });
    if (res.error) throw new Error(`publish_draw: ${res.error.message}`);
    console.log(`Published "${label}": ${r.winners.length} winners, jackpot rolls over ${r.rolloverOutCents} paise.`);
    return draw.id;
  }
  // October: nobody matches all 5, so the jackpot rolls over. November: Demo Subscriber hits all 5 and wins it.
  const oct = await publish("October 2026 draw", "2026-10-01", [10, 15, 20, 25, 40]);
  const nov = await publish("November 2026 draw", "2026-11-01", [10, 15, 20, 25, 30]);
  must(await db.from("draws").insert({ label: "December 2026 draw", draw_month: "2026-12-01", mode: "random", status: "draft", created_by: adminId }).select("id").single(), "draft draw");

  // ---- winners in every state ----
  async function setWinner(drawId: string, userId: string, patch: Record<string, unknown>, withProof: boolean) {
    const w = must(await db.from("winners").select("id").eq("draw_id", drawId).eq("user_id", userId).maybeSingle(), "winner") as { id: string };
    const update: Record<string, unknown> = { ...patch };
    if (withProof) {
      const path = `${userId}/${w.id}.png`;
      const up = await db.storage.from("proofs").upload(path, PNG_1X1, { contentType: "image/png", upsert: true });
      if (up.error) throw new Error(`proof upload: ${up.error.message}`);
      update.proof_url = path;
    }
    const r = await db.from("winners").update(update).eq("id", w.id);
    if (r.error) throw new Error(`winner update: ${r.error.message}`);
  }
  const now = new Date().toISOString();
  const [u0, u1, u2, u3] = subs;
  await setWinner(oct, u1.id, { verification: "approved", payout: "paid", reviewed_by: adminId, reviewed_at: now, paid_at: now }, true); // done
  await setWinner(oct, u0.id, { verification: "approved", reviewed_by: adminId, reviewed_at: now }, true);                               // approved, to pay
  await setWinner(oct, u2.id, { verification: "rejected", admin_note: "The screenshot was too blurry to read. Please upload a clearer one.", reviewed_by: adminId, reviewed_at: now }, true);
  await setWinner(oct, u3.id, {}, false);                                                                                                 // awaiting proof
  await setWinner(nov, u0.id, { verification: "pending" }, true);                                                                          // needs review

  console.log("\nDone. Demo logins:");
  console.log(`  Subscriber: ${SUBSCRIBER.email} / ${SUBSCRIBER.password}`);
  console.log(`  Admin:      ${ADMIN.email} / ${ADMIN.password}`);
}

main().catch((e) => { console.error("\nSeed failed:", e.message); process.exit(1); });
