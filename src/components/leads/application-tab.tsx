"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Copy, ExternalLink, FileText, Pencil, Send, XCircle } from "lucide-react";
import { toast } from "sonner";
import {
  rejectApplication,
  sendApplicationLink,
  startApplicationReview,
} from "@/app/actions/applications";
import { getApprovalLetterUrl } from "@/app/actions/franchises";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmailConfirmDialog } from "@/components/ui/email-confirm-dialog";
import { EmptyState } from "@/components/ui/feedback";
import { Field, Textarea } from "@/components/ui/field";
import { ApplicationEditDialog } from "@/components/leads/application-edit-dialog";
import { formatDateTime } from "@/lib/format";
import { formatCurrency } from "@/lib/utils";
import type { ApplicationDetail } from "@/lib/data/pipeline";
import type { LeadStatus } from "@/lib/domain/enums";
import type { StatusTone } from "@/lib/domain/status";

const STATUS_LABEL = {
  IN_PROGRESS: "Not submitted yet",
  SUBMITTED: "Submitted",
  UNDER_REVIEW: "Under review",
  APPROVED: "Approved",
  REJECTED: "Rejected",
} as const;

const STATUS_TONE: Record<keyof typeof STATUS_LABEL, StatusTone> = {
  IN_PROGRESS: "neutral",
  SUBMITTED: "info",
  UNDER_REVIEW: "progress",
  APPROVED: "success",
  REJECTED: "danger",
};

/** Field labels for the JSONB sections, in the order spec §13 lists them. */
const SECTIONS: { title: string; key: keyof ApplicationDetail; fields: [string, string][] }[] = [
  {
    title: "Personal information",
    key: "personal_details",
    fields: [
      ["full_name", "Full name"],
      ["mobile", "Mobile"],
      ["whatsapp", "WhatsApp"],
      ["email", "Email"],
      ["date_of_birth", "Date of birth"],
    ],
  },
  {
    title: "Address",
    key: "address_details",
    fields: [
      ["current_address", "Current address"],
      ["city", "City"],
      ["state", "State"],
      ["pin_code", "PIN code"],
    ],
  },
  {
    title: "Business",
    key: "business_details",
    fields: [
      ["current_occupation", "Current occupation"],
      ["business_experience", "Business experience"],
      ["company_name", "Company name"],
      ["gst_number", "GST number"],
    ],
  },
  {
    title: "Franchise",
    key: "franchise_details",
    fields: [
      ["preferred_city", "Preferred city"],
      ["preferred_territory", "Preferred territory"],
      ["investment_budget", "Investment budget"],
      ["franchise_model", "Franchise model"],
      ["expected_start_date", "Expected start"],
    ],
  },
  {
    title: "Financial",
    key: "financial_details",
    fields: [
      ["source_of_investment", "Source of investment"],
      ["available_investment_amount", "Available amount"],
      ["bank_name", "Bank"],
    ],
  },
];

function value(section: unknown, key: string): string | null {
  if (!section || typeof section !== "object") return null;
  const raw = (section as Record<string, unknown>)[key];
  if (raw === null || raw === undefined || raw === "") return null;
  return String(raw);
}

export function ApplicationTab({
  leadId,
  leadStatus,
  application,
  canManage,
  isAdmin,
  businessDiscussionRecorded,
}: {
  leadId: string;
  leadStatus: LeadStatus;
  application: ApplicationDetail | null;
  canManage: boolean;
  isAdmin: boolean;
  businessDiscussionRecorded: boolean;
}) {
  const router = useRouter();
  const [linkDialog, setLinkDialog] = useState(false);
  const [rejectDialog, setRejectDialog] = useState(false);
  const [reason, setReason] = useState("");
  const [issuedUrl, setIssuedUrl] = useState<string | null>(null);
  const [reviewing, setReviewing] = useState(false);
  const [editDialog, setEditDialog] = useState(false);

  const canSendLink =
    canManage &&
    businessDiscussionRecorded &&
    (leadStatus === "ACCEPTED" || leadStatus === "APPLICATION_LINK_SENT");

  const submitted =
    application && application.status !== "IN_PROGRESS";

  const openReview = async () => {
    setReviewing(true);
    try {
      const result = await startApplicationReview(application!.id);
      if (result.ok) {
        toast.success("Application opened for review.");
        router.refresh();
      } else {
        toast.error(result.message);
      }
    } finally {
      setReviewing(false);
    }
  };

  const copyLink = async () => {
    if (!issuedUrl) return;
    await navigator.clipboard.writeText(issuedUrl);
    toast.success("Link copied.");
  };

  if (!application) {
    return (
      <>
        <EmptyState
          title="No application yet"
          body={
            leadStatus === "ACCEPTED" && !businessDiscussionRecorded
              ? "Record the business discussion from the action buttons above before sending the application link."
              : canSendLink
              ? "Send the applicant their secure link and their answers will appear here."
              : "Accept this lead first, then send the application link."
          }
          icon={FileText}
          action={
            canSendLink ? (
              <Button onClick={() => setLinkDialog(true)}>
                <Send />
                Send application link
              </Button>
            ) : undefined
          }
        />
        {linkDialog && (
          <SendLinkDialog
            leadId={leadId}
            onClose={() => setLinkDialog(false)}
            onIssued={setIssuedUrl}
          />
        )}
      </>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex-row items-start justify-between gap-3">
          <div>
            <CardTitle>
              Application {application.application_number}
            </CardTitle>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <StatusBadge
                label={STATUS_LABEL[application.status]}
                tone={STATUS_TONE[application.status]}
              />
              {application.submitted_at && (
                <span className="text-[0.75rem] text-ink-soft">
                  Submitted {formatDateTime(application.submitted_at)}
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {isAdmin && submitted && application.status !== "REJECTED" && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setEditDialog(true)}
              >
                <Pencil />
                Edit application
              </Button>
            )}
            {canSendLink && (
              <Button size="sm" variant="outline" onClick={() => setLinkDialog(true)}>
                <Send />
                {application.status === "IN_PROGRESS" ? "Send link" : "Resend link"}
              </Button>
            )}
            {isAdmin && application.status === "SUBMITTED" && (
              <Button size="sm" loading={reviewing} onClick={() => void openReview()}>
                Start review
              </Button>
            )}
            {isAdmin &&
              (application.status === "SUBMITTED" ||
                application.status === "UNDER_REVIEW") && (
                <Button size="sm" variant="danger" onClick={() => setRejectDialog(true)}>
                  <XCircle />
                  Reject
                </Button>
              )}
          </div>
        </CardHeader>

        {issuedUrl && (
          <CardContent className="border-b border-line bg-surface-muted/50">
            <p className="text-[0.75rem] font-semibold uppercase tracking-wide text-ink-soft">
              Applicant link
            </p>
            <div className="mt-1.5 flex flex-wrap items-center gap-2">
              <code className="min-w-0 flex-1 truncate rounded-lg border border-line bg-surface px-2.5 py-1.5 text-[0.72rem] text-ink">
                {issuedUrl}
              </code>
              <Button size="sm" variant="outline" onClick={() => void copyLink()}>
                <Copy />
                Copy
              </Button>
            </div>
          </CardContent>
        )}

        {application.review_notes && (
          <CardContent className="border-b border-line">
            <p className="rounded-lg border border-danger/25 bg-danger/5 px-3 py-2.5 text-[0.8rem] leading-relaxed text-ink">
              <span className="font-semibold text-danger">Review note:</span>{" "}
              {application.review_notes}
            </p>
          </CardContent>
        )}

        {application.approved_territory && (
          <CardContent className="border-b border-line">
            <p className="text-[0.72rem] font-semibold uppercase tracking-wide text-ink-soft">
              Approval record
            </p>
            <dl className="mt-2 grid gap-2 sm:grid-cols-3">
              <Detail label="Territory" value={application.approved_territory} />
              <Detail label="Model" value={application.approved_franchise_model} />
              <Detail
                label="Investment"
                value={
                  application.approved_investment !== null
                    ? formatCurrency(application.approved_investment)
                    : null
                }
              />
            </dl>
            {application.approval_notes && (
              <p className="mt-2 text-[0.8rem] leading-relaxed text-ink-soft">
                {application.approval_notes}
              </p>
            )}
            {application.hasApprovalLetter && (
              <ApprovalLetterButton applicationId={application.id} />
            )}
          </CardContent>
        )}
      </Card>

      {submitted ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {SECTIONS.map((section) => (
            <Card key={section.title}>
              <CardHeader>
                <CardTitle>{section.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <dl>
                  {section.fields.map(([key, label]) => (
                    <div
                      key={key}
                      className="flex flex-col gap-0.5 border-b border-line/60 py-2 last:border-0 sm:flex-row sm:items-baseline sm:gap-4"
                    >
                      <dt className="w-44 shrink-0 text-[0.72rem] font-semibold uppercase tracking-wide text-ink-soft">
                        {label}
                      </dt>
                      <dd className="min-w-0 flex-1 text-[0.85rem] leading-relaxed text-ink">
                        {value(application[section.key], key) ?? (
                          <span className="text-ink-soft/60">Not provided</span>
                        )}
                      </dd>
                    </div>
                  ))}
                </dl>
              </CardContent>
            </Card>
          ))}

          <Card>
            <CardHeader>
              <CardTitle>Declaration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {(
                [
                  ["information_true", "Information is true and correct"],
                  ["consent_to_verification", "Consents to verification"],
                  ["terms_accepted", "Accepts the franchise terms"],
                ] as const
              ).map(([key, label]) => (
                <div key={key} className="flex items-center gap-2">
                  <Badge
                    tone={
                      value(application.declaration, key) === "true"
                        ? "success"
                        : "neutral"
                    }
                  >
                    {value(application.declaration, key) === "true" ? "Agreed" : "Not agreed"}
                  </Badge>
                  <span className="text-[0.82rem] text-ink">{label}</span>
                </div>
              ))}
              {value(application.declaration, "accepted_at") && (
                <p className="pt-1 text-[0.72rem] text-ink-soft">
                  Accepted{" "}
                  {formatDateTime(value(application.declaration, "accepted_at"))}
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      ) : (
        <EmptyState
          title="The applicant has not submitted yet"
          body="Their answers appear here the moment they submit the form."
          icon={FileText}
        />
      )}

      {linkDialog && (
        <SendLinkDialog
          leadId={leadId}
          onClose={() => setLinkDialog(false)}
          onIssued={setIssuedUrl}
        />
      )}

      {editDialog && (
        <ApplicationEditDialog
          application={application}
          onClose={() => setEditDialog(false)}
        />
      )}

      <EmailConfirmDialog
        open={rejectDialog}
        onOpenChange={(open) => {
          setRejectDialog(open);
          if (!open) setReason("");
        }}
        title="Reject this application?"
        description="The lead is rejected too, and cannot be moved on afterwards."
        variant="danger"
        confirmLabel="Reject"
        withoutEmailLabel="Reject without email"
        disabled={reason.trim().length < 5}
        successMessage="Application rejected."
        onConfirm={(sendEmail) =>
          rejectApplication(application.id, reason, sendEmail)
        }
      >
        <Field
          label="Reason"
          htmlFor="app-reject-reason"
          required
          hint="Stored on the application and shown in the activity timeline."
        >
          <Textarea
            id="app-reject-reason"
            rows={3}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="e.g. Territory already allocated to another partner."
          />
        </Field>
      </EmailConfirmDialog>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <dt className="text-[0.68rem] font-semibold uppercase tracking-wide text-ink-soft">
        {label}
      </dt>
      <dd className="mt-0.5 text-[0.85rem] text-ink">
        {value ?? <span className="text-ink-soft/60">—</span>}
      </dd>
    </div>
  );
}

function ApprovalLetterButton({ applicationId }: { applicationId: string }) {
  const [pending, setPending] = useState(false);

  const open = async () => {
    setPending(true);
    try {
      const result = await getApprovalLetterUrl(applicationId);
      if (result.ok) window.open(result.data.url, "_blank", "noopener");
      else toast.error(result.message);
    } finally {
      setPending(false);
    }
  };

  return (
    <Button size="sm" variant="outline" className="mt-3" loading={pending} onClick={() => void open()}>
      <ExternalLink />
      Approval letter
    </Button>
  );
}

function SendLinkDialog({
  leadId,
  onClose,
  onIssued,
}: {
  leadId: string;
  onClose: () => void;
  onIssued: (url: string) => void;
}) {
  return (
    <ConfirmDialog
      open
      onOpenChange={(open) => !open && onClose()}
      title="Send the application link"
      confirmLabel="Send link"
      successMessage="Application link issued."
      onConfirm={async () => {
        const result = await sendApplicationLink(leadId, true);
        if (result.ok) {
          onIssued(result.data.url);
          if (!result.data.emailSent) {
            toast.warning(
              "The link was created but the email did not send. Copy it from the card and share it directly.",
            );
          }
        }
        return result;
      }}
    >
      <p className="text-[0.82rem] leading-relaxed text-ink-soft">
        A fresh secure link is emailed to the applicant and shown here so you can
        copy it. Any link sent earlier stops working immediately.
      </p>
    </ConfirmDialog>
  );
}
