"use server";

import { resolveToken } from "@/lib/data/tokens";
import {
  createDocumentOtp,
  grantDocumentAccess,
  hashDocumentOtp,
  maskEmail,
  matchesDocumentOtp,
} from "@/lib/document-otp";
import { sendTemplateEmail } from "@/lib/email/send";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ActionResult } from "@/lib/validation/result";

const OTP_TTL_MS = 10 * 60 * 1000;
const RESEND_WAIT_MS = 60 * 1000;
const SEND_WINDOW_MS = 60 * 60 * 1000;
const MAX_SENDS_PER_WINDOW = 5;
const MAX_ATTEMPTS = 5;

type OtpSent = { maskedEmail: string; retryAfterSeconds: number };

export async function requestDocumentAccessOtp(
  token: string,
): Promise<ActionResult<OtpSent>> {
  const resolved = await resolveToken(token, "DOCUMENTS");
  if (!resolved.ok) {
    return { ok: false, message: "This link is no longer valid." };
  }

  const supabase = createAdminClient();
  const { data: tokenRow } = await supabase
    .from("application_tokens")
    .select(
      "id, document_otp_hash, document_otp_expires_at, document_otp_attempts, document_otp_sent_at, document_otp_send_count, document_otp_window_started_at",
    )
    .eq("id", resolved.data.tokenId)
    .maybeSingle();

  if (!tokenRow) {
    return { ok: false, message: "This link is no longer valid." };
  }

  const now = Date.now();
  const lastSentAt = tokenRow.document_otp_sent_at
    ? new Date(tokenRow.document_otp_sent_at).getTime()
    : 0;
  const retryAfter = RESEND_WAIT_MS - (now - lastSentAt);
  if (retryAfter > 0) {
    const existingCodeIsUsable =
      Boolean(tokenRow.document_otp_hash) &&
      Boolean(tokenRow.document_otp_expires_at) &&
      new Date(tokenRow.document_otp_expires_at!).getTime() > now &&
      tokenRow.document_otp_attempts < MAX_ATTEMPTS;
    if (existingCodeIsUsable) {
      return {
        ok: true,
        data: {
          maskedEmail: maskEmail(resolved.data.lead.email),
          retryAfterSeconds: Math.ceil(retryAfter / 1000),
        },
      };
    }
    return {
      ok: false,
      message: `Please wait ${Math.ceil(retryAfter / 1000)} seconds before requesting another code.`,
    };
  }

  const windowStartedAt = tokenRow.document_otp_window_started_at
    ? new Date(tokenRow.document_otp_window_started_at).getTime()
    : 0;
  const withinWindow = now - windowStartedAt < SEND_WINDOW_MS;
  const sendCount = withinWindow ? tokenRow.document_otp_send_count : 0;
  if (sendCount >= MAX_SENDS_PER_WINDOW) {
    return {
      ok: false,
      message: "Too many codes were requested. Please try again in an hour.",
    };
  }

  const code = createDocumentOtp();
  const sentAt = new Date(now).toISOString();
  const { error: updateError } = await supabase
    .from("application_tokens")
    .update({
      document_otp_hash: hashDocumentOtp(resolved.data.tokenId, code),
      document_otp_expires_at: new Date(now + OTP_TTL_MS).toISOString(),
      document_otp_attempts: 0,
      document_otp_sent_at: sentAt,
      document_otp_send_count: sendCount + 1,
      document_otp_window_started_at: withinWindow
        ? tokenRow.document_otp_window_started_at
        : sentAt,
    })
    .eq("id", resolved.data.tokenId);

  if (updateError) {
    return {
      ok: false,
      message: "We could not create a code. Please try again.",
    };
  }

  const delivery = await sendTemplateEmail({
    templateKey: "DOCUMENT_ACCESS_OTP",
    to: {
      email: resolved.data.lead.email,
      name: resolved.data.lead.full_name,
    },
    vars: {
      applicant_name: resolved.data.lead.full_name,
      lead_number: resolved.data.lead.lead_number,
      verification_code: code,
    },
    leadId: resolved.data.leadId,
    sensitive: true,
    override: {
      subject: "Your Khana Banao document verification code",
      bodyHtml:
        '<p>Hi {{applicant_name}},</p><p>Your verification code for the secure document-upload page is:</p><p style="font-size:28px;font-weight:700;letter-spacing:6px">{{verification_code}}</p><p>This code expires in 10 minutes. Do not share it with anyone.</p><p>Reference: {{lead_number}}</p>',
    },
  });

  if (delivery.status !== "SENT") {
    await supabase
      .from("application_tokens")
      .update({
        document_otp_hash: null,
        document_otp_expires_at: null,
        document_otp_attempts: 0,
      })
      .eq("id", resolved.data.tokenId);
    return {
      ok: false,
      message:
        "The verification email could not be sent. Please try again shortly.",
    };
  }

  return {
    ok: true,
    data: {
      maskedEmail: maskEmail(resolved.data.lead.email),
      retryAfterSeconds: RESEND_WAIT_MS / 1000,
    },
  };
}

export async function verifyDocumentAccessOtp(
  token: string,
  code: string,
): Promise<ActionResult> {
  const normalizedCode = code.trim();
  if (!/^\d{6}$/.test(normalizedCode)) {
    return { ok: false, message: "Enter the complete 6-digit code." };
  }

  const resolved = await resolveToken(token, "DOCUMENTS");
  if (!resolved.ok) {
    return { ok: false, message: "This link is no longer valid." };
  }

  const supabase = createAdminClient();
  const { data: tokenRow } = await supabase
    .from("application_tokens")
    .select("document_otp_hash, document_otp_expires_at, document_otp_attempts")
    .eq("id", resolved.data.tokenId)
    .maybeSingle();

  if (!tokenRow?.document_otp_hash || !tokenRow.document_otp_expires_at) {
    return { ok: false, message: "Request a new verification code first." };
  }
  if (tokenRow.document_otp_attempts >= MAX_ATTEMPTS) {
    return {
      ok: false,
      message: "Too many incorrect attempts. Request a new code.",
    };
  }
  if (new Date(tokenRow.document_otp_expires_at).getTime() < Date.now()) {
    return { ok: false, message: "That code has expired. Request a new one." };
  }

  if (
    !matchesDocumentOtp(
      resolved.data.tokenId,
      normalizedCode,
      tokenRow.document_otp_hash,
    )
  ) {
    const attempts = Math.min(tokenRow.document_otp_attempts + 1, MAX_ATTEMPTS);
    await supabase
      .from("application_tokens")
      .update({ document_otp_attempts: attempts })
      .eq("id", resolved.data.tokenId);
    return {
      ok: false,
      message:
        attempts >= MAX_ATTEMPTS
          ? "Too many incorrect attempts. Request a new code."
          : "That code is incorrect. Please check the email and try again.",
    };
  }

  await supabase
    .from("application_tokens")
    .update({
      document_otp_hash: null,
      document_otp_expires_at: null,
      document_otp_attempts: 0,
      document_otp_verified_at: new Date().toISOString(),
    })
    .eq("id", resolved.data.tokenId);

  await grantDocumentAccess(resolved.data.tokenId);
  return { ok: true };
}
