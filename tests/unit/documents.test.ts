import { describe, expect, it } from "vitest";
import {
  canApplyDocumentRollup,
  canApplicantUpload,
  isDocumentLocked,
  overallDocumentStatus,
} from "@/lib/domain/documents";
import type { DocumentStatus } from "@/lib/domain/enums";

describe("overall document status", () => {
  it("is pending when nothing has been requested", () => {
    expect(overallDocumentStatus([])).toBe("DOCUMENTS_PENDING");
  });

  it("is pending when everything is still only requested", () => {
    expect(overallDocumentStatus(["REQUESTED", "REQUESTED"])).toBe(
      "DOCUMENTS_PENDING",
    );
  });

  it("is partially submitted when some have arrived", () => {
    expect(overallDocumentStatus(["UPLOADED", "REQUESTED"])).toBe(
      "DOCUMENTS_PARTIALLY_SUBMITTED",
    );
    expect(overallDocumentStatus(["APPROVED", "REQUESTED"])).toBe(
      "DOCUMENTS_PARTIALLY_SUBMITTED",
    );
  });

  it("is under review once every document has arrived", () => {
    expect(overallDocumentStatus(["UPLOADED", "UNDER_REVIEW"])).toBe(
      "DOCUMENTS_UNDER_REVIEW",
    );
    expect(overallDocumentStatus(["APPROVED", "UPLOADED"])).toBe(
      "DOCUMENTS_UNDER_REVIEW",
    );
  });

  it("is approved only when every document is approved", () => {
    expect(overallDocumentStatus(["APPROVED", "APPROVED"])).toBe(
      "DOCUMENTS_APPROVED",
    );
  });

  it("lets a single re-upload request outrank everything else", () => {
    // Even with the rest approved, one correction holds the whole set back.
    expect(
      overallDocumentStatus(["APPROVED", "APPROVED", "REUPLOAD_REQUIRED"]),
    ).toBe("DOCUMENT_CORRECTION_REQUIRED");
    expect(overallDocumentStatus(["REUPLOAD_REQUIRED", "REQUESTED"])).toBe(
      "DOCUMENT_CORRECTION_REQUIRED",
    );
  });
});

describe("document lead-status synchronization", () => {
  it("reconciles application review directly to the calculated document stage", () => {
    expect(
      canApplyDocumentRollup("APPLICATION_UNDER_REVIEW", "DOCUMENTS_APPROVED"),
    ).toBe(true);
  });

  it("does not bypass application review or later franchise gates", () => {
    expect(
      canApplyDocumentRollup("APPLICATION_SUBMITTED", "DOCUMENTS_APPROVED"),
    ).toBe(false);
    expect(
      canApplyDocumentRollup("FRANCHISE_APPROVED", "DOCUMENTS_PENDING"),
    ).toBe(false);
  });
});

describe("document locking", () => {
  it("locks approved documents against replacement", () => {
    expect(isDocumentLocked("APPROVED")).toBe(true);
    for (const status of [
      "REQUESTED",
      "UPLOADED",
      "UNDER_REVIEW",
      "REUPLOAD_REQUIRED",
    ] as DocumentStatus[]) {
      expect(isDocumentLocked(status)).toBe(false);
    }
  });

  it("only lets the applicant upload where one is genuinely wanted", () => {
    expect(canApplicantUpload("REQUESTED")).toBe(true);
    expect(canApplicantUpload("REUPLOAD_REQUIRED")).toBe(true);
    expect(canApplicantUpload("UPLOADED")).toBe(false);
    expect(canApplicantUpload("UNDER_REVIEW")).toBe(false);
    expect(canApplicantUpload("APPROVED")).toBe(false);
  });
});
