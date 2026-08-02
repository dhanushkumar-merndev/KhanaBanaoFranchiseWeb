"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, CircleAlert, Clock, Upload } from "lucide-react";
import { toast } from "sonner";
import { uploadDocument } from "@/app/actions/documents";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DOCUMENT_TYPE_LABELS, type DocumentType } from "@/lib/domain/enums";
import { DOCUMENT_STATUS_LABELS } from "@/lib/domain/status";
import { formatBytes, formatDateTime } from "@/lib/format";
import type { DocumentStatus } from "@/lib/domain/enums";

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

export function UploadList({
  token,
  rows,
}: {
  token: string;
  rows: UploadRow[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);

  const outstanding = rows.filter(
    (row) => row.status === "REQUESTED" || row.status === "REUPLOAD_REQUIRED",
  );

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
        <p className="rounded-xl border border-line bg-surface px-4 py-3 text-[0.82rem] leading-relaxed text-ink-soft">
          <strong className="text-ink">
            {outstanding.length} document{outstanding.length === 1 ? "" : "s"}
          </strong>{" "}
          still needed. PDF, JPG, PNG or WebP, up to 10&nbsp;MB each.
        </p>
      )}

      <ul className="space-y-3">
        {rows.map((row) => (
          <UploadItem
            key={row.requestId}
            token={token}
            row={row}
            busy={busy === row.requestId}
            onBusyChange={(value) => setBusy(value ? row.requestId : null)}
            onUploaded={() => router.refresh()}
          />
        ))}
      </ul>
    </div>
  );
}

function UploadItem({
  token,
  row,
  busy,
  onBusyChange,
  onUploaded,
}: {
  token: string;
  row: UploadRow;
  busy: boolean;
  onBusyChange: (busy: boolean) => void;
  onUploaded: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  const canUpload =
    row.status === "REQUESTED" || row.status === "REUPLOAD_REQUIRED";

  const onFile = async (file: File) => {
    onBusyChange(true);
    try {
      const formData = new FormData();
      formData.set("requestId", row.requestId);
      formData.set("file", file);

      const result = await uploadDocument(token, formData);
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success(`${result.data.documentType} uploaded.`);
      onUploaded();
    } finally {
      onBusyChange(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <li className="rounded-xl border border-line bg-surface px-4 py-3.5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-[0.9rem] font-semibold text-ink">
              {DOCUMENT_TYPE_LABELS[row.documentType]}
            </h3>
            <StatusChip status={row.status} />
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

          {row.latest && (
            <p className="mt-1.5 text-[0.72rem] text-ink-soft">
              {row.latest.fileName} · {formatBytes(row.latest.fileSize)} ·
              uploaded {formatDateTime(row.latest.uploadedAt)}
              {row.latest.version > 1 && ` · version ${row.latest.version}`}
            </p>
          )}
        </div>

        {canUpload && (
          <div className="shrink-0">
            <input
              ref={inputRef}
              type="file"
              accept={ACCEPT}
              className="sr-only"
              id={`file-${row.requestId}`}
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void onFile(file);
              }}
            />
            <Button
              type="button"
              size="sm"
              variant={row.status === "REUPLOAD_REQUIRED" ? "primary" : "outline"}
              loading={busy}
              onClick={() => inputRef.current?.click()}
            >
              <Upload />
              {row.latest ? "Replace" : "Upload"}
            </Button>
          </div>
        )}
      </div>
    </li>
  );
}

function StatusChip({ status }: { status: DocumentStatus }) {
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
        Re-upload needed
      </Badge>
    );
  }
  if (status === "REQUESTED") {
    return <Badge tone="neutral">Not yet uploaded</Badge>;
  }
  return (
    <Badge tone="info">
      <Clock className="size-3" aria-hidden="true" />
      {DOCUMENT_STATUS_LABELS[status]}
    </Badge>
  );
}
