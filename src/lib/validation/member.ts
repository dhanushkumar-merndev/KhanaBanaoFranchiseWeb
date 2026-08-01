import { z } from "zod";
import { isValidIndianMobile } from "@/lib/domain/normalize";

export const inviteMemberSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, "Enter the member's full name")
    .max(120, "That name is too long"),
  email: z
    .string()
    .trim()
    .min(1, "A Google email address is required")
    .max(200)
    .regex(/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/, "Enter a valid email address"),
  phone: z
    .string()
    .trim()
    .min(1, "Phone number is required")
    .refine(isValidIndianMobile, "Enter a valid 10-digit Indian mobile number"),
});

export type InviteMemberInput = z.input<typeof inviteMemberSchema>;

export type ActionResult<T = undefined> =
  | ({ ok: true } & (T extends undefined ? { data?: never } : { data: T }))
  | { ok: false; message: string; fieldErrors?: Record<string, string> };
