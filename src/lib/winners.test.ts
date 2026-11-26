import { describe, it, expect } from "vitest";
import { detectImageType, validateProofFile, canUploadProof, canReview, canMarkPaid, statusLabel, MAX_PROOF_BYTES } from "./winners";

const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0]);
const jpg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0]);
const webp = new Uint8Array([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50]);

describe("proof file validation", () => {
  it("detects png, jpg and webp by content", () => {
    expect(detectImageType(png)?.ext).toBe("png");
    expect(detectImageType(jpg)?.ext).toBe("jpg");
    expect(detectImageType(webp)?.ext).toBe("webp");
  });
  it("rejects other content even if named .png", () => {
    expect(validateProofFile(new TextEncoder().encode("<html>not an image</html>")).ok).toBe(false);
  });
  it("rejects empty and oversized files", () => {
    expect(validateProofFile(new Uint8Array(0)).ok).toBe(false);
    const big = new Uint8Array(MAX_PROOF_BYTES + 1);
    big.set(png);
    expect(validateProofFile(big).ok).toBe(false);
  });
  it("accepts a valid image", () => {
    expect(validateProofFile(png).ok).toBe(true);
  });
});

describe("state rules", () => {
  it("upload allowed only before review or after rejection", () => {
    expect(canUploadProof("none")).toBe(true);
    expect(canUploadProof("rejected")).toBe(true);
    expect(canUploadProof("pending")).toBe(false);
    expect(canUploadProof("approved")).toBe(false);
  });
  it("only pending proofs can be reviewed", () => {
    expect(canReview("pending")).toBe(true);
    expect(canReview("none")).toBe(false);
    expect(canReview("approved")).toBe(false);
  });
  it("paid only after approval and only once", () => {
    expect(canMarkPaid("approved", "pending")).toBe(true);
    expect(canMarkPaid("pending", "pending")).toBe(false);
    expect(canMarkPaid("none", "pending")).toBe(false);
    expect(canMarkPaid("approved", "paid")).toBe(false);
  });
  it("labels", () => {
    expect(statusLabel("approved", "paid")).toBe("Paid");
    expect(statusLabel("none", "pending")).toBe("Upload your proof");
  });
});
