import "server-only";

import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { applicationTokenSecret, documentTokenSecret } from "@/lib/env";

/**
 * Secure links for applicants, who never log in.
 *
 * A token is `<random>.<hmac>`. The random half is the only thing that makes a
 * token unguessable; the HMAC lets us reject a malformed or tampered token
 * before touching the database, so a scanner hitting the route with junk never
 * causes a query.
 *
 * Only the SHA-256 of the token is stored (`application_tokens.token_hash`).
 * A leaked database backup therefore does not hand over working links.
 */

export type TokenPurpose = "APPLICATION" | "DOCUMENTS";

function secretFor(purpose: TokenPurpose): string {
  return purpose === "APPLICATION"
    ? applicationTokenSecret()
    : documentTokenSecret();
}

function sign(value: string, purpose: TokenPurpose): string {
  return createHmac("sha256", secretFor(purpose))
    .update(`${purpose}:${value}`)
    .digest("base64url");
}

export function createToken(purpose: TokenPurpose): string {
  const value = randomBytes(24).toString("base64url");
  return `${value}.${sign(value, purpose)}`;
}

/** Constant-time signature check. Returns false for anything malformed. */
export function verifyToken(token: string, purpose: TokenPurpose): boolean {
  const separator = token.lastIndexOf(".");
  if (separator <= 0) return false;

  const value = token.slice(0, separator);
  const signature = token.slice(separator + 1);
  const expected = sign(value, purpose);

  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  // timingSafeEqual throws on a length mismatch, which is itself a leak of
  // sorts, so the lengths are compared first and the result folded in.
  return a.length === b.length && timingSafeEqual(a, b);
}

/** What goes in the database. Never store the token itself. */
export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function applicationUrl(appUrl: string, token: string): string {
  return `${appUrl}/franchise/application/${token}`;
}

export function documentsUrl(appUrl: string, token: string): string {
  return `${appUrl}/franchise/documents/${token}`;
}
