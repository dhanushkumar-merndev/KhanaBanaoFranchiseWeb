import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import type { BucketName } from "@/lib/storage";

/**
 * A Brevo attachment: either a publicly fetchable `url`, or base64 `content`.
 *
 * Public marketing collateral goes by URL — it costs nothing in the request
 * body and Brevo caches it. Anything out of a private bucket goes as base64,
 * so no signed URL to a customer's own paperwork ends up in a provider log.
 */
export type EmailAttachment = { name: string } & (
  | { url: string; content?: never }
  | { content: string; url?: never }
);

/**
 * Brevo caps a send at 10 MB. Uploads are already limited to 5 MB, and base64
 * inflates by a third, so one file of this size still leaves room for another.
 */
const MAX_ATTACHMENT_BYTES = 6 * 1024 * 1024;

/**
 * Read a file out of a private bucket and encode it for attachment.
 *
 * Returns null on every failure rather than throwing: an attachment that
 * cannot be built must not stop the email, and the email must not stop the
 * business action that triggered it.
 */
export async function storedFileAttachment(
  bucket: BucketName,
  path: string,
  name: string,
): Promise<EmailAttachment | null> {
  try {
    const { data, error } = await createAdminClient()
      .storage.from(bucket)
      .download(path);

    if (error || !data) return null;

    const bytes = Buffer.from(await data.arrayBuffer());
    if (bytes.byteLength === 0 || bytes.byteLength > MAX_ATTACHMENT_BYTES) {
      return null;
    }

    return { name, content: bytes.toString("base64") };
  } catch {
    return null;
  }
}
