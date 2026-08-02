import { describe, expect, it } from "vitest";
import { applicationSchema } from "@/lib/validation/application";

const valid = {
  fullName: "Ramesh Iyer",
  mobile: "9876543210",
  whatsapp: "",
  email: "ramesh@example.com",
  dateOfBirth: "1990-04-12",
  currentAddress: "12 Gandhipuram Main Road",
  city: "Coimbatore",
  state: "Tamil Nadu",
  pinCode: "641012",
  currentOccupation: "Runs a cloud kitchen",
  businessExperience: "",
  companyName: "",
  gstNumber: "",
  preferredCity: "Coimbatore",
  preferredTerritory: "",
  investmentBudget: "₹3–5 lakh",
  franchiseModel: "",
  expectedStartDate: "",
  sourceOfInvestment: "Personal savings",
  availableInvestmentAmount: "₹4,00,000",
  bankName: "",
  informationTrue: true,
  consentToVerification: true,
  termsAccepted: true,
};

function errorFor(
  result: {
    success: boolean;
    error?: { issues: readonly { path: readonly PropertyKey[]; message: string }[] };
  },
  field: string,
) {
  return result.error?.issues.find((issue) => issue.path.join(".") === field)
    ?.message;
}

describe("public application form", () => {
  it("accepts a complete application", () => {
    expect(applicationSchema.safeParse(valid).success).toBe(true);
  });

  it("requires all three declarations", () => {
    for (const field of [
      "informationTrue",
      "consentToVerification",
      "termsAccepted",
    ] as const) {
      const result = applicationSchema.safeParse({ ...valid, [field]: false });
      expect(result.success, field).toBe(false);
      expect(errorFor(result, field), field).toBeTruthy();
    }
  });

  it("rejects an applicant under 18", () => {
    const sixteen = new Date();
    sixteen.setFullYear(sixteen.getFullYear() - 16);
    const result = applicationSchema.safeParse({
      ...valid,
      dateOfBirth: sixteen.toISOString().slice(0, 10),
    });
    expect(result.success).toBe(false);
    expect(errorFor(result, "dateOfBirth")).toMatch(/at least 18/i);
  });

  it("rejects an implausible date of birth", () => {
    expect(
      applicationSchema.safeParse({ ...valid, dateOfBirth: "1820-01-01" }).success,
    ).toBe(false);
    expect(
      applicationSchema.safeParse({ ...valid, dateOfBirth: "not a date" }).success,
    ).toBe(false);
  });

  it("validates the PIN code", () => {
    expect(applicationSchema.safeParse({ ...valid, pinCode: "641012" }).success).toBe(true);
    // Indian PIN codes never start with 0.
    expect(applicationSchema.safeParse({ ...valid, pinCode: "041012" }).success).toBe(false);
    expect(applicationSchema.safeParse({ ...valid, pinCode: "6410" }).success).toBe(false);
    expect(applicationSchema.safeParse({ ...valid, pinCode: "64101a" }).success).toBe(false);
  });

  it("treats a blank GST number as absent but validates a supplied one", () => {
    expect(applicationSchema.safeParse({ ...valid, gstNumber: "" }).success).toBe(true);
    expect(
      applicationSchema.safeParse({ ...valid, gstNumber: "33AAAAA0000A1Z5" }).success,
    ).toBe(true);
    expect(
      applicationSchema.safeParse({ ...valid, gstNumber: "not-a-gstin" }).success,
    ).toBe(false);
  });

  it("accepts a lowercase GSTIN, since it is uppercased on save", () => {
    expect(
      applicationSchema.safeParse({ ...valid, gstNumber: "33aaaaa0000a1z5" }).success,
    ).toBe(true);
  });

  it("treats a blank WhatsApp number as absent", () => {
    expect(applicationSchema.safeParse({ ...valid, whatsapp: "" }).success).toBe(true);
    expect(applicationSchema.safeParse({ ...valid, whatsapp: "123" }).success).toBe(false);
  });

  it("requires the fields the spec marks mandatory", () => {
    for (const field of [
      "fullName",
      "currentAddress",
      "city",
      "state",
      "currentOccupation",
      "preferredCity",
      "investmentBudget",
      "sourceOfInvestment",
      "availableInvestmentAmount",
    ] as const) {
      expect(
        applicationSchema.safeParse({ ...valid, [field]: "" }).success,
        field,
      ).toBe(false);
    }
  });
});
