"use server";
// Winner proof upload. Uses the secret-key client on the server because winners have no
// user UPDATE policy (so nobody can approve themselves). Ownership is checked in code.
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { validateProofFile, canUploadProof, type Verification } from "@/lib/winners";

export type ProofState = { error?: string; success?: string };

export async function uploadProof(_prev: ProofState, formData: FormData): Promise<ProofState> {
  const me = await requireUser();
  const winnerId = String(formData.get("winner_id") ?? "");
  const file = formData.get("proof");
  if (!winnerId) return { error: "Missing win." };
  if (!(file instanceof File)) return { error: "Please choose a screenshot to upload." };

  const admin = createAdminClient();

  // Ownership + state check: it must be MY win, and still open for proof.
  const { data: w } = await admin
    .from("winners")
    .select("id, user_id, verification, proof_url")
    .eq("id", winnerId)
    .eq("user_id", me.id)
    .maybeSingle();
  if (!w) return { error: "We couldn't find that win." };
  if (!canUploadProof(w.verification as Verification))
    return { error: "Your proof is already submitted. Wait for the review." };

  const bytes = new Uint8Array(await file.arrayBuffer());
  const check = validateProofFile(bytes);
  if (!check.ok) return { error: check.error };

  const path = `${me.id}/${winnerId}.${check.type.ext}`;
  const up = await admin.storage.from("proofs").upload(path, bytes, { contentType: check.type.mime, upsert: true });
  if (up.error) return { error: "Upload failed. Please try again." };

  // Clean up an older file if the extension changed.
  if (w.proof_url && w.proof_url !== path) await admin.storage.from("proofs").remove([w.proof_url]);

  const { data: updated } = await admin
    .from("winners")
    .update({ proof_url: path, verification: "pending", admin_note: null, reviewed_by: null, reviewed_at: null })
    .eq("id", winnerId)
    .eq("user_id", me.id)
    .in("verification", ["none", "rejected"])
    .select("id");
  if (!updated?.length) return { error: "Couldn't submit your proof. Please try again." };

  revalidatePath("/dashboard/winnings");
  revalidatePath("/admin/winners");
  return { success: "Proof submitted. We'll review it soon." };
}
