"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  Copy,
  Download,
  ExternalLink,
  FilePlus2,
  FileText,
  MessageSquarePlus,
  RotateCw,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import {
  addDocumentReviewNote,
  approveDocument,
  cancelDocumentRequest,
  getDocumentUrl,
  requestDocuments,
  requestDocumentReupload,
} from "@/app/actions/documents";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmailConfirmDialog } from "@/components/ui/email-confirm-dialog";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox, Field, Label, Textarea } from "@/components/ui/field";
import { EmptyState } from "@/components/ui/feedback";
import {
  DOCUMENT_TYPES,
  DOCUMENT_TYPE_LABELS,
  type DocumentType,
} from "@/lib/domain/enums";
import { DOCUMENT_STATUS_LABELS, documentStatusTone } from "@/lib/domain/status";
import { formatBytes, formatDateTime } from "@/lib/format";
import type { DocumentRow } from "@/lib/data/pipeline";

export function DocumentsTab({
  leadId,
  documents,
  hasApplication,
  canRequest,
  isAdmin,
}: {
  leadId: string;
  documents: DocumentRow[];
  hasApplication: boolean;
  canRequest: boolean;
  isAdmin: boolean;
}) {
  const [requestOpen, setRequestOpen] = useState(false);
  const [issuedUrl, setIssuedUrl] = useState<string | null>(null);

  const alreadyRequested = new Set(documents.map((row) => row.documentType));

  const requestButton = canRequest && hasApplication && (
    <Button size="sm" onClick={() => setRequestOpen(true)}>
      <FilePlus2 />
      Request documents
    </Button>
  );

  return (
    <div className="space-y-4">
      {documents.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-[0.82rem] text-ink-soft">
            {documents.filter((row) => row.requestStatus === "APPROVED").length} of{" "}
            {documents.length} approved
          </p>
          {requestButton}
        </div>
      )}

      {issuedUrl && <LinkBanner url={issuedUrl} />}

      {documents.length === 0 ? (
        <EmptyState
          title={
            hasApplication
              ? "No documents requested yet"
              : "The application comes first"
          }
          body={
            hasApplication
              ? "Choose only the documents this applicant actually needs to provide."
              : "Send the application link and wait for it to be submitted before requesting documents."
          }
          icon={FileText}
          action={requestButton || undefined}
        />
      ) : (
        <ul className="space-y-3">
          {documents.map((row) => (
            <DocumentCard
              key={row.requestId}
              row={row}
              isAdmin={isAdmin}
              onLinkIssued={setIssuedUrl}
            />
          ))}
        </ul>
      )}

      {requestOpen && (
        <RequestDialog
          leadId={leadId}
          alreadyRequested={alreadyRequested}
          onClose={() => setRequestOpen(false)}
          onIssued={setIssuedUrl}
        />
      )}
    </div>
  );
}

function LinkBanner({ url }: { url: string }) {
  return (
    <div className="rounded-xl border border-line bg-surface-muted/60 px-4 py-3">
      <p className="text-[0.7rem] font-semibold uppercase tracking-wide text-ink-soft">
        Applicant upload link
      </p>
      <div className="mt-1.5 flex flex-wrap items-center gap-2">
        <code className="min-w-0 flex-1 truncate rounded-lg border border-line bg-surface px-2.5 py-1.5 text-[0.72rem] text-ink">
          {url}
        </code>
        <Button
          size="sm"
          variant="outline"
          onClick={async () => {
            await navigator.clipboard.writeText(url);
            toast.success("Link copied.");
          }}
        >
          <Copy />
          Copy
        </Button>
      </div>
    </div>
  );
}

function DocumentCard({
  row,
  isAdmin,
  onLinkIssued,
}: {
  row: DocumentRow;
  isAdmin: boolean;
  onLinkIssued: (url: string) => void;
}) {
  const [approveOpen, setApproveOpen] = useState(false);
  const [reuploadOpen, setReuploadOpen] = useState(false);
  const [noteOpen, setNoteOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [opening, setOpening] = useState<"view" | "download" | null>(null);

  const document = row.document;
  const status = document?.status ?? row.requestStatus;
  const approved = status === "APPROVED";

  const openFile = async (download: boolean) => {
    if (!document) return;
    setOpening(download ? "download" : "view");
    try {
      const result = await getDocumentUrl(document.id, download);
      if (result.ok) window.open(result.data.url, "_blank", "noopener");
      else toast.error(result.message);
    } finally {
      setOpening(null);
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
            <StatusBadge
              label={DOCUMENT_STATUS_LABELS[status]}
              tone={documentStatusTone(status)}
            />
            {document && document.version > 1 && (
              <span className="text-[0.7rem] text-ink-soft">
                version {document.version}
              </span>
            )}
          </div>

          {row.requestNote && (
            <p className="mt-1 text-[0.78rem] text-ink-soft">{row.requestNote}</p>
          )}

          {document ? (
            <p className="mt-1.5 text-[0.72rem] text-ink-soft">
              {document.fileName} · {formatBytes(document.fileSize)} · uploaded{" "}
              {formatDateTime(document.uploadedAt)}
              {document.reviewedByName &&
                ` · reviewed by ${document.reviewedByName}`}
            </p>
          ) : (
            <p className="mt-1.5 text-[0.72rem] text-ink-soft">
              Requested {formatDateTime(row.requestedAt)} — nothing uploaded yet.
            </p>
          )}

          {document?.rejectionReason && status === "REUPLOAD_REQUIRED" && (
            <p className="mt-2 rounded-lg border border-warn/30 bg-warn/8 px-3 py-2 text-[0.8rem] leading-relaxed text-ink">
              <span className="font-semibold">Re-upload requested:</span>{" "}
              {document.rejectionReason}
            </p>
          )}

          {row.history.length > 0 && (
            <details className="mt-2">
              <summary className="cursor-pointer text-[0.72rem] font-medium text-ink-soft hover:text-ink">
                Review history ({row.history.length})
              </summary>
              <ul className="mt-1.5 space-y-1.5 border-l border-line pl-3">
                {row.history.map((entry) => (
                  <li key={entry.id} className="text-[0.75rem] text-ink-soft">
                    <span className="font-medium text-ink">
                      {DOCUMENT_STATUS_LABELS[entry.decision]}
                    </span>
                    {entry.note && ` — ${entry.note}`}
                    <span className="ml-1 opacity-70">
                      ({entry.reviewerName ?? "System"},{" "}
                      {formatDateTime(entry.createdAt)})
                    </span>
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>

        <div className="flex shrink-0 flex-wrap gap-1.5">
          {document && (
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
                aria-label="Download"
              >
                <Download />
              </Button>
            </>
          )}

          {isAdmin && document && !approved && (
            <>
              <Button size="sm" variant="success" onClick={() => setApproveOpen(true)}>
                <Check />
                Approve
              </Button>
              <Button size="sm" variant="outline" onClick={() => setReuploadOpen(true)}>
                <RotateCw />
                Re-upload
              </Button>
            </>
          )}

          {isAdmin && document && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setNoteOpen(true)}
              aria-label="Add review note"
            >
              <MessageSquarePlus />
            </Button>
          )}

          {isAdmin && !approved && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setCancelOpen(true)}
              aria-label="Cancel this request"
            >
              <Trash2 />
            </Button>
          )}
        </div>
      </div>

      {document && (
        <>
          <EmailConfirmDialog
            open={approveOpen}
            onOpenChange={setApproveOpen}
            title={`Approve ${DOCUMENT_TYPE_LABELS[row.documentType]}?`}
            description="Approved documents are locked — the applicant can no longer replace this one."
            variant="success"
            confirmLabel="Approve"
            withoutEmailLabel="Approve without email"
            successMessage="Document approved."
            onConfirm={(sendEmail) => approveDocument(document.id, sendEmail)}
          />

          <EmailConfirmDialog
            open={reuploadOpen}
            onOpenChange={(open) => {
              setReuploadOpen(open);
              if (!open) setReason("");
            }}
            title={`Request a new ${DOCUMENT_TYPE_LABELS[row.documentType]}?`}
            description="A fresh upload link is generated. Documents already approved stay locked."
            confirmLabel="Request re-upload"
            withoutEmailLabel="Request without email"
            disabled={reason.trim().length < 5}
            successMessage="Re-upload requested."
            onConfirm={async (sendEmail) => {
              const result = await requestDocumentReupload(
                document.id,
                reason,
                sendEmail,
              );
              if (result.ok) onLinkIssued(result.data.url);
              return result;
            }}
          >
            <Field
              label="What needs correcting?"
              htmlFor={`reupload-${row.requestId}`}
              required
              hint="Shown to the applicant on their upload page and in the email."
            >
              <Textarea
                id={`reupload-${row.requestId}`}
                rows={3}
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                placeholder={`e.g. The ${DOCUMENT_TYPE_LABELS[row.documentType]} image is cut off — please re-scan the full document.`}
              />
            </Field>
          </EmailConfirmDialog>

          <ReviewNoteDialog
            open={noteOpen}
            onOpenChange={setNoteOpen}
            documentId={document.id}
          />
        </>
      )}

      <ConfirmDialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        variant="danger"
        title={`Cancel the request for ${DOCUMENT_TYPE_LABELS[row.documentType]}?`}
        confirmLabel="Cancel request"
        successMessage="Request cancelled."
        onConfirm={() => cancelDocumentRequest(row.requestId)}
      >
        <p className="text-[0.82rem] leading-relaxed text-ink-soft">
          It disappears from the applicant&apos;s upload page. Anything they
          already uploaded for it is removed from the review queue.
        </p>
      </ConfirmDialog>
    </li>
  );
}

function ReviewNoteDialog({
  open,
  onOpenChange,
  documentId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentId: string;
}) {
  const [note, setNote] = useState("");

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) setNote("");
      }}
      title="Add a review note"
      confirmLabel="Save note"
      successMessage="Note saved."
      onConfirm={() => addDocumentReviewNote(documentId, note)}
    >
      <Field
        label="Note"
        htmlFor={`note-${documentId}`}
        hint="Internal only — the applicant never sees this."
      >
        <Textarea
          id={`note-${documentId}`}
          rows={3}
          value={note}
          onChange={(event) => setNote(event.target.value)}
        />
      </Field>
    </ConfirmDialog>
  );
}

function RequestDialog({
  leadId,
  alreadyRequested,
  onClose,
  onIssued,
}: {
  leadId: string;
  alreadyRequested: Set<DocumentType>;
  onClose: () => void;
  onIssued: (url: string) => void;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<DocumentType>>(new Set());
  const [note, setNote] = useState("");
  const [pending, setPending] = useState<"email" | "silent" | null>(null);

  const toggle = (type: DocumentType) => {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  };

  const submit = async (sendEmail: boolean) => {
    setPending(sendEmail ? "email" : "silent");
    try {
      const result = await requestDocuments(
        leadId,
        [...selected],
        note,
        sendEmail,
      );
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      onIssued(result.data.url);
      toast.success(
        sendEmail && !result.data.emailSent
          ? "Documents requested, but the email did not send. Copy the link and share it directly."
          : `Requested ${selected.size} document${selected.size === 1 ? "" : "s"}.`,
      );
      router.refresh();
      onClose();
    } finally {
      setPending(null);
    }
  };

  const busy = pending !== null;

  return (
    <Dialog open onOpenChange={(open) => !open && !busy && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Request documents</DialogTitle>
          <DialogDescription>
            Choose only what this applicant actually needs to provide — they see
            exactly this list and nothing else.
          </DialogDescription>
        </DialogHeader>

        <DialogBody className="space-y-4">
          <fieldset>
            <legend className="mb-2 text-[0.78rem] font-semibold text-ink">
              Documents
            </legend>
            <div className="grid gap-1.5 sm:grid-cols-2">
              {DOCUMENT_TYPES.map((type) => {
                const requested = alreadyRequested.has(type);
                return (
                  <Label
                    key={type}
                    htmlFor={`doc-${type}`}
                    className="mb-0 flex cursor-pointer items-center gap-2.5 rounded-lg border border-line px-3 py-2 font-normal transition hover:bg-surface-muted has-[:checked]:border-brand-red/50 has-[:checked]:bg-brand-red/5"
                  >
                    <Checkbox
                      id={`doc-${type}`}
                      checked={selected.has(type)}
                      disabled={requested}
                      onChange={() => toggle(type)}
                    />
                    <span className="text-[0.8rem] text-ink">
                      {DOCUMENT_TYPE_LABELS[type]}
                      {requested && (
                        <span className="block text-[0.68rem] text-ink-soft">
                          Already requested
                        </span>
                      )}
                    </span>
                  </Label>
                );
              })}
            </div>
          </fieldset>

          <Field
            label="Note to the applicant"
            htmlFor="doc-note"
            hint="Optional. Appears on their upload page next to the list."
          >
            <Textarea
              id="doc-note"
              rows={2}
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="e.g. Please make sure all four corners of each document are visible."
            />
          </Field>
        </DialogBody>

        <DialogFooter className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="secondary"
            loading={pending === "silent"}
            disabled={busy || selected.size === 0}
            onClick={() => void submit(false)}
          >
            Request without email
          </Button>
          <Button
            type="button"
            className="sm:col-span-2"
            loading={pending === "email"}
            disabled={busy || selected.size === 0}
            onClick={() => void submit(true)}
          >
            Request and send email
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
