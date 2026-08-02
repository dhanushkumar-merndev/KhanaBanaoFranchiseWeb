import "server-only";

import {
  createHmac,
  randomInt,
  timingSafeEqual,
} from "node:crypto";
import { cookies } from "next/headers";
import { documentTokenSecret } from "@/lib/env";

const ACCESS_COOKIE = "kb_document_access";
const ACCESS_TTL_SECONDS = 30 * 60;
const SESSION_CONTEXT = "DOCUMENT_OTP_SESSION_V1";
const OTP_CONTEXT = "DOCUMENT_OTP_CODE_V1";

function hmac(context: string, value: string) {
  return createHmac("sha256", documentTokenSecret())
    .update(`${context}:${value}`)
    .digest("base64url");
}

function safeEqual(left: string, right: string) {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function createDocumentOtp() {
  return randomInt(0, 1_000_000).toString().padStart(6, "0");
}

export function hashDocumentOtp(tokenId: string, code: string) {
  return hmac(OTP_CONTEXT, `${tokenId}:${code}`);
}

export function matchesDocumentOtp(
  tokenId: string,
  code: string,
  expectedHash: string,
) {
  return safeEqual(hashDocumentOtp(tokenId, code), expectedHash);
}

export function maskEmail(email: string) {
  const [local, domain] = email.trim().split("@");
  if (!local || !domain) return "your registered email";
  const visible = local.length <= 2 ? local[0] : `${local[0]}${local.at(-1)}`;
  return `${visible[0]}${"*".repeat(Math.max(3, local.length - visible.length))}${visible.slice(1)}@${domain}`;
}

export function documentOtpGateState(
  challenge: {
    document_otp_hash: string | null;
    document_otp_expires_at: string | null;
    document_otp_attempts: number;
    document_otp_sent_at: string | null;
  } | null,
  now = Date.now(),
) {
  const initialCodeSent = Boolean(
    challenge?.document_otp_hash &&
      challenge.document_otp_expires_at &&
      new Date(challenge.document_otp_expires_at).getTime() > now &&
      challenge.document_otp_attempts < 5,
  );
  const initialCooldown = challenge?.document_otp_sent_at
    ? Math.max(
        0,
        Math.ceil(
          (new Date(challenge.document_otp_sent_at).getTime() + 60_000 - now) /
            1000,
        ),
      )
    : 0;
  return { initialCodeSent, initialCooldown };
}

export async function grantDocumentAccess(tokenId: string) {
  const expiresAt = Date.now() + ACCESS_TTL_SECONDS * 1000;
  const encoded = Buffer.from(JSON.stringify({ tokenId, expiresAt })).toString(
    "base64url",
  );
  const value = `${encoded}.${hmac(SESSION_CONTEXT, encoded)}`;
  const cookieStore = await cookies();
  cookieStore.set(ACCESS_COOKIE, value, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/franchise/documents",
    maxAge: ACCESS_TTL_SECONDS,
  });
}

export async function hasDocumentAccess(tokenId: string) {
  const value = (await cookies()).get(ACCESS_COOKIE)?.value;
  if (!value) return false;

  const separator = value.lastIndexOf(".");
  if (separator <= 0) return false;
  const encoded = value.slice(0, separator);
  const supplied = value.slice(separator + 1);
  if (!safeEqual(supplied, hmac(SESSION_CONTEXT, encoded))) return false;

  try {
    const payload = JSON.parse(
      Buffer.from(encoded, "base64url").toString("utf8"),
    ) as { tokenId?: unknown; expiresAt?: unknown };
    return (
      payload.tokenId === tokenId &&
      typeof payload.expiresAt === "number" &&
      payload.expiresAt > Date.now()
    );
  } catch {
    return false;
  }
}
