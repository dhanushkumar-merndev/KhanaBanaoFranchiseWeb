"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Download, FileSignature, Upload, Wand2 } from "lucide-react";
import { toast } from "sonner";
import {
  advanceAgreement,
  startAgreementDocument,
  discardAgreementUpload,
  getAgreementUrl,
  prepareAgreementUpload,
  uploadAgreement,
} from "@/app/actions/agreements";
import {
  AgreementDocumentEditor,
  type AgreementDocumentState,
} from "@/components/leads/agreement-document-editor";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmailConfirmDialog } from "@/components/ui/email-confirm-dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/feedback";
import { Field, Textarea } from "@/components/ui/field";
import { AGREEMENT_STATUS_LABELS, agreementStatusTone } from "@/lib/domain/status";
import {
  AGREEMENT_STATUSES,
  LEAD_STATUSES,
  STORAGE_BUCKETS,
  type AgreementStatus,
  type LeadStatus,
} from "@/lib/domain/enums";
import { formatDateTime } from "@/lib/format";
import type { AgreementDetail } from "@/lib/data/pipeline";
import { createClient } from "@/lib/supabase/client";
import {
  MAX_DOCUMENT_UPLOAD_BYTES,
  MAX_DOCUMENT_UPLOAD_MB,
} from "@/lib/upload-limits";

/** The stage after the current one — agreements only ever move forward. */
function nextStatus(current: AgreementStatus): AgreementStatus | null {
  const index = AGREEMENT_STATUSES.indexOf(current);
  return index >= 0 && index < AGREEMENT_STATUSES.length - 1
    ? AGREEMENT_STATUSES[index + 1]
    : null;
}

const ADVANCE_LABEL: Record<AgreementStatus, string> = {
  PENDING: "Mark uploaded",
  UPLOADED: "Mark as sent",
  SENT: "Mark applicant signed",
  SIGNED_BY_APPLICANT: "Mark company signed",
  SIGNED_BY_COMPANY: "Mark completed",
  COMPLETED: "Completed",
};

export function AgreementTab({
  leadId,
  leadStatus,
  agreement,
  agreementDocument,
  isAdmin,
  isAssignedMember,
}: {
  leadId: string;
  leadStatus: LeadStatus;
  agreement: AgreementDetail | null;
  agreementDocument: AgreementDocumentState | null;
  isAdmin: boolean;
  /** The member this lead is assigned to may prepare and send its agreement. */
  isAssignedMember: boolean;
}) {
  const [advanceOpen, setAdvanceOpen] = useState(false);
  const [note, setNote] = useState("");
  const [downloadingFile, setDownloadingFile] = useState(false);

  const target = agreement ? nextStatus(agreement.status) : null;
  const stageOpen =
    leadStatus !== "REJECTED" &&
    LEAD_STATUSES.indexOf(leadStatus) >=
      LEAD_STATUSES.indexOf("FRANCHISE_APPROVED");
  const canManageAgreement = isAdmin && stageOpen;
  // Preparing and sending the generated document is open to the assigned
  // member; the signed-copy upload and the status sequence stay with admins.
  const canPrepareDocument = (isAdmin || isAssignedMember) && stageOpen;

  const downloadFile = async () => {
    if (!agreement) return;
    setDownloadingFile(true);
    try {
      const result = await getAgreementUrl(agreement.id, true);
      if (result.ok) window.location.assign(result.data.url);
      else toast.error(result.message);
    } finally {
      setDownloadingFile(false);
    }
  };

  if (!agreement) {
    return (
      <EmptyState
        title="No agreement yet"
        body={
          canPrepareDocument
            ? "Prepare the agreement from this applicant's own answers, or upload a signed PDF you already have."
            : "The agreement opens after document review and franchise approval."
        }
        icon={FileSignature}
        action={
          canPrepareDocument ? (
            <div className="flex flex-wrap justify-center gap-2">
              <PrepareAgreementButton leadId={leadId} />
              {canManageAgreement && <UploadAgreementButton leadId={leadId} />}
            </div>
          ) : undefined
        }
      />
    );
  }

  return (
    <div className="space-y-4">
      {canPrepareDocument && agreementDocument && (
        <AgreementDocumentEditor state={agreementDocument} />
      )}

      <Card>
        <CardHeader className="flex-row items-start justify-between gap-3">
          <div>
            <CardTitle>Agreement {agreement.agreement_number}</CardTitle>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <StatusBadge
                label={AGREEMENT_STATUS_LABELS[agreement.status]}
                tone={agreementStatusTone(agreement.status)}
              />
              {agreement.version > 1 && (
                <span className="text-[0.75rem] text-ink-soft">
                  version {agreement.version}
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {agreement.hasFile && (
              <Button
                size="sm"
                variant="outline"
                loading={downloadingFile}
                onClick={() => void downloadFile()}
              >
                <Download />
                Download agreement
              </Button>
            )}
            {canManageAgreement && <UploadAgreementButton leadId={leadId} replace />}
            {canManageAgreement && target && (
              <Button size="sm" onClick={() => setAdvanceOpen(true)}>
                {ADVANCE_LABEL[agreement.status]}
              </Button>
            )}
          </div>
        </CardHeader>

        <CardContent>
          <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Stamp label="Uploaded" value={agreement.created_at} />
            <Stamp label="Sent" value={agreement.sent_at} />
            <Stamp label="Applicant signed" value={agreement.applicant_signed_at} />
            <Stamp label="Company signed" value={agreement.company_signed_at} />
            <Stamp label="Completed" value={agreement.completed_at} />
            <div>
              <dt className="text-[0.68rem] font-semibold uppercase tracking-wide text-ink-soft">
                File
              </dt>
              <dd className="mt-0.5 truncate text-[0.85rem] text-ink">
                {agreement.file_name ?? (
                  <span className="text-ink-soft/60">Not uploaded</span>
                )}
              </dd>
            </div>
            <div>
              <dt className="text-[0.68rem] font-semibold uppercase tracking-wide text-ink-soft">
                Uploaded by
              </dt>
              <dd className="mt-0.5 text-[0.85rem] text-ink">
                {agreement.createdByName ?? "—"}
              </dd>
            </div>
          </dl>

          {agreement.notes && (
            <p className="mt-4 whitespace-pre-wrap rounded-lg bg-surface-muted/60 px-3 py-2.5 text-[0.82rem] leading-relaxed text-ink">
              {agreement.notes}
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Signing sequence</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="space-y-2.5">
            {AGREEMENT_STATUSES.map((status) => {
              const index = AGREEMENT_STATUSES.indexOf(status);
              const currentIndex = AGREEMENT_STATUSES.indexOf(agreement.status);
              const done = index <= currentIndex;
              return (
                <li key={status} className="flex items-center gap-3">
                  <span
                    aria-hidden="true"
                    className={
                      done
                        ? "size-2.5 shrink-0 rounded-full bg-ok"
                        : "size-2.5 shrink-0 rounded-full border border-line bg-surface"
                    }
                  />
                  <span
                    className={
                      done
                        ? "text-[0.85rem] font-medium text-ink"
                        : "text-[0.85rem] text-ink-soft"
                    }
                  >
                    {AGREEMENT_STATUS_LABELS[status]}
                  </span>
                  {index === currentIndex && (
                    <span className="text-[0.7rem] font-semibold uppercase tracking-wide text-brand-crimson">
                      current
                    </span>
                  )}
                </li>
              );
            })}
          </ol>
        </CardContent>
      </Card>

      {target && (
        <EmailConfirmDialog
          open={advanceOpen}
          onOpenChange={(open) => {
            setAdvanceOpen(open);
            if (!open) setNote("");
          }}
          title={`${ADVANCE_LABEL[agreement.status]}?`}
          description={
            target === "SENT"
              ? "The applicant receives the personalised agreement as one PDF attachment."
              : "Recorded against the agreement with a timestamp. No email is sent for this stage."
          }
          confirmLabel={AGREEMENT_STATUS_LABELS[target]}
          withoutEmailLabel={
            target === "SENT" ? "Mark sent without email" : "Record this stage"
          }
          successMessage={`Agreement moved to ${AGREEMENT_STATUS_LABELS[target].toLowerCase()}.`}
          onConfirm={(sendEmail) =>
            advanceAgreement(agreement.id, target, sendEmail, note)
          }
        >
          <Field label="Note" htmlFor="agreement-note" hint="Optional.">
            <Textarea
              id="agreement-note"
              rows={2}
              value={note}
              onChange={(event) => setNote(event.target.value)}
            />
          </Field>
        </EmailConfirmDialog>
      )}
    </div>
  );
}

function Stamp({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <dt className="text-[0.68rem] font-semibold uppercase tracking-wide text-ink-soft">
        {label}
      </dt>
      <dd className="mt-0.5 text-[0.85rem] text-ink">
        {value ? formatDateTime(value) : <span className="text-ink-soft/60">—</span>}
      </dd>
    </div>
  );
}

function UploadAgreementButton({
  leadId,
  replace,
}: {
  leadId: string;
  replace?: boolean;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [notes, setNotes] = useState("");

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf"
        className="sr-only"
        onChange={(event) => {
          const selected = event.target.files?.[0] ?? null;
          if (selected && selected.size > MAX_DOCUMENT_UPLOAD_BYTES) {
            toast.error(`The agreement must be ${MAX_DOCUMENT_UPLOAD_MB} MB or smaller.`);
            event.target.value = "";
            setFile(null);
            return;
          }
          setFile(selected);
        }}
      />
      <Button
        size="sm"
        variant={replace ? "ghost" : "primary"}
        onClick={() => inputRef.current?.click()}
      >
        <Upload />
        {replace ? "Replace" : `Upload agreement (max ${MAX_DOCUMENT_UPLOAD_MB} MB)`}
      </Button>

      {file && (
        <ConfirmDialog
          open
          onOpenChange={(open) => {
            if (!open) {
              setFile(null);
              setNotes("");
              if (inputRef.current) inputRef.current.value = "";
            }
          }}
          title="Upload this agreement?"
          confirmLabel="Upload"
          successMessage="Agreement uploaded."
          onConfirm={async () => {
            const prepared = await prepareAgreementUpload(leadId, {
              fileName: file.name,
              fileSize: file.size,
              mimeType: file.type,
            });
            if (!prepared.ok) return prepared;

            try {
              const { error } = await createClient().storage
                .from(STORAGE_BUCKETS.agreements)
                .uploadToSignedUrl(
                  prepared.data.path,
                  prepared.data.uploadToken,
                  file,
                  { cacheControl: "3600", contentType: file.type },
                );
              if (error) {
                await discardAgreementUpload(leadId, prepared.data.receipt);
                return {
                  ok: false,
                  message: `The agreement could not be uploaded: ${error.message}`,
                };
              }

              const result = await uploadAgreement(
                leadId,
                prepared.data.receipt,
                notes,
              );
              if (!result.ok) {
                await discardAgreementUpload(leadId, prepared.data.receipt);
                return result;
              }
              router.refresh();
              return result;
            } catch (error) {
              await discardAgreementUpload(leadId, prepared.data.receipt);
              return {
                ok: false,
                message:
                  error instanceof Error
                    ? error.message
                    : "The agreement could not be uploaded.",
              };
            }
          }}
        >
          <div className="space-y-3">
            <p className="text-[0.82rem] text-ink-soft">
              <span className="font-medium text-ink">{file.name}</span> — PDF only,
              up to {MAX_DOCUMENT_UPLOAD_MB}&nbsp;MB.
            </p>
            <Field label="Notes" htmlFor="agreement-upload-notes">
              <Textarea
                id="agreement-upload-notes"
                rows={2}
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Anything to record about this version."
              />
            </Field>
          </div>
        </ConfirmDialog>
      )}
    </>
  );
}


/**
 * Creates the agreement record so there is somewhere to hold the field values.
 * Before this existed an agreement only came into being on PDF upload.
 */
function PrepareAgreementButton({ leadId }: { leadId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  return (
    <Button
      size="sm"
      loading={busy}
      onClick={async () => {
        setBusy(true);
        try {
          const result = await startAgreementDocument(leadId);
          if (result.ok) {
            toast.success("Agreement prepared from the application.");
            router.refresh();
          } else {
            toast.error(result.message);
          }
        } finally {
          setBusy(false);
        }
      }}
    >
      <Wand2 />
      Prepare agreement
    </Button>
  );
}
