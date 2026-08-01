import { describe, expect, it } from "vitest";
import { LEAD_STATUSES, type LeadStatus } from "@/lib/domain/enums";
import {
  allowedNextStatuses,
  assertTransition,
  canApproveFranchise,
  canTransition,
  isTerminal,
} from "@/lib/domain/transitions";

describe("lead status transitions", () => {
  it("walks the happy path from enquiry to ongoing support", () => {
    const path: LeadStatus[] = [
      "NEW",
      "ASSIGNED",
      "CONTACTED",
      "BUSINESS_DISCUSSION",
      "ACCEPTED",
      "APPLICATION_LINK_SENT",
      "APPLICATION_SUBMITTED",
      "APPLICATION_UNDER_REVIEW",
      "DOCUMENTS_PENDING",
      "DOCUMENTS_UNDER_REVIEW",
      "DOCUMENTS_APPROVED",
      "FRANCHISE_APPROVED",
      "AGREEMENT_PENDING",
      "AGREEMENT_SENT",
      "AGREEMENT_COMPLETED",
      "PAYMENT_PENDING",
      "PAYMENT_PROOF_SUBMITTED",
      "PAYMENT_APPROVED",
      "READY_FOR_ACTIVATION",
      "ACTIVE",
      "TRAINING_PENDING",
      "TRAINING_SCHEDULED",
      "TRAINING_COMPLETED",
      "SETUP_PENDING",
      "SETUP_IN_PROGRESS",
      "SETUP_COMPLETED",
      "READY_TO_GO_LIVE",
      "LIVE",
      "ONGOING_SUPPORT",
    ];

    for (let i = 0; i < path.length - 1; i++) {
      expect(
        canTransition(path[i], path[i + 1]),
        `${path[i]} -> ${path[i + 1]}`,
      ).toBe(true);
    }
  });

  it("refuses to skip an approval gate", () => {
    expect(canTransition("NEW", "ACCEPTED")).toBe(false);
    expect(canTransition("APPLICATION_SUBMITTED", "DOCUMENTS_APPROVED")).toBe(false);
    expect(canTransition("DOCUMENTS_PENDING", "FRANCHISE_APPROVED")).toBe(false);
    expect(canTransition("PAYMENT_PENDING", "PAYMENT_APPROVED")).toBe(false);
    expect(canTransition("AGREEMENT_PENDING", "LIVE")).toBe(false);
  });

  it("cannot reopen a rejected lead", () => {
    expect(allowedNextStatuses("REJECTED")).toEqual([]);
    expect(isTerminal("REJECTED")).toBe(true);
    for (const status of LEAD_STATUSES) {
      if (status === "REJECTED") continue;
      expect(canTransition("REJECTED", status)).toBe(false);
    }
  });

  it("treats ongoing support as the end of the line", () => {
    expect(isTerminal("ONGOING_SUPPORT")).toBe(true);
  });

  it("allows rejection only before the franchise is approved", () => {
    expect(canTransition("CONTACTED", "REJECTED")).toBe(true);
    expect(canTransition("DOCUMENTS_APPROVED", "REJECTED")).toBe(true);
    expect(canTransition("FRANCHISE_APPROVED", "REJECTED")).toBe(false);
    expect(canTransition("PAYMENT_APPROVED", "REJECTED")).toBe(false);
    expect(canTransition("LIVE", "REJECTED")).toBe(false);
  });

  it("lets a rejected payment be corrected and resubmitted", () => {
    expect(canTransition("PAYMENT_PROOF_SUBMITTED", "PAYMENT_REJECTED")).toBe(true);
    expect(canTransition("PAYMENT_REJECTED", "PAYMENT_PROOF_SUBMITTED")).toBe(true);
  });

  it("lets a document correction round-trip back to approval", () => {
    expect(
      canTransition("DOCUMENTS_UNDER_REVIEW", "DOCUMENT_CORRECTION_REQUIRED"),
    ).toBe(true);
    expect(
      canTransition("DOCUMENT_CORRECTION_REQUIRED", "DOCUMENTS_UNDER_REVIEW"),
    ).toBe(true);
  });

  it("treats a no-op move as allowed", () => {
    expect(canTransition("CONTACTED", "CONTACTED")).toBe(true);
  });

  it("throws with both statuses named when the move is illegal", () => {
    expect(() => assertTransition("NEW", "LIVE")).toThrowError(/NEW.*LIVE/);
    expect(() => assertTransition("NEW", "CONTACTED")).not.toThrow();
  });
});

describe("franchise approval gate", () => {
  it("needs the application, a discussion and every document", () => {
    expect(
      canApproveFranchise({
        applicationSubmitted: true,
        businessDiscussionRecorded: true,
        allDocumentsApproved: true,
      }),
    ).toBe(true);
  });

  it("blocks approval when any prerequisite is missing", () => {
    const complete = {
      applicationSubmitted: true,
      businessDiscussionRecorded: true,
      allDocumentsApproved: true,
    };
    expect(canApproveFranchise({ ...complete, applicationSubmitted: false })).toBe(false);
    expect(canApproveFranchise({ ...complete, businessDiscussionRecorded: false })).toBe(false);
    expect(canApproveFranchise({ ...complete, allDocumentsApproved: false })).toBe(false);
  });
});
