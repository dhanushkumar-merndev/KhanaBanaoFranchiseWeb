import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import { documentTokenSecret } from "@/lib/env";

const RECEIPT_VERSION = "DIRECT_UPLOAD_V1";

export type DirectUploadReceiptPayload = {
  purpose: string;
  bucket: string;
  path: string;
  ownerId: string;
  actorId: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  expiresAt: number;
  attributes?: Record<string, string | number | boolean | null>;
};

function signature(encoded: string): string {
  return createHmac("sha256", documentTokenSecret())
    .update(`${RECEIPT_VERSION}:${encoded}`)
    .digest("base64url");
}

export function createDirectUploadReceipt(
  payload: DirectUploadReceiptPayload,
): string {
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${encoded}.${signature(encoded)}`;
}

export function readDirectUploadReceipt(
  receipt: string,
  purpose: string,
): DirectUploadReceiptPayload | null {
  const separator = receipt.lastIndexOf(".");
  if (separator <= 0) return null;

  const encoded = receipt.slice(0, separator);
  const supplied = Buffer.from(receipt.slice(separator + 1));
  const expected = Buffer.from(signature(encoded));
  if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) {
    return null;
  }

  try {
    const payload = JSON.parse(
      Buffer.from(encoded, "base64url").toString("utf8"),
    ) as Partial<DirectUploadReceiptPayload>;
    if (
      payload.purpose !== purpose ||
      typeof payload.bucket !== "string" ||
      typeof payload.path !== "string" ||
      typeof payload.ownerId !== "string" ||
      typeof payload.actorId !== "string" ||
      typeof payload.fileName !== "string" ||
      typeof payload.fileSize !== "number" ||
      typeof payload.mimeType !== "string" ||
      typeof payload.expiresAt !== "number" ||
      (payload.attributes !== undefined &&
        (payload.attributes === null || typeof payload.attributes !== "object"))
    ) {
      return null;
    }
    return payload as DirectUploadReceiptPayload;
  } catch {
    return null;
  }
}
