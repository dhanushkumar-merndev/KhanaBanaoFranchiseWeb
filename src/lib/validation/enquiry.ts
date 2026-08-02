import { z } from "zod";
import { isValidIndianMobile } from "@/lib/domain/normalize";

const phoneField = z
  .string()
  .trim()
  .min(1, "Phone number is required")
  .refine(isValidIndianMobile, "Enter a valid 10-digit Indian mobile number");

const optionalPhoneField = z
  .string()
  .trim()
  .optional()
  .refine(
    (value) => !value || isValidIndianMobile(value),
    "Enter a valid 10-digit Indian mobile number",
  );

export const INVESTMENT_RANGES = [
  "Under ₹3 lakh",
  "₹3 – ₹5 lakh",
  "₹5 – ₹10 lakh",
  "Above ₹10 lakh",
  "Not decided yet",
] as const;

export const enquirySchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, "Please enter your full name")
    .max(120, "That name is too long"),
  phone: phoneField,
  whatsapp: optionalPhoneField,
  email: z
    .string()
    .trim()
    .min(1, "Email is required")
    .max(200)
    .regex(/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/, "Enter a valid email address"),
  city: z
    .string()
    .trim()
    .min(2, "Please enter your city")
    .max(80, "That city name is too long"),
  preferredTerritory: z.string().trim().max(120).optional(),
  investmentRange: z.string().trim().max(60).optional(),
  currentOccupation: z.string().trim().max(120).optional(),
  existingBusiness: z.string().trim().max(160).optional(),
  message: z.string().trim().max(1200, "Please keep this under 1200 characters").optional(),
  consent: z.literal(true, {
    message: "Please agree to be contacted so we can respond to your enquiry",
  }),
  // Server-checked honeypot. It deliberately accepts text in validation so a
  // password manager cannot make the visible form fail silently.
  companyWebsiteConfirm: z.string().trim().max(200).optional(),
});

export type EnquiryInput = z.input<typeof enquirySchema>;
export type EnquiryValues = z.output<typeof enquirySchema>;

export type EnquiryResult =
  | { ok: true; leadNumber: string; emailSent: boolean }
  | { ok: false; message: string; fieldErrors?: Record<string, string> };
