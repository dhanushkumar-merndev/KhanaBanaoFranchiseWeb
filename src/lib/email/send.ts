import "server-only";

import { brevoApiKey, brevoSender, isBrevoConfigured } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import type { EmailTemplateKey } from "@/lib/domain/enums";
import type { EmailAttachment } from "./attachments";
import { wrapEmailHtml } from "./layout";
import { htmlToText, renderTemplate, type TemplateVars } from "./render";

const BREVO_ENDPOINT = "https://api.brevo.com/v3/smtp/email";

export type SendResult = {
  status: "SENT" | "FAILED" | "SKIPPED";
  providerId?: string;
  error?: string;
};

type SendArgs = {
  templateKey: EmailTemplateKey;
  to: { email: string; name?: string };
  vars: TemplateVars;
  /** Ties the log row back to a lead so it shows on the lead's Emails tab. */
  leadId?: string;
  triggeredBy?: string;
  /** Overrides the stored template — used by the "send test email" action. */
  override?: { subject: string; bodyHtml: string };
  /** Sends normally, but never persists a readable body preview. */
  sensitive?: boolean;
  /** Files to attach. Nulls are dropped, so callers can pass a best-effort list. */
  attachments?: readonly (EmailAttachment | null)[];
};

/**
 * Send one transactional email and always write a log row.
 *
 * Never throws: a mail failure must not roll back the business action that
 * triggered it (spec §21). Callers inspect the returned status if they want
 * to surface a warning.
 */
export async function sendTemplateEmail(args: SendArgs): Promise<SendResult> {
  const supabase = createAdminClient();

  let subject = args.override?.subject ?? "";
  let bodyHtml = args.override?.bodyHtml ?? "";

  if (!args.override) {
    const { data: template, error } = await supabase
      .from("email_templates")
      .select("subject, body_html, is_active")
      .eq("template_key", args.templateKey)
      .maybeSingle();

    if (error || !template) {
      return logAndReturn(
        args,
        {
          status: "FAILED",
          error: error?.message ?? `No template found for ${args.templateKey}`,
        },
        "",
        "",
      );
    }

    if (!template.is_active) {
      return logAndReturn(
        args,
        { status: "SKIPPED", error: "Template is deactivated" },
        template.subject,
        template.body_html,
      );
    }

    subject = template.subject;
    bodyHtml = template.body_html;
  }

  const renderedSubject = renderTemplate(subject, args.vars);
  const renderedBody = renderTemplate(bodyHtml, args.vars);
  const plainBody = htmlToText(renderedBody);
  const wrappedBody = wrapEmailHtml(renderedBody, {
    preheader: previewLine(plainBody),
  });

  if (!isBrevoConfigured) {
    // Dev convenience: record what *would* have gone out instead of failing.
    return logAndReturn(
      args,
      { status: "SKIPPED", error: "Brevo is not configured" },
      renderedSubject,
      renderedBody,
    );
  }

  const attachments = (args.attachments ?? []).filter(
    (item): item is EmailAttachment => item !== null,
  );

  try {
    const sender = brevoSender();
    const response = await fetch(BREVO_ENDPOINT, {
      method: "POST",
      headers: {
        "api-key": brevoApiKey(),
        "content-type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify({
        sender,
        to: [{ email: args.to.email, name: args.to.name }],
        subject: renderedSubject,
        htmlContent: wrappedBody,
        textContent: plainBody,
        ...(attachments.length > 0 ? { attachment: attachments } : {}),
      }),
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      return logAndReturn(
        args,
        {
          status: "FAILED",
          error: `Brevo responded ${response.status}: ${detail.slice(0, 300)}`,
        },
        renderedSubject,
        renderedBody,
      );
    }

    const payload = (await response.json().catch(() => ({}))) as {
      messageId?: string;
    };

    return logAndReturn(
      args,
      { status: "SENT", providerId: payload.messageId },
      renderedSubject,
      renderedBody,
    );
  } catch (cause) {
    return logAndReturn(
      args,
      {
        status: "FAILED",
        error:
          cause instanceof Error ? cause.message : "Unknown transport error",
      },
      renderedSubject,
      renderedBody,
    );
  }
}

/**
 * The grey line Gmail shows beside the subject in the inbox list.
 *
 * Skips the greeting — "Hi Priya," beside every subject tells the reader
 * nothing, so the first real sentence of the message goes there instead.
 */
function previewLine(text: string): string {
  const withoutGreeting = text.replace(/^(hi|hello|dear)\b[^\n]{0,60}?,\s*/i, "");
  return withoutGreeting.replace(/\s+/g, " ").trim().slice(0, 140);
}

async function logAndReturn(
  args: SendArgs,
  result: SendResult,
  subject: string,
  body: string,
): Promise<SendResult> {
  try {
    await createAdminClient()
      .from("email_logs")
      .insert({
        template_key: args.templateKey,
        to_email: args.to.email,
        to_name: args.to.name ?? null,
        subject,
        body_preview: args.sensitive ? null : htmlToText(body).slice(0, 500),
        status: result.status,
        provider_id: result.providerId ?? null,
        error_message: result.error ?? null,
        attachment_names: (args.attachments ?? [])
          .filter((attachment): attachment is EmailAttachment => attachment !== null)
          .map((attachment) => attachment.name),
        lead_id: args.leadId ?? null,
        triggered_by: args.triggeredBy ?? null,
      });
  } catch {
    // Logging must never break the caller either.
  }
  return result;
}
