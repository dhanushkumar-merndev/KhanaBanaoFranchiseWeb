"use client";

import { createContext, useContext, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, CircleDashed, Rocket, Store } from "lucide-react";
import { toast } from "sonner";
import {
  activateFranchise,
  approveFranchise,
  goLive,
  moveToOngoingSupport,
} from "@/app/actions/franchises";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/feedback";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { FRANCHISE_STATUS_LABELS, franchiseStatusTone } from "@/lib/domain/status";
import { formatDate } from "@/lib/format";
import type { FranchiseDetail } from "@/lib/data/pipeline";
import type {
  ActivationReadiness,
  ApprovalReadiness,
} from "@/app/actions/franchises";

function Gate({ met, label }: { met: boolean; label: string }) {
  return (
    <li className="flex items-center gap-2.5">
      {met ? (
        <CheckCircle2 className="size-4 shrink-0 text-ok" aria-hidden="true" />
      ) : (
        <CircleDashed className="size-4 shrink-0 text-ink-soft" aria-hidden="true" />
      )}
      <span
        className={
          met ? "text-[0.85rem] text-ink" : "text-[0.85rem] text-ink-soft"
        }
      >
        {label}
      </span>
      <span className="sr-only">{met ? "complete" : "not yet complete"}</span>
    </li>
  );
}

export function ActivationTab({
  leadId,
  leadName,
  franchise,
  approval,
  activation,
  members,
  isAdmin,
}: {
  leadId: string;
  leadName: string;
  franchise: FranchiseDetail | null;
  approval: ApprovalReadiness;
  activation: ActivationReadiness;
  members: { id: string; full_name: string }[];
  isAdmin: boolean;
}) {
  const [approveOpen, setApproveOpen] = useState(false);
  const [activateOpen, setActivateOpen] = useState(false);
  const [liveOpen, setLiveOpen] = useState(false);
  const [supportOpen, setSupportOpen] = useState(false);

  if (franchise) {
    const setupDone = franchise.setup.filter((item) => item.is_done).length;
    const setupComplete =
      franchise.setup.length > 0 && setupDone === franchise.setup.length;

    return (
      <div className="space-y-4">
        <Card>
          <CardHeader className="flex-row items-start justify-between gap-3">
            <div>
              <CardTitle>
                {franchise.franchise_name}{" "}
                <span className="font-mono text-[0.8rem] font-normal text-ink-soft">
                  {franchise.franchise_id}
                </span>
              </CardTitle>
              <div className="mt-2">
                <StatusBadge
                  label={FRANCHISE_STATUS_LABELS[franchise.status]}
                  tone={franchiseStatusTone(franchise.status)}
                />
              </div>
            </div>

            {isAdmin && (
              <div className="flex flex-wrap gap-2">
                {franchise.status === "READY_TO_GO_LIVE" && (
                  <Button size="sm" onClick={() => setLiveOpen(true)}>
                    <Rocket />
                    Go live
                  </Button>
                )}
                {franchise.status === "LIVE" && (
                  <Button size="sm" variant="outline" onClick={() => setSupportOpen(true)}>
                    Move to ongoing support
                  </Button>
                )}
              </div>
            )}
          </CardHeader>

          <CardContent>
            <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <Detail label="Owner" value={franchise.owner_name} />
              <Detail label="Territory" value={franchise.territory} />
              <Detail
                label="Activated"
                value={franchise.activation_date ? formatDate(franchise.activation_date) : null}
              />
              <Detail label="Activated by" value={franchise.activatedByName} />
              <Detail label="CRM login" value={franchise.crm_login_email} />
              <Detail label="Support contact" value={franchise.support_contact} />
              <Detail label="Support owner" value={franchise.supportOwnerName} />
              <Detail
                label="Go live"
                value={franchise.go_live_date ? formatDate(franchise.go_live_date) : null}
              />
              <Detail
                label="Setup"
                value={`${setupDone} of ${franchise.setup.length} complete`}
              />
            </dl>

            {franchise.dashboard_url && (
              <p className="mt-3 text-[0.82rem]">
                <a
                  href={franchise.dashboard_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-brand-crimson hover:underline"
                >
                  Open their CRM dashboard
                </a>
              </p>
            )}

            {franchise.notes && (
              <p className="mt-3 whitespace-pre-wrap text-[0.82rem] leading-relaxed text-ink">
                {franchise.notes}
              </p>
            )}
            {franchise.remarks && (
              <p className="mt-3 rounded-lg bg-surface-muted/60 px-3 py-2.5 text-[0.82rem] leading-relaxed text-ink">
                <span className="font-semibold">Go-live remarks:</span>{" "}
                {franchise.remarks}
              </p>
            )}
          </CardContent>
        </Card>

        {franchise.status === "READY_TO_GO_LIVE" && !setupComplete && (
          <p className="rounded-lg border border-warn/30 bg-warn/8 px-3.5 py-2.5 text-[0.82rem] text-ink">
            Finish the setup checklist before going live.
          </p>
        )}

        {isAdmin && (
          <>
            <GoLiveDialog
              open={liveOpen}
              onOpenChange={setLiveOpen}
              franchiseId={franchise.id}
              members={members}
            />
            <ConfirmDialog
              open={supportOpen}
              onOpenChange={setSupportOpen}
              title="Move to ongoing support?"
              confirmLabel="Move"
              successMessage="Now in ongoing support."
              onConfirm={() => moveToOngoingSupport(franchise.id)}
            >
              <p className="text-[0.82rem] leading-relaxed text-ink-soft">
                The launch is complete and this partner moves into the
                steady-state support relationship. This is the final stage.
              </p>
            </ConfirmDialog>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Franchise approval</CardTitle>
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

          {isAdmin && (
            <Button
              className="mt-4"
              size="sm"
              disabled={!approval.ready}
              onClick={() => setApproveOpen(true)}
            >
              Approve franchise
            </Button>
          )}
          {!approval.ready && (
            <p className="mt-2 text-[0.75rem] text-ink-soft">
              All three are required before a franchise can be approved.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Activation</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            <Gate met={activation.franchiseApproved} label="Franchise approved" />
            <Gate met={activation.agreementCompleted} label="Agreement completed" />
            <Gate met={activation.paymentApproved} label="Payment approved" />
          </ul>

          {isAdmin ? (
            <Button
              className="mt-4"
              size="sm"
              disabled={!activation.ready}
              onClick={() => setActivateOpen(true)}
            >
              <Store />
              Activate franchise
            </Button>
          ) : (
            <p className="mt-4 text-[0.8rem] text-ink-soft">
              An administrator activates the franchise once all three are met.
            </p>
          )}
        </CardContent>
      </Card>

      {!approval.ready && !activation.ready && (
        <EmptyState
          title="Not ready for activation yet"
          body="Work through the application, documents, agreement and payment stages first — the checklists above track exactly what is outstanding."
          icon={Store}
        />
      )}

      {isAdmin && (
        <>
          <ApproveDialog
            open={approveOpen}
            onOpenChange={setApproveOpen}
            leadId={leadId}
          />
          <ActivateDialog
            open={activateOpen}
            onOpenChange={setActivateOpen}
            leadId={leadId}
            leadName={leadName}
          />
        </>
      )}
    </div>
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

/** Shared shape: a form whose submit offers the send-email / no-email choice. */
function EmailChoiceForm({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  children,
  onSubmit,
  successMessage,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel: string;
  children: React.ReactNode;
  onSubmit: (formData: FormData, sendEmail: boolean) => Promise<
    { ok: boolean; message?: string; fieldErrors?: Record<string, string> }
  >;
  successMessage: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState<"email" | "silent" | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formEl, setFormEl] = useState<HTMLFormElement | null>(null);

  const run = async (sendEmail: boolean) => {
    if (!formEl) return;
    setPending(sendEmail ? "email" : "silent");
    setErrors({});
    try {
      const result = await onSubmit(new FormData(formEl), sendEmail);
      if (!result.ok) {
        setErrors(result.fieldErrors ?? {});
        toast.error(result.message ?? "That did not work.");
        return;
      }
      toast.success(successMessage);
      router.refresh();
      onOpenChange(false);
    } finally {
      setPending(null);
    }
  };

  const busy = pending !== null;

  return (
    <Dialog open={open} onOpenChange={(next) => !busy && onOpenChange(next)}>
      <DialogContent className="max-w-lg">
        <form ref={setFormEl} onSubmit={(event) => event.preventDefault()}>
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>

          <DialogBody className="space-y-4">
            <ErrorContext.Provider value={errors}>{children}</ErrorContext.Provider>
          </DialogBody>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={busy}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="secondary"
              loading={pending === "silent"}
              disabled={busy}
              onClick={() => void run(false)}
            >
              {confirmLabel} without email
            </Button>
            <Button
              type="button"
              loading={pending === "email"}
              disabled={busy}
              onClick={() => void run(true)}
            >
              {confirmLabel} and send email
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** Server-side field errors, shared with the field components below. */
const ErrorContext = createContext<Record<string, string>>({});
function useFieldError(name: string) {
  return useContext(ErrorContext)[name];
}

function ApproveDialog({
  open,
  onOpenChange,
  leadId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leadId: string;
}) {
  return (
    <EmailChoiceForm
      open={open}
      onOpenChange={onOpenChange}
      title="Approve this franchise"
      description="Recorded against the application as the formal approval decision."
      confirmLabel="Approve"
      successMessage="Franchise approved."
      onSubmit={(formData, sendEmail) =>
        approveFranchise(leadId, formData, sendEmail)
      }
    >
      <ApproveFields />
    </EmailChoiceForm>
  );
}

function ApproveFields() {
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Approved territory"
          htmlFor="ap-territory"
          required
          error={useFieldError("territory")}
        >
          <Input id="ap-territory" name="territory" placeholder="e.g. Coimbatore South" />
        </Field>
        <Field
          label="Franchise model"
          htmlFor="ap-model"
          required
          error={useFieldError("model")}
        >
          <Input id="ap-model" name="model" placeholder="e.g. Single territory" />
        </Field>
        <Field
          label="Approved investment (₹)"
          htmlFor="ap-investment"
          error={useFieldError("investment")}
        >
          <Input id="ap-investment" name="investment" type="number" min="0" step="1" />
        </Field>
        <Field
          label="Approval letter"
          htmlFor="ap-letter"
          error={useFieldError("letter")}
          hint="PDF, optional."
        >
          <Input
            id="ap-letter"
            name="letter"
            type="file"
            accept="application/pdf"
            className="h-auto py-2 file:mr-3 file:rounded-md file:border-0 file:bg-surface-muted file:px-3 file:py-1.5 file:text-[0.78rem] file:font-medium file:text-ink"
          />
        </Field>
      </div>
      <Field label="Approval notes" htmlFor="ap-notes">
        <Textarea id="ap-notes" name="notes" rows={2} />
      </Field>
    </>
  );
}

function ActivateDialog({
  open,
  onOpenChange,
  leadId,
  leadName,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leadId: string;
  leadName: string;
}) {
  return (
    <EmailChoiceForm
      open={open}
      onOpenChange={onOpenChange}
      title="Activate this franchise"
      description="Creates the franchise record and seeds its setup checklist. No password is ever generated or emailed."
      confirmLabel="Activate"
      successMessage="Franchise activated."
      onSubmit={(formData, sendEmail) =>
        activateFranchise(leadId, formData, sendEmail)
      }
    >
      <ActivateFields leadName={leadName} />
    </EmailChoiceForm>
  );
}

function ActivateFields({ leadName }: { leadName: string }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field
        label="Franchise name"
        htmlFor="ac-name"
        required
        error={useFieldError("franchiseName")}
      >
        <Input id="ac-name" name="franchiseName" defaultValue={`Khana Banao ${leadName}`} />
      </Field>
      <Field
        label="Owner name"
        htmlFor="ac-owner"
        required
        error={useFieldError("ownerName")}
      >
        <Input id="ac-owner" name="ownerName" defaultValue={leadName} />
      </Field>
      <Field label="Territory" htmlFor="ac-territory">
        <Input id="ac-territory" name="territory" />
      </Field>
      <Field
        label="Activation date"
        htmlFor="ac-date"
        required
        error={useFieldError("activationDate")}
      >
        <Input
          id="ac-date"
          name="activationDate"
          type="date"
          defaultValue={new Date().toISOString().slice(0, 10)}
        />
      </Field>
      <Field label="CRM login email" htmlFor="ac-crm" hint="Defaults to their enquiry email.">
        <Input id="ac-crm" name="crmLoginEmail" type="email" />
      </Field>
      <Field label="Dashboard URL" htmlFor="ac-dashboard">
        <Input id="ac-dashboard" name="dashboardUrl" type="url" placeholder="https://" />
      </Field>
      <Field label="Support contact" htmlFor="ac-support" className="sm:col-span-2">
        <Input id="ac-support" name="supportContact" placeholder="Name and phone number" />
      </Field>
      <Field label="Notes" htmlFor="ac-notes" className="sm:col-span-2">
        <Textarea id="ac-notes" name="notes" rows={2} />
      </Field>
    </div>
  );
}

function GoLiveDialog({
  open,
  onOpenChange,
  franchiseId,
  members,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  franchiseId: string;
  members: { id: string; full_name: string }[];
}) {
  return (
    <EmailChoiceForm
      open={open}
      onOpenChange={onOpenChange}
      title="Take this franchise live"
      description="The setup checklist must be complete. This is the moment they start trading."
      confirmLabel="Go live"
      successMessage="Franchise is live."
      onSubmit={(formData, sendEmail) => goLive(franchiseId, formData, sendEmail)}
    >
      <GoLiveFields members={members} />
    </EmailChoiceForm>
  );
}

function GoLiveFields({ members }: { members: { id: string; full_name: string }[] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field
        label="Go-live date"
        htmlFor="gl-date"
        required
        error={useFieldError("goLiveDate")}
      >
        <Input
          id="gl-date"
          name="goLiveDate"
          type="date"
          defaultValue={new Date().toISOString().slice(0, 10)}
        />
      </Field>
      <Field
        label="Support owner"
        htmlFor="gl-owner"
        hint="Who this partner calls from now on."
      >
        <Select id="gl-owner" name="supportOwner" defaultValue="">
          <option value="">Not assigned</option>
          {members.map((member) => (
            <option key={member.id} value={member.id}>
              {member.full_name}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Remarks" htmlFor="gl-remarks" className="sm:col-span-2">
        <Textarea id="gl-remarks" name="remarks" rows={2} />
      </Field>
    </div>
  );
}
