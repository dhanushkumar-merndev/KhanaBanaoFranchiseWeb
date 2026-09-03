"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/session";
import { wrapEmailHtml } from "@/lib/email/layout";
import { renderTemplate, missingVariables, type TemplateVars } from "@/lib/email/render";
import { sendTemplateEmail } from "@/lib/email/send";
import { createAdminClient } from "@/lib/supabase/admin";
import type { EmailTemplateKey } from "@/lib/domain/enums";
import type { ActionResult } from "@/lib/validation/result";

/** Stand-in values so a preview reads like a real message. */
const SAMPLE: TemplateVars = {
  applicant_name: "Ramesh Iyer",
  lead_number: "KB-L01042",
  application_number: "KB-A01007",
  application_link: "https://example.com/franchise/application/sample-token",
  document_names: "Aadhaar Card, PAN Card",
  reupload_reason: "The PAN card image is cut off — please re-scan the full card.",
  territory: "Coimbatore South",
  agreement_number: "KB-AG01003",
  payment_amount: "₹50,000",
  franchise_id: "KB-F0104",
  dashboard_url: "https://example.com/crm",
  password_setup_link: "https://example.com/set-password/sample-token",
  training_date: "12 Aug 2026",
  support_name: "Priya Menon",
  support_phone: "+91 94227 99299",
  verification_code: "418302",
};

export async function updateEmailTemplate(
  templateId: string,
  subject: string,
  bodyHtml: string,
): Promise<ActionResult> {
  const profile = await requireAdmin();

  const trimmedSubject = subject.trim();
  const trimmedBody = bodyHtml.trim();

  const fieldErrors: Record<string, string> = {};
  if (trimmedSubject.length < 3) fieldErrors.subject = "A subject line is required";
  if (trimmedBody.length < 10) fieldErrors.bodyHtml = "The body cannot be empty";
  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, message: "Please check the highlighted fields.", fieldErrors };
  }

  const supabase = createAdminClient();

  const { error } = await supabase
    .from("email_templates")
    .update({
      subject: trimmedSubject,
      body_html: trimmedBody,
      updated_by: profile.id,
    })
    .eq("id", templateId);

  if (error) return { ok: false, message: error.message };

  await supabase.from("activity_logs").insert({
    actor_id: profile.id,
    entity_type: "email_template",
    entity_id: templateId,
    action: "EMAIL_TEMPLATE_UPDATED",
    summary: `Edited the template "${trimmedSubject}".`,
  });

  revalidatePath("/admin/email-templates");
  return { ok: true };
}

export async function setTemplateActive(
  templateId: string,
  isActive: boolean,
): Promise<ActionResult> {
  const profile = await requireAdmin();
  const supabase = createAdminClient();

  const { error } = await supabase
    .from("email_templates")
    .update({ is_active: isActive, updated_by: profile.id })
    .eq("id", templateId);

  if (error) return { ok: false, message: error.message };

  await supabase.from("activity_logs").insert({
    actor_id: profile.id,
    entity_type: "email_template",
    entity_id: templateId,
    action: isActive ? "EMAIL_TEMPLATE_ACTIVATED" : "EMAIL_TEMPLATE_DEACTIVATED",
    summary: isActive
      ? "Template reactivated."
      : "Template deactivated — sends are skipped and logged.",
  });

  revalidatePath("/admin/email-templates");
  return { ok: true };
}

/**
 * Restore the seeded wording.
 *
 * The defaults live in `default_subject` / `default_body_html`, written by the
 * seed migration and never edited, so reset is always available.
 */
export async function resetEmailTemplate(
  templateId: string,
): Promise<ActionResult<{ subject: string; bodyHtml: string }>> {
  const profile = await requireAdmin();
  const supabase = createAdminClient();

  const { data: template } = await supabase
    .from("email_templates")
    .select("id, name, default_subject, default_body")
    .eq("id", templateId)
    .maybeSingle();

  if (!template) return { ok: false, message: "That template no longer exists." };

  const { error } = await supabase
    .from("email_templates")
    .update({
      subject: template.default_subject,
      body_html: template.default_body,
      updated_by: profile.id,
    })
    .eq("id", templateId);

  if (error) return { ok: false, message: error.message };

  await supabase.from("activity_logs").insert({
    actor_id: profile.id,
    entity_type: "email_template",
    entity_id: templateId,
    action: "EMAIL_TEMPLATE_RESET",
    summary: `Reset "${template.name}" to its default wording.`,
  });

  revalidatePath("/admin/email-templates");
  // Returned so the editor can show the restored wording immediately — its
  // textarea state was seeded at mount and a refresh alone will not replace it.
  return {
    ok: true,
    data: {
      subject: template.default_subject,
      bodyHtml: template.default_body,
    },
  };
}

/** Renders unsaved text with sample values, for the preview pane. */
export async function previewEmailTemplate(
  subject: string,
  bodyHtml: string,
): Promise<
  ActionResult<{ subject: string; body: string; missing: string[] }>
> {
  await requireAdmin();

  return {
    ok: true,
    data: {
      subject: renderTemplate(subject, SAMPLE),
      // The full branded document, so the preview shows what actually lands in
      // the inbox — logo, header band and footer included.
      body: wrapEmailHtml(renderTemplate(bodyHtml, SAMPLE)),
      // Placeholders with no sample value are almost always typos.
      missing: missingVariables(`${subject} ${bodyHtml}`, SAMPLE),
    },
  };
}

export async function sendTestEmail(
  templateKey: string,
  toEmail: string,
  subject: string,
  bodyHtml: string,
): Promise<ActionResult> {
  const profile = await requireAdmin();

  const email = toEmail.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
    return {
      ok: false,
      message: "Enter a valid email address.",
      fieldErrors: { testEmail: "Enter a valid email address" },
    };
  }

  // Sends the *unsaved* text so wording can be checked before committing it.
  const result = await sendTemplateEmail({
    templateKey: templateKey as EmailTemplateKey,
    to: { email, name: "Test recipient" },
    vars: SAMPLE,
    triggeredBy: profile.id,
    override: {
      subject: `[TEST] ${subject}`,
      bodyHtml,
    },
  });

  revalidatePath("/admin/email-logs");

  if (result.status === "SENT") return { ok: true };
  return {
    ok: false,
    message:
      result.status === "SKIPPED"
        ? "Brevo is not configured, so nothing was sent. The attempt is in the email logs."
        : `The send failed: ${result.error ?? "unknown error"}`,
  };
}
