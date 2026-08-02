import { z } from "zod";
import { isValidIndianMobile } from "@/lib/domain/normalize";

const text = (min: number, max: number, message: string) =>
  z.string().trim().min(min, message).max(max, `Keep this under ${max} characters`);

const optional = (max: number) =>
  z.string().trim().max(max, `Keep this under ${max} characters`).optional().or(z.literal(""));

const mobile = z
  .string()
  .trim()
  .min(1, "Required")
  .refine(isValidIndianMobile, "Enter a valid 10-digit Indian mobile number");

const dateString = z
  .string()
  .trim()
  .min(1, "Required")
  .refine((value) => !Number.isNaN(new Date(value).getTime()), "Pick a valid date");

/**
 * The public application form (spec §13). Every section is validated in one
 * schema so a partially-valid submission can never reach the database — the
 * applicant gets one link and one shot at it.
 */
export const applicationSchema = z.object({
  // Personal
  fullName: text(2, 120, "Your full name is required"),
  mobile,
  whatsapp: z
    .string()
    .trim()
    .refine(
      (value) => value === "" || isValidIndianMobile(value),
      "Enter a valid 10-digit Indian mobile number",
    )
    .optional()
    .or(z.literal("")),
  email: z
    .string()
    .trim()
    .min(1, "Email is required")
    .max(200)
    .regex(/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/, "Enter a valid email address"),
  dateOfBirth: dateString.refine((value) => {
    const age =
      (Date.now() - new Date(value).getTime()) / (365.25 * 24 * 60 * 60 * 1000);
    return age >= 18 && age <= 100;
  }, "You must be at least 18"),

  // Address
  currentAddress: text(10, 500, "Your current address is required"),
  city: text(2, 120, "City is required"),
  state: text(2, 120, "State is required"),
  pinCode: z
    .string()
    .trim()
    .regex(/^[1-9]\d{5}$/, "Enter a valid 6-digit PIN code"),

  // Business
  currentOccupation: text(2, 160, "Your current occupation is required"),
  businessExperience: optional(1000),
  companyName: optional(160),
  gstNumber: z
    .string()
    .trim()
    .refine(
      (value) =>
        value === "" ||
        /^\d{2}[A-Z]{5}\d{4}[A-Z][A-Z\d]Z[A-Z\d]$/.test(value.toUpperCase()),
      "Enter a valid 15-character GSTIN",
    )
    .optional()
    .or(z.literal("")),

  // Franchise
  preferredCity: text(2, 120, "Preferred city is required"),
  preferredTerritory: optional(160),
  investmentBudget: text(1, 120, "Investment budget is required"),
  franchiseModel: optional(160),
  expectedStartDate: optional(40),

  // Financial
  sourceOfInvestment: text(2, 200, "Source of investment is required"),
  availableInvestmentAmount: text(1, 120, "Available amount is required"),
  bankName: optional(160),

  // Declaration — all three must be ticked (spec §13).
  // `boolean().refine(...)` rather than `literal(true)` so the *input* type
  // stays `boolean` and the form can start with the boxes unticked.
  informationTrue: z
    .boolean()
    .refine((v) => v, "Please confirm the information is true"),
  consentToVerification: z
    .boolean()
    .refine((v) => v, "Verification consent is required"),
  termsAccepted: z.boolean().refine((v) => v, "You must accept the terms"),
});

export type ApplicationInput = z.input<typeof applicationSchema>;

/** JSONB column shapes, so the reader and the writer agree. */
export type PersonalDetails = {
  full_name: string;
  mobile: string;
  whatsapp: string | null;
  email: string;
  date_of_birth: string;
};

export type AddressDetails = {
  current_address: string;
  city: string;
  state: string;
  pin_code: string;
};

export type BusinessDetails = {
  current_occupation: string;
  business_experience: string | null;
  company_name: string | null;
  gst_number: string | null;
};

export type FranchiseDetails = {
  preferred_city: string;
  preferred_territory: string | null;
  investment_budget: string;
  franchise_model: string | null;
  expected_start_date: string | null;
};

export type FinancialDetails = {
  source_of_investment: string;
  available_investment_amount: string;
  bank_name: string | null;
};

export type Declaration = {
  information_true: boolean;
  consent_to_verification: boolean;
  terms_accepted: boolean;
  accepted_at: string;
};
