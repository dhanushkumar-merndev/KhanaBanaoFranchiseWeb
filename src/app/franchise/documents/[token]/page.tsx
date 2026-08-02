import type { Metadata } from "next";
import { resolveToken, touchToken } from "@/lib/data/tokens";
import { createAdminClient } from "@/lib/supabase/admin";
import { LinkInvalid } from "@/app/franchise/link-invalid";
import { UploadList, type UploadRow } from "./upload-list";

export const metadata: Metadata = {
  title: "Upload your documents",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function DocumentUploadPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const resolved = await resolveToken(token, "DOCUMENTS");

  if (!resolved.ok) return <LinkInvalid what="upload link" />;

  const { lead, applicationId, tokenId } = resolved.data;
  if (!applicationId) return <LinkInvalid what="upload link" />;

  await touchToken(tokenId);

  const supabase = createAdminClient();

  const { data: requests } = await supabase
    .from("document_requests")
    .select("id, document_type, status, request_note")
    .eq("application_id", applicationId)
    .order("requested_at");

  const requestIds = (requests ?? []).map((request) => request.id);

  const documents = requestIds.length
    ? ((
        await supabase
          .from("documents")
          .select(
            "document_request_id, file_name, file_size, uploaded_at, version, rejection_reason",
          )
          .in("document_request_id", requestIds)
          .order("version", { ascending: false })
      ).data ?? [])
    : [];

  // Only the newest version per request is shown; earlier ones are history the
  // applicant does not need.
  const latestByRequest = new Map<string, (typeof documents)[number]>();
  for (const document of documents) {
    if (!latestByRequest.has(document.document_request_id)) {
      latestByRequest.set(document.document_request_id, document);
    }
  }

  const rows: UploadRow[] = (requests ?? []).map((request) => {
    const latest = latestByRequest.get(request.id);
    return {
      requestId: request.id,
      documentType: request.document_type,
      status: request.status,
      requestNote: request.request_note,
      rejectionReason: latest?.rejection_reason ?? null,
      latest: latest
        ? {
            fileName: latest.file_name,
            fileSize: Number(latest.file_size),
            uploadedAt: latest.uploaded_at,
            version: latest.version,
          }
        : null,
    };
  });

  if (rows.length === 0) return <LinkInvalid what="upload link" />;

  return (
    <>
      <header className="mb-6">
        <p className="font-mono text-[0.7rem] uppercase tracking-wide text-ink-soft">
          {lead.lead_number}
        </p>
        <h1 className="mt-1 font-display text-2xl font-bold text-ink md:text-3xl">
          Your documents
        </h1>
        <p className="mt-2 max-w-xl text-[0.85rem] leading-relaxed text-ink-soft">
          Hello {lead.full_name.split(" ")[0]} — please upload the documents
          below. You can come back to this link any time; each one saves as soon
          as you upload it.
        </p>
      </header>

      <UploadList token={token} rows={rows} />
    </>
  );
}
