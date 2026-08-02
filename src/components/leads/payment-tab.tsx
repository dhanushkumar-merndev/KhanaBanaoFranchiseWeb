"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  BadgeIndianRupee,
  Check,
  Download,
  ExternalLink,
  Upload,
  X,
} from "lucide-react";
import { toast } from "sonner";
import {
  approvePayment,
  discardPaymentProofUpload,
  getPaymentProofUrl,
  preparePaymentProofUpload,
  recordPayment,
  rejectPayment,
} from "@/app/actions/payments";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EmailConfirmDialog } from "@/components/ui/email-confirm-dialog";
import { EmptyState } from "@/components/ui/feedback";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import {
  PAYMENT_MODES,
  PAYMENT_MODE_LABELS,
  LEAD_STATUS_LABELS,
  STORAGE_BUCKETS,
  type AgreementStatus,
  type LeadStatus,
} from "@/lib/domain/enums";
import { PAYMENT_STATUS_LABELS, paymentStatusTone } from "@/lib/domain/status";
import { formatDate, formatDateTime } from "@/lib/format";
import { franchiseFee } from "@/lib/site";
import { formatCurrency } from "@/lib/utils";
import type { PaymentDetail } from "@/lib/data/pipeline";
import { createClient } from "@/lib/supabase/client";

export function PaymentTab({
  leadId,
  leadStatus,
  agreementStatus,
  payments,
  canRecord,
  isAdmin,
}: {
  leadId: string;
  leadStatus: LeadStatus;
  agreementStatus: AgreementStatus | null;
  payments: PaymentDetail[];
  canRecord: boolean;
  isAdmin: boolean;
}) {
  const [recordOpen, setRecordOpen] = useState(false);

  const open = payments.find((payment) => payment.status !== "APPROVED");
  const approved = payments.find((payment) => payment.status === "APPROVED");

  // Recording is only meaningful once the agreement is done and before the fee
  // has been accepted.
  const stageAllows =
    agreementStatus === "COMPLETED" &&
    (leadStatus === "AGREEMENT_COMPLETED" ||
      leadStatus === "PAYMENT_PENDING" ||
      leadStatus === "PAYMENT_PROOF_SUBMITTED" ||
      leadStatus === "PAYMENT_REJECTED");

  const recordButton = canRecord && stageAllows && !approved && (
    <Button size="sm" onClick={() => setRecordOpen(true)}>
      <Upload />
      {open?.hasProof ? "Replace proof" : "Record payment"}
    </Button>
  );

  return (
    <div className="space-y-4">
      {payments.length === 0 ? (
        <EmptyState
          title="No payment recorded"
          body={
            stageAllows
              ? `The one-time franchise fee is ₹${franchiseFee.display}. Record it here with proof of transfer.`
              : agreementStatus === "COMPLETED"
                ? leadStatus === "DOCUMENTS_APPROVED"
                  ? "Documents are approved. Open the Application tab and approve the franchise territory and model to unlock Payment."
                  : `The agreement is complete, but this lead is still at ${LEAD_STATUS_LABELS[leadStatus].toLowerCase()}. Finish the earlier approval gates to open Payment.`
                : "The franchise fee is recorded once the agreement is completed."
          }
          icon={BadgeIndianRupee}
          action={recordButton || undefined}
        />
      ) : (
        <>
          {recordButton && (
            <div className="flex justify-end">{recordButton}</div>
          )}
          <ul className="space-y-3">
            {payments.map((payment) => (
              <PaymentCard key={payment.id} payment={payment} isAdmin={isAdmin} />
            ))}
          </ul>
        </>
      )}

      {recordOpen && (
        <RecordDialog leadId={leadId} onClose={() => setRecordOpen(false)} />
      )}
    </div>
  );
}

function PaymentCard({
  payment,
  isAdmin,
}: {
  payment: PaymentDetail;
  isAdmin: boolean;
}) {
  const [approveOpen, setApproveOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [opening, setOpening] = useState<"view" | "download" | null>(null);

  const openProof = async (download: boolean) => {
    setOpening(download ? "download" : "view");
    try {
      const result = await getPaymentProofUrl(payment.id, download);
      if (result.ok) window.open(result.data.url, "_blank", "noopener");
      else toast.error(result.message);
    } finally {
      setOpening(null);
    }
  };

  return (
    <li>
      <Card>
        <CardHeader className="flex-row items-start justify-between gap-3">
          <div>
            <CardTitle>{formatCurrency(payment.amount)}</CardTitle>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <StatusBadge
                label={PAYMENT_STATUS_LABELS[payment.status]}
                tone={paymentStatusTone(payment.status)}
              />
              <span className="text-[0.75rem] text-ink-soft">
                {PAYMENT_MODE_LABELS[payment.payment_mode]}
                {payment.payment_date && ` · ${formatDate(payment.payment_date)}`}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {payment.hasProof && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  loading={opening === "view"}
                  onClick={() => void openProof(false)}
                >
                  <ExternalLink />
                  Proof
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  loading={opening === "download"}
                  onClick={() => void openProof(true)}
                  aria-label="Download proof"
                >
                  <Download />
                </Button>
              </>
            )}

            {isAdmin && payment.status === "PROOF_SUBMITTED" && (
              <>
                <Button size="sm" variant="success" onClick={() => setApproveOpen(true)}>
                  <Check />
                  Approve
                </Button>
                <Button size="sm" variant="danger" onClick={() => setRejectOpen(true)}>
                  <X />
                  Reject
                </Button>
              </>
            )}
          </div>
        </CardHeader>

        <CardContent>
          <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Detail label="Reference" value={payment.reference_number} />
            <Detail label="Proof file" value={payment.proof_file_name} />
            <Detail
              label="Submitted"
              value={
                payment.submitted_at
                  ? `${formatDateTime(payment.submitted_at)}${payment.submittedByName ? ` by ${payment.submittedByName}` : ""}`
                  : null
              }
            />
            <Detail
              label="Reviewed"
              value={
                payment.reviewed_at
                  ? `${formatDateTime(payment.reviewed_at)}${payment.reviewedByName ? ` by ${payment.reviewedByName}` : ""}`
                  : null
              }
            />
          </dl>

          {payment.notes && (
            <p className="mt-3 whitespace-pre-wrap text-[0.82rem] leading-relaxed text-ink">
              {payment.notes}
            </p>
          )}

          {payment.status === "REJECTED" && payment.rejection_reason && (
            <p className="mt-3 rounded-lg border border-danger/25 bg-danger/5 px-3 py-2.5 text-[0.82rem] leading-relaxed text-ink">
              <span className="font-semibold text-danger">Rejected:</span>{" "}
              {payment.rejection_reason}
              <span className="mt-1 block text-ink-soft">
                Record a corrected proof to try again.
              </span>
            </p>
          )}
        </CardContent>
      </Card>

      <EmailConfirmDialog
        open={approveOpen}
        onOpenChange={setApproveOpen}
        title={`Approve ${formatCurrency(payment.amount)}?`}
        description="The lead moves straight on to franchise activation."
        variant="success"
        confirmLabel="Approve"
        withoutEmailLabel="Approve without email"
        successMessage="Payment approved."
        onConfirm={(sendEmail) => approvePayment(payment.id, sendEmail)}
      />

      <EmailConfirmDialog
        open={rejectOpen}
        onOpenChange={(open) => {
          setRejectOpen(open);
          if (!open) setReason("");
        }}
        title="Reject this payment proof?"
        description="The member can record a corrected proof afterwards."
        variant="danger"
        confirmLabel="Reject"
        withoutEmailLabel="Reject without email"
        disabled={reason.trim().length < 5}
        successMessage="Payment rejected."
        onConfirm={(sendEmail) => rejectPayment(payment.id, reason, sendEmail)}
      >
        <Field
          label="Reason"
          htmlFor={`pay-reject-${payment.id}`}
          required
          hint="Shown to the member on this page so they know what to fix."
        >
          <Textarea
            id={`pay-reject-${payment.id}`}
            rows={3}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="e.g. The transfer screenshot does not show the reference number."
          />
        </Field>
      </EmailConfirmDialog>
    </li>
  );
}

function Detail({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <dt className="text-[0.68rem] font-semibold uppercase tracking-wide text-ink-soft">
        {label}
      </dt>
      <dd className="mt-0.5 truncate text-[0.85rem] text-ink">
        {value ?? <span className="text-ink-soft/60">—</span>}
      </dd>
    </div>
  );
}

function RecordDialog({
  leadId,
  onClose,
}: {
  leadId: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPending(true);
    setErrors({});
    let uploadReceipt: string | null = null;
    try {
      const formData = new FormData(event.currentTarget);
      const proof = formData.get("proof");
      formData.delete("proof");

      if (proof instanceof File && proof.size > 0) {
        const prepared = await preparePaymentProofUpload(leadId, {
          fileName: proof.name,
          fileSize: proof.size,
          mimeType: proof.type,
        });
        if (!prepared.ok) {
          setErrors(prepared.fieldErrors ?? {});
          toast.error(prepared.message);
          return;
        }

        uploadReceipt = prepared.data.receipt;
        const { error } = await createClient().storage
          .from(STORAGE_BUCKETS.paymentProofs)
          .uploadToSignedUrl(
            prepared.data.path,
            prepared.data.uploadToken,
            proof,
            { cacheControl: "3600", contentType: proof.type },
          );
        if (error) {
          await discardPaymentProofUpload(leadId, uploadReceipt);
          uploadReceipt = null;
          setErrors({ proof: "Upload the proof again" });
          toast.error(`The payment proof could not be uploaded: ${error.message}`);
          return;
        }
        formData.set("proofReceipt", uploadReceipt);
      }

      const result = await recordPayment(leadId, formData);
      if (!result.ok) {
        if (uploadReceipt) {
          await discardPaymentProofUpload(leadId, uploadReceipt);
          uploadReceipt = null;
        }
        setErrors(result.fieldErrors ?? {});
        toast.error(result.message);
        return;
      }
      toast.success(
        result.data.status === "PROOF_SUBMITTED"
          ? "Payment proof submitted for approval."
          : "Payment recorded. Upload the proof when you have it.",
      );
      router.refresh();
      onClose();
    } catch (error) {
      if (uploadReceipt) {
        await discardPaymentProofUpload(leadId, uploadReceipt);
      }
      toast.error(
        error instanceof Error ? error.message : "The payment could not be saved.",
      );
    } finally {
      setPending(false);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && !pending && onClose()}>
      <DialogContent className="max-w-lg">
        <form onSubmit={submit}>
          <DialogHeader>
            <DialogTitle>Record the franchise fee</DialogTitle>
            <DialogDescription>
              Money moves outside this system, so the proof of transfer is what
              makes the record trustworthy.
            </DialogDescription>
          </DialogHeader>

          <DialogBody className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Amount (₹)" htmlFor="pay-amount" required error={errors.amount}>
                <Input
                  id="pay-amount"
                  name="amount"
                  type="number"
                  min="1"
                  step="1"
                  defaultValue={franchiseFee.amount}
                  aria-invalid={Boolean(errors.amount)}
                />
              </Field>

              <Field label="Payment mode" htmlFor="pay-mode" required error={errors.paymentMode}>
                <Select id="pay-mode" name="paymentMode" defaultValue="BANK_TRANSFER">
                  {PAYMENT_MODES.map((mode) => (
                    <option key={mode} value={mode}>
                      {PAYMENT_MODE_LABELS[mode]}
                    </option>
                  ))}
                </Select>
              </Field>

              <Field label="Payment date" htmlFor="pay-date" required error={errors.paymentDate}>
                <Input
                  id="pay-date"
                  name="paymentDate"
                  type="date"
                  aria-invalid={Boolean(errors.paymentDate)}
                />
              </Field>

              <Field label="Reference number" htmlFor="pay-ref" hint="UTR, cheque number, UPI ref.">
                <Input id="pay-ref" name="referenceNumber" />
              </Field>
            </div>

            <Field
              label="Payment proof"
              htmlFor="pay-proof"
              error={errors.proof}
              hint="PDF, JPG, PNG or WebP up to 10 MB. Without it the payment stays pending."
            >
              <Input
                id="pay-proof"
                name="proof"
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.webp"
                className="h-auto py-2 file:mr-3 file:rounded-md file:border-0 file:bg-surface-muted file:px-3 file:py-1.5 file:text-[0.78rem] file:font-medium file:text-ink"
              />
            </Field>

            <Field label="Notes" htmlFor="pay-notes">
              <Textarea id="pay-notes" name="notes" rows={2} />
            </Field>
          </DialogBody>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={pending}>
              Cancel
            </Button>
            <Button type="submit" loading={pending}>
              Save payment
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
