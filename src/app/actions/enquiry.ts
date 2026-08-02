"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { isSupabaseConfigured } from "@/lib/env";
import { normalizeEmail, normalizePhone, normalizeText } from "@/lib/domain/normalize";
import { sendTemplateEmail } from "@/lib/email/send";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  enquirySchema,
  type EnquiryInput,
  type EnquiryResult,
} from "@/lib/validation/enquiry";

/**
 * Best-effort burst protection. In-memory only, so it resets on cold start and
 * is per-instance — enough to stop a naive script, and the spec rules out
 * Redis. Real abuse protection belongs at the edge/WAF.
 */
const recentSubmissions = new Map<string, number[]>();
const WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_WINDOW = 5;

function isRateLimited(key: string): boolean {
  const now = Date.now();
  const hits = (recentSubmissions.get(key) ?? []).filter(
    (at) => now - at < WINDOW_MS,
  );
  hits.push(now);
  recentSubmissions.set(key, hits);

  if (recentSubmissions.size > 5000) recentSubmissions.clear();
  return hits.length > MAX_PER_WINDOW;
}

export async function submitEnquiry(
  input: EnquiryInput,
): Promise<EnquiryResult> {
  const parsed = enquirySchema.safeParse(input);

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const path = issue.path.join(".");
      if (path && !fieldErrors[path]) fieldErrors[path] = issue.message;
    }
    return {
      ok: false,
      message: "Please check the highlighted fields and try again.",
      fieldErrors,
    };
  }

  const values = parsed.data;

  // Honeypot: silently accept so a bot does not learn it was caught.
  if (values.companyWebsiteConfirm) {
    return { ok: true, leadNumber: "KB-L00000", emailSent: false };
  }

  const headerList = await headers();
  const ip =
    headerList.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    headerList.get("x-real-ip") ??
    "unknown";

  if (isRateLimited(ip)) {
    return {
      ok: false,
      message:
        "We have already received a few enquiries from you. Please call us instead — we would love to talk.",
    };
  }

  if (!isSupabaseConfigured) {
    return {
      ok: false,
      message:
        "The enquiry service is not configured yet. Please call or WhatsApp us and we will help you right away.",
    };
  }

  const phone = normalizePhone(values.phone);
  const email = normalizeEmail(values.email);

  try {
    const supabase = createAdminClient();

    // Returning visitor: keep one lead rather than creating duplicates.
    const { data: existing } = await supabase
      .from("leads")
      .select("id, lead_number")
      .or(`phone.eq.${phone},email.eq.${email}`)
      .limit(1)
      .maybeSingle();

    if (existing) {
      await supabase
        .from("leads")
        .update({
          full_name: normalizeText(values.fullName),
          city: normalizeText(values.city),
          consent_given: true,
          ...(values.whatsapp
            ? { whatsapp: normalizePhone(values.whatsapp) }
            : {}),
          ...(values.preferredTerritory
            ? { preferred_territory: normalizeText(values.preferredTerritory) }
            : {}),
          ...(values.investmentRange
            ? { investment_range: values.investmentRange }
            : {}),
          ...(values.currentOccupation
            ? { current_occupation: normalizeText(values.currentOccupation) }
            : {}),
          ...(values.existingBusiness
            ? { existing_business: normalizeText(values.existingBusiness) }
            : {}),
          ...(values.message ? { message: values.message } : {}),
        })
        .eq("id", existing.id);

      await supabase.from("lead_activities").insert({
        lead_id: existing.id,
        member_id: null,
        activity_type: "REPEAT_ENQUIRY",
        channel: "EMAIL",
        notes: values.message
          ? `Repeat website enquiry: ${values.message}`
          : "Repeat website enquiry received.",
      });

      const emailResult = await sendTemplateEmail({
        templateKey: "ENQUIRY_RECEIVED",
        to: { email, name: normalizeText(values.fullName) },
        vars: {
          applicant_name: normalizeText(values.fullName),
          lead_number: existing.lead_number,
        },
        leadId: existing.id,
      });

      revalidatePath("/admin");
      revalidatePath("/admin/leads");
      revalidatePath("/member");
      revalidatePath("/member/leads");

      return {
        ok: true,
        leadNumber: existing.lead_number,
        emailSent: emailResult.status === "SENT",
      };
    }

    const { data: lead, error } = await supabase
      .from("leads")
      .insert({
        full_name: normalizeText(values.fullName),
        phone,
        whatsapp: values.whatsapp ? normalizePhone(values.whatsapp) : null,
        email,
        city: normalizeText(values.city),
        source: "WEBSITE",
        preferred_territory: values.preferredTerritory
          ? normalizeText(values.preferredTerritory)
          : null,
        investment_range: values.investmentRange ?? null,
        current_occupation: values.currentOccupation
          ? normalizeText(values.currentOccupation)
          : null,
        existing_business: values.existingBusiness
          ? normalizeText(values.existingBusiness)
          : null,
        message: values.message ?? null,
        current_status: "NEW",
        consent_given: true,
        assigned_member_id: null,
        business_model_discussed: null,
        interest_level: null,
        rejection_reason: null,
        next_followup_at: null,
        created_by: null,
      })
      .select("id, lead_number, full_name, email")
      .single();

    if (error || !lead) {
      throw new Error(error?.message ?? "Could not save the enquiry");
    }

    // Round-robin runs in the database so simultaneous enquiries cannot both
    // claim the same rotation slot.
    await supabase.rpc("assign_lead_round_robin", { target_lead: lead.id });

    await supabase.from("lead_activities").insert({
      lead_id: lead.id,
      member_id: null,
      activity_type: "ENQUIRY_RECEIVED",
      channel: "EMAIL",
      notes: "Franchise enquiry submitted through the website.",
      new_status: "NEW",
    });

    // Fire-and-log: a mail failure must not fail the enquiry.
    const emailResult = await sendTemplateEmail({
      templateKey: "ENQUIRY_RECEIVED",
      to: { email: lead.email, name: lead.full_name },
      vars: { applicant_name: lead.full_name, lead_number: lead.lead_number },
      leadId: lead.id,
    });

    revalidatePath("/admin");
    revalidatePath("/admin/leads");
    revalidatePath("/member");
    revalidatePath("/member/leads");

    return {
      ok: true,
      leadNumber: lead.lead_number,
      emailSent: emailResult.status === "SENT",
    };
  } catch (cause) {
    console.error("[enquiry] submission failed", cause);
    return {
      ok: false,
      message:
        "Something went wrong saving your enquiry. Please try again, or call us directly.",
    };
  }
}
