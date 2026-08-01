import { describe, expect, it } from "vitest";
import { MAX_ACTIVE_MEMBERS } from "@/lib/domain/enums";
import { inviteMemberSchema } from "@/lib/validation/member";
import {
  businessDiscussionSchema,
  createLeadSchema,
  rejectLeadSchema,
} from "@/lib/validation/lead";

/** First error message for a field, or undefined when the field passed. */
function errorFor(
  result: { success: boolean; error?: { issues: readonly { path: readonly PropertyKey[]; message: string }[] } },
  field: string,
) {
  return result.error?.issues.find((issue) => issue.path.join(".") === field)
    ?.message;
}

describe("member limit", () => {
  it("is the twenty the spec fixes", () => {
    expect(MAX_ACTIVE_MEMBERS).toBe(20);
  });
});

describe("member invitation form", () => {
  const valid = {
    fullName: "Priya Menon",
    email: "priya@example.com",
    phone: "9876543210",
  };

  it("accepts a complete invitation", () => {
    expect(inviteMemberSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects a malformed email", () => {
    const result = inviteMemberSchema.safeParse({ ...valid, email: "priya@" });
    expect(result.success).toBe(false);
    expect(errorFor(result, "email")).toMatch(/valid email/i);
  });

  it("rejects a phone number that is not an Indian mobile", () => {
    const result = inviteMemberSchema.safeParse({ ...valid, phone: "12345" });
    expect(result.success).toBe(false);
    expect(errorFor(result, "phone")).toMatch(/10-digit/i);
  });

  it("rejects a one-character name", () => {
    expect(inviteMemberSchema.safeParse({ ...valid, fullName: "P" }).success).toBe(
      false,
    );
  });
});

describe("manual lead creation", () => {
  const valid = {
    fullName: "Ramesh Iyer",
    phone: "9876543210",
    whatsapp: "",
    email: "ramesh@example.com",
    city: "Coimbatore",
    source: "PHONE" as const,
    preferredTerritory: "",
    investmentRange: "",
    currentOccupation: "",
    message: "",
    assignedMemberId: "",
  };

  it("accepts a lead with only the required fields", () => {
    expect(createLeadSchema.safeParse(valid).success).toBe(true);
  });

  it("treats an empty WhatsApp number as absent, not invalid", () => {
    expect(createLeadSchema.safeParse({ ...valid, whatsapp: "" }).success).toBe(
      true,
    );
  });

  it("still validates a WhatsApp number that was supplied", () => {
    const result = createLeadSchema.safeParse({ ...valid, whatsapp: "123" });
    expect(result.success).toBe(false);
    expect(errorFor(result, "whatsapp")).toMatch(/10-digit/i);
  });

  it("rejects an unknown lead source", () => {
    expect(
      createLeadSchema.safeParse({ ...valid, source: "CARRIER_PIGEON" }).success,
    ).toBe(false);
  });

  it("treats an empty assignee as round-robin rather than an error", () => {
    expect(
      createLeadSchema.safeParse({ ...valid, assignedMemberId: "" }).success,
    ).toBe(true);
  });
});

describe("business discussion", () => {
  const base = {
    channel: "PHONE" as const,
    discussionDate: "2026-08-01T10:00:00.000Z",
    summary: "Talked through the model and the territory in detail.",
    businessModelDiscussed: "",
    investmentDiscussed: "",
    territoryDiscussed: "",
    interestLevel: "" as const,
    outcome: "ACCEPTED" as const,
    nextFollowupAt: "",
    rejectionReason: "",
    notes: "",
  };

  it("accepts an acceptance with no follow-up date", () => {
    expect(businessDiscussionSchema.safeParse(base).success).toBe(true);
  });

  it("requires a rejection reason when the outcome is rejection", () => {
    const result = businessDiscussionSchema.safeParse({
      ...base,
      outcome: "REJECTED",
      rejectionReason: "",
    });
    expect(result.success).toBe(false);
    expect(errorFor(result, "rejectionReason")).toMatch(/required/i);
  });

  it("accepts a rejection that states its reason", () => {
    expect(
      businessDiscussionSchema.safeParse({
        ...base,
        outcome: "REJECTED",
        rejectionReason: "Investment capacity well below the requirement.",
      }).success,
    ).toBe(true);
  });

  it("requires a date when a follow-up is the outcome", () => {
    const result = businessDiscussionSchema.safeParse({
      ...base,
      outcome: "FOLLOW_UP_REQUIRED",
      nextFollowupAt: "",
    });
    expect(result.success).toBe(false);
    expect(errorFor(result, "nextFollowupAt")).toMatch(/follow-up date/i);
  });

  it("rejects an unparseable follow-up date", () => {
    const result = businessDiscussionSchema.safeParse({
      ...base,
      outcome: "FOLLOW_UP_REQUIRED",
      nextFollowupAt: "next tuesday-ish",
    });
    expect(result.success).toBe(false);
    expect(errorFor(result, "nextFollowupAt")).toMatch(/valid date/i);
  });

  it("rejects a one-word summary", () => {
    expect(
      businessDiscussionSchema.safeParse({ ...base, summary: "ok" }).success,
    ).toBe(false);
  });
});

describe("lead rejection", () => {
  it("insists on a reason of substance", () => {
    expect(rejectLeadSchema.safeParse({ reason: "" }).success).toBe(false);
    expect(rejectLeadSchema.safeParse({ reason: "no" }).success).toBe(false);
    expect(
      rejectLeadSchema.safeParse({ reason: "Territory already allocated." })
        .success,
    ).toBe(true);
  });
});
