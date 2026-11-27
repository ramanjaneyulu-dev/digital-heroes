import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { CharityImage } from "@/components/charity-avatar";
import { createClient } from "@/lib/supabase/server";
import { sanitizeSearch } from "@/lib/charities";
import { formatMoney } from "@/lib/money";
import { CategoryEmblem, SearchIcon, ChevronLeftIcon, ChevronRightIcon } from "@/components/icons";

const PAGE_SIZE = 9;

type Row = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  is_featured: boolean;
  category: string | null;
};

// Map category to a tailwind-safe key for the cat-banner data attribute.
function catKey(c: string | null): string {
  if (!c) return "default";
  const known = ["Education", "Water", "Environment", "Health", "Children", "Hunger", "Animals", "Disaster"];
  return known.includes(c) ? c : "default";
}

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
    ((totals ?? []) as { charity_id: string; raised_cents: number; supporters: number }[]).map((t) => [t.charity_id, Number(t.raised_cents)])
  );
  const supporters = new Map<string, number>(
    ((totals ?? []) as { charity_id: string; raised_cents: number; supporters: number }[]).map((t) => [t.charity_id, Number(t.supporters ?? 0)])
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
    <div className="flex min-h-screen flex-col bg-zinc-950 text-zinc-100">
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-3 py-10 sm:px-6">
        {/* Header */}
        <p className="eyebrow">Causes you can back</p>
        <h1 className="section-title mt-2 text-2xl font-semibold sm:text-3xl">Every subscription funds a cause</h1>
        <p className="mt-2 max-w-2xl text-sm text-zinc-400 sm:text-base">
          Pick a charity that matters to you. At least 10% of every subscription goes to them — and you can make a one-off donation any time.
        </p>

        {/* Search */}
        <form action="/charities" className="mt-6 flex flex-wrap gap-3">
          <div className="relative w-full max-w-sm">
            <SearchIcon size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              name="q"
              defaultValue={q}
              placeholder="Search by name or cause"
              aria-label="Search charities"
              className="w-full rounded-lg border border-zinc-700 bg-zinc-900 pl-9 pr-3 py-2 text-zinc-100 outline-none focus:border-emerald-500"
            />
          </div>
          {category && <input type="hidden" name="category" value={category} />}
          <button className="rounded-lg bg-emerald-500 px-4 py-2 font-medium text-zinc-950 hover:bg-emerald-400">
            Search
          </button>
        </form>

        {/* Category chips */}
        <nav aria-label="Filter by category" className="pill-scroll mt-4 flex flex-wrap gap-2 overflow-x-auto">
          <Link
            href={href({ category: "" })}
            className={`shrink-0 rounded-full border px-3 py-1 text-sm transition ${
              !category ? "border-emerald-500 bg-emerald-500/10 text-emerald-300" : "border-zinc-700 text-zinc-300 hover:bg-zinc-800"
            }`}
          >
            All
          </Link>
          {categories.map((c) => (
            <Link
              key={c}
              href={href({ category: c })}
              className={`shrink-0 rounded-full border px-3 py-1 text-sm transition ${
                category === c ? "border-emerald-500 bg-emerald-500/10 text-emerald-300" : "border-zinc-700 text-zinc-300 hover:bg-zinc-800"
              }`}
            >
              {c}
            </Link>
          ))}
        </nav>

        {/* Grid */}
        {rows.length === 0 ? (
          <p className="mt-10 rounded-xl border border-dashed border-zinc-700 p-8 text-center text-zinc-400">
            No charities match your search.
          </p>
        ) : (
          <ul className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {rows.map((c) => {
              const ck = catKey(c.category);
              return (
                <li key={c.id}>
                  <Link
                    href={`/charities/${c.slug}`}
                    className="glass-card group flex h-full flex-col overflow-hidden transition hover:border-emerald-500/40"
                  >
                    {/* Category gradient banner with emblem */}
                    <div className="cat-banner flex items-center justify-between gap-3" data-cat={ck}>
                      <div className="flex items-center gap-2">
                        <CategoryEmblem category={c.category} size={20} className="text-white" />
                        <span className="text-xs font-semibold uppercase tracking-wider text-white/90">
                          {c.category ?? "Cause"}
                        </span>
                      </div>
                      {c.is_featured && (
                        <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white">
                          Featured
                        </span>
                      )}
                    </div>

                    {/* Image / initials tile */}
                    <CharityImage name={c.name} url={c.image_url} className="h-32 w-full" />

                    <div className="flex flex-1 flex-col p-4">
                      <h2 className="text-base font-semibold text-zinc-100 transition group-hover:text-emerald-300 sm:text-lg">
                        {c.name}
                      </h2>
                      <p className="mt-1 line-clamp-2 flex-1 text-sm text-zinc-400">{c.description}</p>
                      <div className="mt-4 flex items-center justify-between border-t border-white/5 pt-3 text-sm">
                        <span className="text-emerald-300">{formatMoney(raised.get(c.id) ?? 0)} raised</span>
                        <span className="text-zinc-500">
                          {supporters.get(c.id) ?? 0} backer{(supporters.get(c.id) ?? 0) === 1 ? "" : "s"}
                        </span>
                      </div>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-8 flex items-center justify-between text-sm text-zinc-400">
            <span>Page {page} of {totalPages}</span>
            <span className="flex gap-4">
              {page > 1 && (
                <Link className="inline-flex items-center gap-1 text-emerald-400 hover:underline" href={href({ page: page - 1 })}>
                  <ChevronLeftIcon size={14} /> Previous
                </Link>
              )}
              {page < totalPages && (
                <Link className="inline-flex items-center gap-1 text-emerald-400 hover:underline" href={href({ page: page + 1 })}>
                  Next <ChevronRightIcon size={14} />
                </Link>
              )}
            </span>
          </div>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
