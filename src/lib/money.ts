// Pure money helpers (no database, no framework) so they are easy to test.
// All amounts are integers in the smallest currency unit (paise for INR).

export type PaymentSplit = {
  charityCents: number;
  prizePoolCents: number;
  platformCents: number;
};

/**
 * Splits one subscription payment three ways:
 *   1. charity  = charityPct % of the fee (minimum 10%, chosen by the subscriber)
 *   2. prize pool = prizePoolShare of what is LEFT after the charity cut
 *   3. platform = everything else
 * The three parts always add up to the amount exactly (no money lost to rounding).
 * The SQL function _apply_payment() uses the same rules; keep them in sync.
 */
export function splitPayment(
  amountCents: number,
  charityPct: number,
  prizePoolShare: number
): PaymentSplit {
  if (!Number.isInteger(amountCents) || amountCents <= 0) {
    throw new RangeError("amountCents must be a positive whole number");
  }
  if (!(charityPct >= 10 && charityPct <= 100)) {
    throw new RangeError("charityPct must be between 10 and 100");
  }
  if (!(prizePoolShare >= 0 && prizePoolShare <= 1)) {
    throw new RangeError("prizePoolShare must be between 0 and 1");
  }

  // integer maths (hundredths of a percent / basis points) avoids floating-point drift
  const pctHundredths = Math.round(charityPct * 100);
  const shareBasisPoints = Math.round(prizePoolShare * 10000);

  const charityCents = Math.round((amountCents * pctHundredths) / 10000);
  const remainder = amountCents - charityCents;
  const prizePoolCents = Math.floor((remainder * shareBasisPoints) / 10000);
  const platformCents = remainder - prizePoolCents;

  return { charityCents, prizePoolCents, platformCents };
}

export function formatMoney(cents: number, currency = "INR"): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}
