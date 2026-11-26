// Pure rules for winner proof + payout. No database, no React: easy to test.
// The server actions call these AND use conditional updates, so state can't skip steps.

export const MAX_PROOF_BYTES = 5 * 1024 * 1024; // 5 MB
export type Verification = "none" | "pending" | "approved" | "rejected";
export type Payout = "pending" | "paid";
export type ProofType = { ext: "png" | "jpg" | "webp"; mime: string };

/** Identify the image by its first bytes ("magic numbers"), not by the file name or the browser's claim. */
export function detectImageType(b: Uint8Array): ProofType | null {
  if (b.length >= 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47)
    return { ext: "png", mime: "image/png" };
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff)
    return { ext: "jpg", mime: "image/jpeg" };
  if (b.length >= 12 && b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 &&
      b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50)
    return { ext: "webp", mime: "image/webp" };
  return null;
}

export function validateProofFile(bytes: Uint8Array):
  { ok: true; type: ProofType } | { ok: false; error: string } {
  if (bytes.length === 0) return { ok: false, error: "Please choose a screenshot to upload." };
  if (bytes.length > MAX_PROOF_BYTES) return { ok: false, error: "That file is too large. The limit is 5 MB." };
  const type = detectImageType(bytes);
  if (!type) return { ok: false, error: "Only PNG, JPG or WebP screenshots are accepted." };
  return { ok: true, type };
}

/** A winner can (re)upload proof before review, or after a rejection. */
export const canUploadProof = (v: Verification) => v === "none" || v === "rejected";
/** Only a submitted proof can be approved or rejected. */
export const canReview = (v: Verification) => v === "pending";
/** Payout can be marked paid only after approval, and only once. */
export const canMarkPaid = (v: Verification, p: Payout) => v === "approved" && p === "pending";

export function statusLabel(v: Verification, p: Payout): string {
  if (p === "paid") return "Paid";
  if (v === "approved") return "Approved: payout pending";
  if (v === "pending") return "Proof under review";
  if (v === "rejected") return "Proof rejected: upload again";
  return "Upload your proof";
}
