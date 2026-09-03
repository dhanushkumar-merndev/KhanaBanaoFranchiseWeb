import { beforeAll, describe, expect, it } from "vitest";

// The token module reads its secrets lazily, so they only need to exist by the
// time a token is created — set them before importing.
beforeAll(() => {
  process.env.APPLICATION_TOKEN_SECRET = "a".repeat(64);
  process.env.DOCUMENT_TOKEN_SECRET = "b".repeat(64);
});

const { createToken, hashToken, verifyToken } = await import("@/lib/tokens");

describe("secure applicant links", () => {
  it("accepts a token it just issued", () => {
    const token = createToken("APPLICATION");
    expect(verifyToken(token, "APPLICATION")).toBe(true);
  });

  it("issues a different token every time", () => {
    const a = createToken("APPLICATION");
    const b = createToken("APPLICATION");
    expect(a).not.toBe(b);
  });

  it("rejects a token signed for the other purpose", () => {
    // An application link must not open the document upload page.
    const applicationToken = createToken("APPLICATION");
    expect(verifyToken(applicationToken, "DOCUMENTS")).toBe(false);

    const documentToken = createToken("DOCUMENTS");
    expect(verifyToken(documentToken, "APPLICATION")).toBe(false);
  });

  it("rejects a tampered payload", () => {
    const token = createToken("APPLICATION");
    const [value, signature] = token.split(".");
    expect(verifyToken(`${value}x.${signature}`, "APPLICATION")).toBe(false);
  });

  it("rejects a tampered signature", () => {
    const token = createToken("APPLICATION");
    const [value, signature] = token.split(".");
    expect(verifyToken(`${value}.${signature}x`, "APPLICATION")).toBe(false);
  });

  it("rejects malformed input without throwing", () => {
    for (const bad of ["", ".", "nodot", ".onlysig", "a.b.c.d"]) {
      expect(() => verifyToken(bad, "APPLICATION")).not.toThrow();
      expect(verifyToken(bad, "APPLICATION")).toBe(false);
    }
  });

  it("hashes deterministically, and never stores the token itself", () => {
    const token = createToken("DOCUMENTS");
    const hash = hashToken(token);
    expect(hash).toBe(hashToken(token));
    expect(hash).toHaveLength(64);
    expect(hash).not.toContain(token);
  });

  it("hashes two different tokens differently", () => {
    expect(hashToken(createToken("APPLICATION"))).not.toBe(
      hashToken(createToken("APPLICATION")),
    );
  });
});
