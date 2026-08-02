import { beforeAll, describe, expect, it, vi } from "vitest";

beforeAll(() => {
  vi.stubEnv("DOCUMENT_TOKEN_SECRET", "test-document-secret-at-least-32-bytes");
});

describe("document email OTP", () => {
  it("masks the applicant email before rendering it publicly", async () => {
    const { maskEmail } = await import("@/lib/document-otp");
    expect(maskEmail("deepika@example.com")).toBe("d*****a@example.com");
    expect(maskEmail("a@example.com")).toBe("a***@example.com");
  });

  it("binds an OTP hash to both its code and document token", async () => {
    const { hashDocumentOtp, matchesDocumentOtp } = await import(
      "@/lib/document-otp"
    );
    const hash = hashDocumentOtp("token-a", "123456");

    expect(matchesDocumentOtp("token-a", "123456", hash)).toBe(true);
    expect(matchesDocumentOtp("token-a", "654321", hash)).toBe(false);
    expect(matchesDocumentOtp("token-b", "123456", hash)).toBe(false);
  });

  it("always creates a six-digit code", async () => {
    const { createDocumentOtp } = await import("@/lib/document-otp");
    for (let index = 0; index < 20; index += 1) {
      expect(createDocumentOtp()).toMatch(/^\d{6}$/);
    }
  });

  it("restores an active challenge after the upload page is refreshed", async () => {
    const { documentOtpGateState } = await import("@/lib/document-otp");
    const now = Date.parse("2026-08-02T10:00:00.000Z");
    expect(
      documentOtpGateState(
        {
          document_otp_hash: "hash",
          document_otp_expires_at: "2026-08-02T10:10:00.000Z",
          document_otp_attempts: 1,
          document_otp_sent_at: "2026-08-02T09:59:30.000Z",
        },
        now,
      ),
    ).toEqual({ initialCodeSent: true, initialCooldown: 30 });
  });
});
