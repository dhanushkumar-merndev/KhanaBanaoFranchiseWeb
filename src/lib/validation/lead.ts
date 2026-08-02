import { z } from "zod";
import {
  CONTACT_CHANNELS,
  DISCUSSION_OUTCOMES,
  INTEREST_LEVELS,
  LEAD_SOURCES,
} from "@/lib/domain/enums";
import { isValidIndianMobile } from "@/lib/domain/normalize";

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Keep this under ${max} characters`)
    .optional()
    .or(z.literal(""));

/** `datetime-local` and `date` inputs both arrive as strings. */
const dateTimeString = z
  .string()
  .trim()
  .refine((value) => !Number.isNaN(new Date(value).getTime()), "Pick a valid date");

export const createLeadSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, "Enter the applicant's full name")
    .max(120, "That name is too long"),
  phone: z
    .string()
    .trim()
    .min(1, "Phone number is required")
    .refine(isValidIndianMobile, "Enter a valid 10-digit Indian mobile number"),
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
  city: z.string().trim().min(2, "City is required").max(120),
  source: z.enum(LEAD_SOURCES),
  preferredTerritory: optionalText(160),
  investmentRange: optionalText(120),
  currentOccupation: optionalText(160),
  message: optionalText(2000),
  /** Empty means "let round-robin decide". */
  assignedMemberId: z.string().uuid().optional().or(z.literal("")),
});

export type CreateLeadInput = z.input<typeof createLeadSchema>;

export const businessDiscussionSchema = z
  .object({
    channel: z.enum(CONTACT_CHANNELS),
    discussionDate: dateTimeString,
    summary: z
      .string()
      .trim()
      .min(10, "Write at least a sentence about the discussion")
      .max(4000),
    businessModelDiscussed: optionalText(500),
    investmentDiscussed: optionalText(160),
    territoryDiscussed: optionalText(160),
    interestLevel: z.enum(INTEREST_LEVELS).optional().or(z.literal("")),
    outcome: z.enum(DISCUSSION_OUTCOMES),
    nextFollowupAt: z.string().trim().optional().or(z.literal("")),
    rejectionReason: optionalText(1000),
    notes: optionalText(2000),
  })
  .superRefine((value, ctx) => {
    // A rejection with no stated reason is unusable later, so the spec makes
    // the reason mandatory (§12).
    if (value.outcome === "REJECTED" && !value.rejectionReason?.trim()) {
      ctx.addIssue({
        code: "custom",
        path: ["rejectionReason"],
        message: "A rejection reason is required",
      });
    }
    if (value.outcome === "FOLLOW_UP_REQUIRED") {
      if (!value.nextFollowupAt?.trim()) {
        ctx.addIssue({
          code: "custom",
          path: ["nextFollowupAt"],
          message: "Set the next follow-up date",
        });
      } else if (Number.isNaN(new Date(value.nextFollowupAt).getTime())) {
        ctx.addIssue({
          code: "custom",
          path: ["nextFollowupAt"],
          message: "Pick a valid date",
        });
      }
    }
  });

export type BusinessDiscussionInput = z.input<typeof businessDiscussionSchema>;

export const followupSchema = z.object({
  dueAt: dateTimeString,
  channel: z.enum(CONTACT_CHANNELS).optional().or(z.literal("")),
  note: optionalText(1000),
});

export type FollowupInput = z.input<typeof followupSchema>;

export const rescheduleFollowupSchema = z.object({
  followupId: z.string().uuid(),
  dueAt: dateTimeString,
  note: optionalText(1000),
});

export type RescheduleFollowupInput = z.input<typeof rescheduleFollowupSchema>;

export const rejectLeadSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(5, "Say why this lead was rejected")
    .max(1000, "Keep the reason under 1000 characters"),
});

export type RejectLeadInput = z.input<typeof rejectLeadSchema>;

export const reassignLeadSchema = z.object({
  memberId: z.string().uuid("Choose a member"),
  note: optionalText(500),
});

export type ReassignLeadInput = z.input<typeof reassignLeadSchema>;

export const logContactSchema = z.object({
  channel: z.enum(CONTACT_CHANNELS),
  notes: z
    .string()
    .trim()
    .min(3, "Add a short note about the contact")
    .max(2000),
});

export type LogContactInput = z.input<typeof logContactSchema>;
