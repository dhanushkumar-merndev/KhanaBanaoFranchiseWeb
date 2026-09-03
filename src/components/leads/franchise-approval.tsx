"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  CircleDashed,
  FileSignature,
  FileText,
} from "lucide-react";
import { toast } from "sonner";
import {
  approveFranchise,
  type ApprovalReadiness,
} from "@/app/actions/franchises";
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
import { Field, Input, Textarea } from "@/components/ui/field";
import { MAX_DOCUMENT_UPLOAD_MB } from "@/lib/upload-limits";

function Gate({ met, label }: { met: boolean; label: string }) {
  return (
    <li className="flex items-center gap-2.5">
      {met ? (
        <CheckCircle2 className="size-4 shrink-0 text-ok" aria-hidden="true" />
      ) : (
        <CircleDashed className="size-4 shrink-0 text-ink-soft" aria-hidden="true" />
      )}
      <span className={met ? "text-[0.85rem] text-ink" : "text-[0.85rem] text-ink-soft"}>
        {label}
      </span>
      <span className="sr-only">{met ? "complete" : "not yet complete"}</span>
    </li>
  );
}

export function FranchiseApprovalPanel({
  leadId,
  approval,
  franchiseApproved,
  isAdmin,
}: {
  leadId: string;
  approval: ApprovalReadiness;
  franchiseApproved: boolean;
  isAdmin: boolean;
}) {
  const [open, setOpen] = useState(false);

  if (franchiseApproved) {
    return (
      <Card className="border-ok/30 bg-ok/5">
        <CardContent className="flex flex-col items-start justify-between gap-4 py-5 sm:flex-row sm:items-center">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-ok" aria-hidden="true" />
            <div>
              <p className="font-display text-base font-bold text-ink">
                Franchise approved
              </p>
              <p className="mt-1 text-[0.78rem] text-ink-soft">
                Document review is complete. The agreement stage is now open.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild size="sm" variant="outline">
              <Link href="?tab=application">
                <FileText />
                Approval record and letter
              </Link>
            </Button>
            <Button asChild size="sm">
              <Link href="?tab=agreement">
                <FileSignature />
                Continue to agreement
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className={approval.allDocumentsApproved ? "border-brand-red/25" : undefined}>
        <CardHeader>
          <CardTitle>
            {approval.allDocumentsApproved
              ? "Documents complete — approve the franchise"
              : "Franchise approval readiness"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            <Gate met={approval.applicationSubmitted} label="Application submitted" />
            <Gate
              met={approval.businessDiscussionRecorded}
              label="Business discussion recorded"
            />
            <Gate met={approval.allDocumentsApproved} label="All documents approved" />
          </ul>

          {isAdmin ? (
            <Button
              className="mt-4"
              size="sm"
              disabled={!approval.ready}
              onClick={() => setOpen(true)}
            >
              Approve franchise and continue
            </Button>
          ) : (
            <p className="mt-4 text-[0.78rem] text-ink-soft">
              An administrator completes the franchise approval after all checks pass.
            </p>
          )}
          {!approval.ready && (
            <p className="mt-2 text-[0.75rem] text-ink-soft">
              Complete the unchecked items before opening the agreement stage.
            </p>
          )}
        </CardContent>
      </Card>

      {isAdmin && (
        <ApproveFranchiseDialog
          open={open}
          onOpenChange={setOpen}
          leadId={leadId}
        />
      )}
    </>
  );
}

function ApproveFranchiseDialog({
  open,
  onOpenChange,
  leadId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leadId: string;
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, setPending] = useState<"email" | "silent" | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const busy = pending !== null;

  async function submit(sendEmail: boolean) {
    if (!formRef.current) return;
    setPending(sendEmail ? "email" : "silent");
    setErrors({});
    try {
      const result = await approveFranchise(
        leadId,
        new FormData(formRef.current),
        sendEmail,
      );
      if (!result.ok) {
        setErrors(result.fieldErrors ?? {});
        toast.error(result.message);
        return;
      }
      toast.success("Franchise approved. Agreement stage is now open.");
      onOpenChange(false);
      router.push("?tab=agreement");
    } finally {
      setPending(null);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !busy && onOpenChange(next)}>
      <DialogContent className="max-w-lg">
        <form ref={formRef} onSubmit={(event) => event.preventDefault()}>
          <DialogHeader>
            <DialogTitle>Approve this franchise</DialogTitle>
            <DialogDescription>
              This completes document review and opens the Agreement tab.
            </DialogDescription>
          </DialogHeader>
          <DialogBody className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  label="Approved territory"
                  htmlFor="doc-ap-territory"
                  required
                  error={errors.territory}
                >
                  <Input
                    id="doc-ap-territory"
                    name="territory"
                    placeholder="e.g. Coimbatore South"
                  />
                </Field>
                <Field
                  label="Franchise model"
                  htmlFor="doc-ap-model"
                  required
                  error={errors.model}
                >
                  <Input
                    id="doc-ap-model"
                    name="model"
                    placeholder="e.g. Single territory"
                  />
                </Field>
                <Field
                  label="Approved investment (₹)"
                  htmlFor="doc-ap-investment"
                  error={errors.investment}
                >
                  <Input
                    id="doc-ap-investment"
                    name="investment"
                    type="number"
                    min="0"
                    step="1"
                  />
                </Field>
                <Field
                  label="Approval letter PDF"
                  htmlFor="doc-ap-letter"
                  error={errors.letter}
                  hint={`Required for “Approve and email PDF”. Stored under Application → Approval record. PDF up to ${MAX_DOCUMENT_UPLOAD_MB} MB.`}
                >
                  <Input
                    id="doc-ap-letter"
                    name="letter"
                    type="file"
                    accept="application/pdf"
                    className="h-auto py-2 file:mr-3 file:rounded-md file:border-0 file:bg-surface-muted file:px-3 file:py-1.5 file:text-[0.78rem] file:font-medium file:text-ink"
                  />
                </Field>
            </div>
            <Field label="Approval notes" htmlFor="doc-ap-notes">
              <Textarea id="doc-ap-notes" name="notes" rows={2} />
            </Field>
          </DialogBody>
          <DialogFooter className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <Button
              type="button"
              className="w-full"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={busy}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="w-full"
              variant="secondary"
              loading={pending === "silent"}
              disabled={busy}
              onClick={() => void submit(false)}
            >
              Approve without sending email
            </Button>
            <Button
              type="button"
              className="w-full sm:col-span-2"
              loading={pending === "email"}
              disabled={busy}
              onClick={() => void submit(true)}
            >
              Approve and email PDF
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
