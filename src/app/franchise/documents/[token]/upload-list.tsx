"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  CircleAlert,
  Clock,
  FileCheck2,
  RefreshCw,
  Trash2,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import {
  discardDocumentUploads,
  finalizeDocumentUploads,
  prepareDocumentUploads,
} from "@/app/actions/documents";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  DOCUMENT_TYPE_LABELS,
  STORAGE_BUCKETS,
  type DocumentType,
} from "@/lib/domain/enums";
import { DOCUMENT_STATUS_LABELS } from "@/lib/domain/status";
import { formatBytes, formatDateTime } from "@/lib/format";
import type { DocumentStatus } from "@/lib/domain/enums";
import { createClient } from "@/lib/supabase/client";
import {
  MAX_DOCUMENT_UPLOAD_BYTES,
  MAX_DOCUMENT_UPLOAD_MB,
} from "@/lib/upload-limits";

export type UploadRow = {
  requestId: string;
  documentType: DocumentType;
  status: DocumentStatus;
  requestNote: string | null;
  rejectionReason: string | null;
  latest: {
    fileName: string;
    fileSize: number;
    uploadedAt: string;
    version: number;
  } | null;
};

const ACCEPT = ".pdf,.jpg,.jpeg,.png,.webp";
const ALLOWED_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

function validateFile(file: File) {
  if (file.size === 0) return "That file is empty.";
  if (file.size > MAX_DOCUMENT_UPLOAD_BYTES) {
    return `That file is ${(file.size / 1024 / 1024).toFixed(1)} MB. The limit is ${MAX_DOCUMENT_UPLOAD_MB} MB.`;
  }
  if (!ALLOWED_TYPES.has(file.type)) {
    return "Accepted formats are PDF, JPG, PNG and WebP.";
  }
  return null;
}

export function UploadList({
  token,
  rows,
}: {
  token: string;
  rows: UploadRow[];
}) {
  const router = useRouter();
  const [files, setFiles] = useState<Record<string, File>>({});
  const [confirmOpen, setConfirmOpen] = useState(false);

  const outstanding = rows.filter(
    (row) => row.status === "REQUESTED" || row.status === "REUPLOAD_REQUIRED",
  );
  const readyCount = outstanding.filter((row) => files[row.requestId]).length;
  const allReady = outstanding.length > 0 && readyCount === outstanding.length;

  const chooseFile = (requestId: string, file: File) => {
    const error = validateFile(file);
    if (error) {
      toast.error(error);
      return;
    }
    setFiles((current) => ({ ...current, [requestId]: file }));
  };

  const removeFile = (requestId: string) => {
    setFiles((current) => {
      const next = { ...current };
      delete next[requestId];
      return next;
    });
  };

  const submit = async () => {
    const selected = [];
    for (const row of outstanding) {
      const file = files[row.requestId];
      if (!file) {
        return { ok: false, message: "Choose a file for every document first." };
      }
      selected.push({
        requestId: row.requestId,
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type,
      });
    }

    const prepared = await prepareDocumentUploads(token, selected);
    if (!prepared.ok) return prepared;

    const receipts = prepared.data.uploads.map((upload) => upload.receipt);
    try {
      const supabase = createClient();
      const results = await Promise.all(
        prepared.data.uploads.map(async (upload) => {
          const file = files[upload.requestId];
          if (!file) return { error: new Error("A selected file is no longer available.") };
          const { error } = await supabase.storage
            .from(STORAGE_BUCKETS.documents)
            .uploadToSignedUrl(upload.path, upload.uploadToken, file, {
              cacheControl: "3600",
              contentType: file.type,
            });
          return { error };
        }),
      );

      const failed = results.find((result) => result.error)?.error;
      if (failed) {
        await discardDocumentUploads(token, receipts);
        return {
          ok: false,
          message: `A file could not be uploaded: ${failed.message}`,
        };
      }

      const result = await finalizeDocumentUploads(token, receipts);
      if (!result.ok) {
        await discardDocumentUploads(token, receipts);
        return result;
      }

      toast.success(
        `${result.data.count} document${result.data.count === 1 ? "" : "s"} submitted for review.`,
      );
      setFiles({});
      router.refresh();
      return result;
    } catch (error) {
      await discardDocumentUploads(token, receipts);
      return {
        ok: false,
        message:
          error instanceof Error
            ? `The direct upload failed: ${error.message}`
            : "The direct upload failed. Please try again.",
      };
    }
  };

  return (
    <div className="space-y-4">
      {outstanding.length === 0 ? (
        <div className="rounded-2xl border border-ok/30 bg-ok/5 px-5 py-6 text-center">
          <CheckCircle2 className="mx-auto size-8 text-[#217a33]" />
          <h2 className="mt-2 font-display text-base font-bold text-ink">
            Everything we asked for is in
          </h2>
          <p className="mx-auto mt-1 max-w-md text-[0.82rem] leading-relaxed text-ink-soft">
            Our team is reviewing your documents. We will email you if anything
            needs correcting.
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-line bg-surface px-4 py-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-[0.82rem] leading-relaxed text-ink-soft">
              <strong className="text-ink">
                {readyCount} of {outstanding.length} document
                {outstanding.length === 1 ? "" : "s"} ready
              </strong>
              . PDF, JPG, PNG or WebP, up to {MAX_DOCUMENT_UPLOAD_MB}&nbsp;MB each.
            </p>
            <Badge tone={allReady ? "success" : "neutral"}>
              <FileCheck2 className="size-3" />
              {allReady ? "Ready to submit" : `${outstanding.length - readyCount} remaining`}
            </Badge>
          </div>
          <p className="mt-1.5 text-[0.72rem] text-ink-soft">
            Selected files stay on this device until submission, then upload
            directly to our secure private storage.
          </p>
        </div>
      )}

      <ul className="space-y-3">
        {rows.map((row) => (
          <UploadItem
            key={row.requestId}
            row={row}
            file={files[row.requestId] ?? null}
            onFile={(file) => chooseFile(row.requestId, file)}
            onRemove={() => removeFile(row.requestId)}
          />
        ))}
      </ul>

      {outstanding.length > 0 && (
        <section className="rounded-2xl border border-brand-red/20 bg-[linear-gradient(135deg,rgba(229,72,63,0.07),rgba(19,152,235,0.04))] p-4 sm:flex sm:items-center sm:justify-between sm:gap-5">
          <div>
            <h2 className="font-display text-base font-bold text-ink">
              Submit all documents together
            </h2>
            <p className="mt-1 text-[0.76rem] leading-relaxed text-ink-soft">
              Check every file first. After submission, files are locked unless
              our team requests a correction.
            </p>
          </div>
          <Button
            type="button"
            className="mt-3 w-full shrink-0 sm:mt-0 sm:w-auto"
            disabled={!allReady}
            onClick={() => setConfirmOpen(true)}
          >
            <FileCheck2 /> Review and submit
          </Button>
        </section>
      )}

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Submit documents for review?"
        description={`You are about to submit ${outstanding.length} document${outstanding.length === 1 ? "" : "s"}.`}
        confirmLabel="Submit documents"
        onConfirm={submit}
      >
        <div className="space-y-3">
          <div className="rounded-xl border border-warn/30 bg-warn/10 px-3.5 py-3 text-[0.8rem] leading-relaxed text-ink">
            <p className="font-semibold">You cannot change these files after submission.</p>
            <p className="mt-1 text-ink-soft">
              You can upload a replacement only if our review team asks you to
              correct a document.
            </p>
          </div>
          <ul className="max-h-48 space-y-1.5 overflow-y-auto">
            {outstanding.map((row) => (
              <li
                key={row.requestId}
                className="flex items-center justify-between gap-3 rounded-lg bg-surface-muted/60 px-3 py-2 text-[0.75rem]"
              >
                <span className="font-medium text-ink">
                  {DOCUMENT_TYPE_LABELS[row.documentType]}
                </span>
                <span className="max-w-[55%] truncate text-ink-soft">
                  {files[row.requestId]?.name}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </ConfirmDialog>
    </div>
  );
}

function UploadItem({
  row,
  file,
  onFile,
  onRemove,
}: {
  row: UploadRow;
  file: File | null;
  onFile: (file: File) => void;
  onRemove: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const canSelect =
    row.status === "REQUESTED" || row.status === "REUPLOAD_REQUIRED";

  return (
    <li className="rounded-xl border border-line bg-surface px-4 py-3.5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-[0.9rem] font-semibold text-ink">
              {DOCUMENT_TYPE_LABELS[row.documentType]}
            </h3>
            <StatusChip status={row.status} staged={Boolean(file)} />
          </div>

          {row.requestNote && (
            <p className="mt-1 text-[0.78rem] leading-relaxed text-ink-soft">
              {row.requestNote}
            </p>
          )}

          {row.status === "REUPLOAD_REQUIRED" && row.rejectionReason && (
            <p className="mt-2 rounded-lg border border-warn/30 bg-warn/8 px-3 py-2 text-[0.8rem] leading-relaxed text-ink">
              <span className="font-semibold">Needs correcting:</span>{" "}
              {row.rejectionReason}
            </p>
          )}

          {file ? (
            <div className="mt-2 rounded-lg border border-brand-blue/25 bg-brand-blue/5 px-3 py-2">
              <p className="truncate text-[0.78rem] font-medium text-ink">{file.name}</p>
              <p className="mt-0.5 text-[0.68rem] text-ink-soft">
                {formatBytes(file.size)} · selected locally, not submitted yet
              </p>
            </div>
          ) : (
            row.latest && (
              <p className="mt-1.5 text-[0.72rem] text-ink-soft">
                {row.latest.fileName} · {formatBytes(row.latest.fileSize)} · uploaded{" "}
                {formatDateTime(row.latest.uploadedAt)}
                {row.latest.version > 1 && ` · version ${row.latest.version}`}
              </p>
            )
          )}
        </div>

        {canSelect && (
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <input
              ref={inputRef}
              type="file"
              accept={ACCEPT}
              className="sr-only"
              id={`file-${row.requestId}`}
              onChange={(event) => {
                const selected = event.target.files?.[0];
                if (selected) onFile(selected);
                event.target.value = "";
              }}
            />
            <Button
              type="button"
              size="sm"
              variant={file ? "outline" : row.status === "REUPLOAD_REQUIRED" ? "primary" : "outline"}
              onClick={() => inputRef.current?.click()}
            >
              {file ? <RefreshCw /> : <Upload />}
              {file ? "Replace" : row.latest ? "Choose replacement" : "Choose file"}
            </Button>
            {file && (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="text-danger hover:bg-danger/5 hover:text-danger"
                onClick={onRemove}
              >
                <Trash2 /> Remove
              </Button>
            )}
          </div>
        )}
      </div>
    </li>
  );
}

function StatusChip({
  status,
  staged,
}: {
  status: DocumentStatus;
  staged: boolean;
}) {
  if (staged) {
    return (
      <Badge tone="info">
        <FileCheck2 className="size-3" aria-hidden="true" />
        Ready to submit
      </Badge>
    );
  }
  if (status === "APPROVED") {
    return (
      <Badge tone="success">
        <CheckCircle2 className="size-3" aria-hidden="true" />
        Approved
      </Badge>
    );
  }
  if (status === "REUPLOAD_REQUIRED") {
    return (
      <Badge tone="warn">
        <CircleAlert className="size-3" aria-hidden="true" />
        Correction needed
      </Badge>
    );
  }
  if (status === "REQUESTED") {
    return <Badge tone="neutral">File needed</Badge>;
  }
  return (
    <Badge tone="info">
      <Clock className="size-3" aria-hidden="true" />
      {DOCUMENT_STATUS_LABELS[status]}
    </Badge>
  );
}
