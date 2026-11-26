// Pure helpers for the charity features. No database, no React: easy to unit-test.

export const MIN_DONATION_CENTS = 5_000;       // Rs 50
export const MAX_DONATION_CENTS = 10_000_000;  // Rs 1,00,000
export const MIN_CHARITY_PCT = 10;             // PRD §08: minimum 10% of the subscription fee

export type AmountResult = { ok: true; cents: number } | { ok: false; error: string };

/** Turns what a person typed in rupees ("500", "1,250.50") into whole paise, with friendly errors. */
export function parseDonationAmount(raw: unknown): AmountResult {
  const n = typeof raw === "number" ? raw : Number(String(raw ?? "").replace(/,/g, "").trim());
  if (!Number.isFinite(n) || n <= 0) return { ok: false, error: "Enter an amount in rupees." };
  const cents = Math.round(n * 100);
  if (Math.abs(n * 100 - cents) > 1e-6) return { ok: false, error: "Use at most 2 decimal places." };
  if (cents < MIN_DONATION_CENTS) return { ok: false, error: "The minimum donation is ₹50." };
  if (cents > MAX_DONATION_CENTS) return { ok: false, error: "The maximum single donation is ₹1,00,000." };
  return { ok: true, cents };
}

/** "Bright Futures & Co." -> "bright-futures-co" (URL-safe, accent-free, max 60 chars). */
export function slugify(name: string): string {
  return name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/g, "");
}

/**
 * Cleans a search box value before it goes into a database filter. Removes the characters
 * (, ) % * \ that have special meaning in the filter syntax so input can't alter the query.
 */
export function sanitizeSearch(q: string | undefined | null): string {
  return (q ?? "")
    .replace(/[^\p{L}\p{M}\p{N} '-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 60);
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "?";
}
