import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { CharityImage } from "@/components/charity-avatar";
import { createClient } from "@/lib/supabase/server";
import { sanitizeSearch } from "@/lib/charities";
import { formatMoney } from "@/lib/money";

const PAGE_SIZE = 9;

type Row = { id: string; name: string; slug: string; description: string | null; image_url: string | null; is_featured: boolean; category: string | null };

// Public charity directory with search, category filter and pagination (PRD §08.2).
export default async function CharitiesPage({
  searchParams,
}: { searchParams: Promise<{ q?: string; category?: string; page?: string }> }) {
  const sp = await searchParams;
  const q = sanitizeSearch(sp.q);
  const page = Math.max(1, Number.parseInt(sp.page ?? "1", 10) || 1);
  const from = (page - 1) * PAGE_SIZE;

  const supabase = await createClient();

  // Categories for the filter chips (small table, one cheap query).
  const { data: catRows } = await supabase.from("charities").select("category").eq("is_active", true);
  const categories = [...new Set((catRows ?? []).map((r: { category: string | null }) => r.category).filter((c): c is string => !!c))].sort();
  const category = categories.includes(sp.category ?? "") ? sp.category! : "";

  let query = supabase
    .from("charities")
    .select("id, name, slug, description, image_url, is_featured, category", { count: "exact" })
    .eq("is_active", true);
  if (category) query = query.eq("category", category);
  if (q) query = query.or(`name.ilike.%${q}%,description.ilike.%${q}%`);
  const { data, count } = await query
    .order("is_featured", { ascending: false })
    .order("name")
    .range(from, from + PAGE_SIZE - 1);
  const rows = (data ?? []) as Row[];
  const totalPages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE));

  const { data: totals } = await supabase.rpc("charity_totals");
  const raised = new Map<string, number>(
    ((totals ?? []) as { charity_id: string; raised_cents: number }[]).map((t) => [t.charity_id, Number(t.raised_cents)])
  );

  const href = (over: { q?: string; category?: string; page?: number }) => {
    const p = new URLSearchParams();
    const nq = over.q ?? q, nc = over.category ?? category;
    if (nq) p.set("q", nq);
    if (nc) p.set("category", nc);
    if ((over.page ?? 1) > 1) p.set("page", String(over.page));
    const s = p.toString();
    return `/charities${s ? `?${s}` : ""}`;
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-6 py-10">
        <h1 className="text-3xl font-semibold">Causes you can back</h1>
        <p className="mt-2 max-w-2xl text-zinc-400">Every subscription sends at least 10% to a charity you choose. Pick one that matters to you, or give directly with a one-off donation.</p>

        <form action="/charities" className="mt-6 flex flex-wrap gap-3">
          <input name="q" defaultValue={q} placeholder="Search by name or cause" aria-label="Search charities"
            className="w-full max-w-sm rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 outline-none focus:border-emerald-500" />
          {category && <input type="hidden" name="category" value={category} />}
          <button className="rounded-lg bg-emerald-500 px-4 py-2 font-medium text-zinc-950 hover:bg-emerald-400">Search</button>
        </form>

        <nav aria-label="Filter by category" className="mt-4 flex flex-wrap gap-2">
          <Link href={href({ category: "" })} className={`rounded-full border px-3 py-1 text-sm ${!category ? "border-emerald-500 bg-emerald-500/10 text-emerald-300" : "border-zinc-700 text-zinc-300 hover:bg-zinc-800"}`}>All</Link>
          {categories.map((c) => (
            <Link key={c} href={href({ category: c })} className={`rounded-full border px-3 py-1 text-sm ${category === c ? "border-emerald-500 bg-emerald-500/10 text-emerald-300" : "border-zinc-700 text-zinc-300 hover:bg-zinc-800"}`}>{c}</Link>
          ))}
        </nav>

        {rows.length === 0 ? (
          <p className="mt-10 rounded-xl border border-dashed border-zinc-700 p-8 text-center text-zinc-400">No charities match your search.</p>
        ) : (
          <ul className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {rows.map((c) => (
              <li key={c.id}>
                <Link href={`/charities/${c.slug}`} className="group block overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/50 transition hover:border-emerald-500/50">
                  <CharityImage name={c.name} url={c.image_url} className="h-40 w-full" />
                  <div className="p-5">
                    <div className="flex items-center gap-2">
                      {c.category && <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-xs text-zinc-300">{c.category}</span>}
                      {c.is_featured && <span className="rounded-full bg-amber-400/15 px-2 py-0.5 text-xs text-amber-300">Featured</span>}
                    </div>
                    <h2 className="mt-3 text-lg font-semibold group-hover:text-emerald-300">{c.name}</h2>
                    <p className="mt-1 line-clamp-2 text-sm text-zinc-400">{c.description}</p>
                    <p className="mt-4 text-sm text-emerald-300">{formatMoney(raised.get(c.id) ?? 0)} raised</p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}

        {totalPages > 1 && (
          <div className="mt-8 flex items-center justify-between text-sm text-zinc-400">
            <span>Page {page} of {totalPages}</span>
            <span className="flex gap-4">
              {page > 1 && <Link className="text-emerald-400 hover:underline" href={href({ page: page - 1 })}>← Previous</Link>}
              {page < totalPages && <Link className="text-emerald-400 hover:underline" href={href({ page: page + 1 })}>Next →</Link>}
            </span>
          </div>
        )}
      </main>
    </div>
  );
}
