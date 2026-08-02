"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Download, ExternalLink, FileSignature, Upload } from "lucide-react";
import { toast } from "sonner";
import { advanceAgreement, getAgreementUrl, uploadAgreement } from "@/app/actions/agreements";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmailConfirmDialog } from "@/components/ui/email-confirm-dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/feedback";
import { Field, Textarea } from "@/components/ui/field";
import { AGREEMENT_STATUS_LABELS, agreementStatusTone } from "@/lib/domain/status";
import { AGREEMENT_STATUSES, type AgreementStatus } from "@/lib/domain/enums";
import { formatDateTime } from "@/lib/format";
import type { AgreementDetail } from "@/lib/data/pipeline";

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
  agreement,
  isAdmin,
}: {
  leadId: string;
  agreement: AgreementDetail | null;
  isAdmin: boolean;
}) {
  const [advanceOpen, setAdvanceOpen] = useState(false);
  const [note, setNote] = useState("");
  const [opening, setOpening] = useState<"view" | "download" | null>(null);

  const target = agreement ? nextStatus(agreement.status) : null;

  const openFile = async (download: boolean) => {
    if (!agreement) return;
    setOpening(download ? "download" : "view");
    try {
      const result = await getAgreementUrl(agreement.id, download);
      if (result.ok) window.open(result.data.url, "_blank", "noopener");
      else toast.error(result.message);
    } finally {
      setOpening(null);
    }
  };

  if (!agreement) {
    return (
      <EmptyState
        title="No agreement yet"
        body={
          isAdmin
            ? "Upload the franchise agreement PDF to start the signing sequence."
            : "An administrator uploads the agreement once the franchise is approved."
        }
        icon={FileSignature}
        action={isAdmin ? <UploadAgreementButton leadId={leadId} /> : undefined}
      />
    );
  }

  return (
    <div className="space-y-4">
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
              <>
                <Button
                  size="sm"
                  variant="outline"
                  loading={opening === "view"}
                  onClick={() => void openFile(false)}
                >
                  <ExternalLink />
                  View
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  loading={opening === "download"}
                  onClick={() => void openFile(true)}
                  aria-label="Download agreement"
                >
                  <Download />
                </Button>
              </>
            )}
            {isAdmin && <UploadAgreementButton leadId={leadId} replace />}
            {isAdmin && target && (
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
              ? "The applicant is emailed a note that their agreement is on its way."
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
        onChange={(event) => setFile(event.target.files?.[0] ?? null)}
      />
      <Button
        size="sm"
        variant={replace ? "ghost" : "primary"}
        onClick={() => inputRef.current?.click()}
      >
        <Upload />
        {replace ? "Replace" : "Upload agreement"}
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
            const formData = new FormData();
            formData.set("file", file);
            formData.set("notes", notes);
            const result = await uploadAgreement(leadId, formData);
            if (result.ok) router.refresh();
            return result;
          }}
        >
          <div className="space-y-3">
            <p className="text-[0.82rem] text-ink-soft">
              <span className="font-medium text-ink">{file.name}</span> — PDF only,
              up to 20&nbsp;MB.
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
