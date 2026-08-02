import "server-only";

import { randomUUID } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import type { STORAGE_BUCKETS } from "@/lib/domain/enums";

export type BucketName = (typeof STORAGE_BUCKETS)[keyof typeof STORAGE_BUCKETS];

/** Signed URLs are short-lived: long enough to click, short enough to not leak. */
const SIGNED_URL_TTL_SECONDS = 60 * 10;

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
export const MAX_AGREEMENT_BYTES = 20 * 1024 * 1024;

export const ALLOWED_DOCUMENT_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export const ALLOWED_AGREEMENT_TYPES = ["application/pdf"] as const;

/**
 * All buckets are private, so a stored path is useless on its own. Every read
 * goes through a freshly signed URL created by a caller that has already
 * checked who is asking.
 */
export async function signedUrlFor(
  bucket: BucketName,
  path: string,
  { download }: { download?: string } = {},
): Promise<string | null> {
  const { data } = await createAdminClient()
    .storage.from(bucket)
    .createSignedUrl(path, SIGNED_URL_TTL_SECONDS, download ? { download } : undefined);
  return data?.signedUrl ?? null;
}

export async function uploadFile(
  bucket: BucketName,
  path: string,
  file: File,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const { error } = await createAdminClient()
    .storage.from(bucket)
    .upload(path, file, {
      contentType: file.type,
      upsert: false,
      cacheControl: "3600",
    });

  return error ? { ok: false, message: error.message } : { ok: true };
}

export async function removeFile(bucket: BucketName, path: string): Promise<void> {
  await createAdminClient().storage.from(bucket).remove([path]);
}

/**
 * Strips anything that could escape the intended folder or confuse a
 * Content-Disposition header, while keeping the name recognisable.
 */
export function safeFileName(name: string): string {
  const cleaned = name
    .normalize("NFKD")
    .replace(/[^\w.\- ]+/g, "")
    .replace(/\s+/g, "-")
    .replace(/-{2,}/g, "-")
    .slice(-120);
  return cleaned || "file";
}

/** `applications/<applicationId>/<type>/v2-1754049600000-pan.pdf` */
export function documentPath(
  applicationId: string,
  documentType: string,
  version: number,
  fileName: string,
): string {
  return `applications/${applicationId}/${documentType}/v${version}-${Date.now()}-${randomUUID()}-${safeFileName(fileName)}`;
}

export function paymentProofPath(leadId: string, fileName: string): string {
  return `leads/${leadId}/${Date.now()}-${randomUUID()}-${safeFileName(fileName)}`;
}

export function agreementPath(
  leadId: string,
  version: number,
  fileName: string,
): string {
  return `leads/${leadId}/v${version}-${Date.now()}-${randomUUID()}-${safeFileName(fileName)}`;
}

export function approvalLetterPath(
  applicationId: string,
  fileName: string,
): string {
  return `applications/${applicationId}/${Date.now()}-${safeFileName(fileName)}`;
}

export function trainingDocumentPath(
  franchiseId: string,
  fileName: string,
): string {
  return `franchises/${franchiseId}/${Date.now()}-${safeFileName(fileName)}`;
}

export type FileCheck = { ok: true } | { ok: false; message: string };

export function checkUpload(
  file: File,
  {
    maxBytes = MAX_UPLOAD_BYTES,
    allowed = ALLOWED_DOCUMENT_TYPES as readonly string[],
  } = {},
): FileCheck {
  if (file.size === 0) return { ok: false, message: "That file is empty." };
  if (file.size > maxBytes) {
    return {
      ok: false,
      message: `That file is ${(file.size / 1024 / 1024).toFixed(1)} MB. The limit is ${maxBytes / 1024 / 1024} MB.`,
    };
  }
  if (!allowed.includes(file.type)) {
    return {
      ok: false,
      message:
        allowed.length === 1
          ? "Only PDF files are accepted here."
          : "Accepted formats are PDF, JPG, PNG and WebP.",
    };
  }
  return { ok: true };
}

// File-size formatting lives in lib/format.ts — this module is `server-only`,
// and client components render sizes too.
