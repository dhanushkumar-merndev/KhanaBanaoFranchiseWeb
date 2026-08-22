"use client";

import { useMemo } from "react";
import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import { CheckCircle2, CircleDashed } from "lucide-react";
import { DataTable, type ColumnMetaConfig } from "@/components/data-table/data-table";
import { Badge, StatusBadge } from "@/components/ui/badge";
import {
  AGREEMENT_STATUSES,
  APPLICATION_STATUSES,
  DOCUMENT_STATUSES,
  DOCUMENT_TYPE_LABELS,
  FRANCHISE_STATUSES,
  PAYMENT_MODE_LABELS,
  PAYMENT_STATUSES,
} from "@/lib/domain/enums";
import {
  AGREEMENT_STATUS_LABELS,
  DOCUMENT_STATUS_LABELS,
  FRANCHISE_STATUS_LABELS,
  PAYMENT_STATUS_LABELS,
  agreementStatusTone,
  documentStatusTone,
  franchiseStatusTone,
  paymentStatusTone,
} from "@/lib/domain/status";
import { formatDate, formatDateTime } from "@/lib/format";
import { formatCurrency } from "@/lib/utils";
import type {
  AgreementQueueRow,
  ApplicationQueueRow,
  DocumentQueueRow,
  FranchiseQueueRow,
  PaymentQueueRow,
} from "@/lib/data/queues";

type Shared = {
  total: number;
  page: number;
  pageSize: number;
  sort: string | null;
  dir: "asc" | "desc";
  /** `/admin/leads` or `/member/leads`. */
  basePath: string;
};

const APPLICATION_LABELS: Record<string, string> = {
  IN_PROGRESS: "Not submitted",
  SUBMITTED: "Submitted",
  UNDER_REVIEW: "Under review",
  APPROVED: "Approved",
  REJECTED: "Rejected",
};

/** Lead name + number, linking through to the relevant tab. */
function LeadCell({
  href,
  name,
  number,
}: {
  href: string;
  name: string;
  number: string;
}) {
  return (
    <div className="min-w-0">
      <Link
        href={href}
        className="block truncate font-medium text-ink hover:text-brand-crimson"
      >
        {name}
      </Link>
      <p className="truncate font-mono text-[0.68rem] uppercase text-ink-soft">
        {number}
      </p>
    </div>
  );
}

export function ApplicationsQueueTable({
  rows,
  basePath,
  ...shared
}: Shared & { rows: ApplicationQueueRow[] }) {
  const columns = useMemo<ColumnDef<ApplicationQueueRow, unknown>[]>(
    () => [
      {
        id: "application_number",
        header: "Application",
        meta: { sortKey: "application_number" } satisfies ColumnMetaConfig,
        cell: ({ row }) => (
          <LeadCell
            href={`${basePath}/${row.original.leadId}?tab=application`}
            name={row.original.leadName}
            number={row.original.application_number}
          />
        ),
      },
      {
        id: "leadNumber",
        header: "Lead",
        meta: { hideOnMobile: true } satisfies ColumnMetaConfig,
        cell: ({ row }) => (
          <span className="whitespace-nowrap font-mono text-[0.72rem] uppercase text-ink-soft">
            {row.original.leadNumber}
          </span>
        ),
      },
      {
        id: "leadCity",
        header: "City",
        meta: { hideOnMobile: true } satisfies ColumnMetaConfig,
        cell: ({ row }) => <span className="text-ink-soft">{row.original.leadCity}</span>,
      },
      {
        id: "status",
        header: "Status",
        cell: ({ row }) => (
          <Badge
            tone={
              row.original.status === "APPROVED"
                ? "success"
                : row.original.status === "REJECTED"
                  ? "danger"
                  : row.original.status === "IN_PROGRESS"
                    ? "neutral"
                    : "progress"
            }
          >
            {APPLICATION_LABELS[row.original.status]}
          </Badge>
        ),
      },
      {
        id: "submitted_at",
        header: "Submitted",
        meta: { sortKey: "submitted_at", hideOnMobile: true } satisfies ColumnMetaConfig,
        cell: ({ row }) => (
          <span className="whitespace-nowrap text-ink-soft">
            {row.original.submitted_at
              ? formatDateTime(row.original.submitted_at)
              : "—"}
          </span>
        ),
      },
      {
        id: "member",
        header: "Member",
        meta: { hideOnMobile: true } satisfies ColumnMetaConfig,
        cell: ({ row }) => (
          <span className="whitespace-nowrap text-ink-soft">
            {row.original.assignedMemberName ?? "—"}
          </span>
        ),
      },
    ],
    [basePath],
  );

  return (
    <DataTable
      {...shared}
      data={rows}
      columns={columns}
      searchPlaceholder="Search application number…"
      filters={[
        {
          key: "status",
          label: "Status",
          options: APPLICATION_STATUSES.map((value) => ({
            value,
            label: APPLICATION_LABELS[value],
          })),
        },
      ]}
      rowHref={(row) => `${basePath}/${row.leadId}?tab=application`}
      emptyTitle="No applications here"
      emptyBody="Applications appear once an accepted lead is sent their secure link."
    />
  );
}

export function DocumentsQueueTable({
  rows,
  basePath,
  ...shared
}: Shared & { rows: DocumentQueueRow[] }) {
  const columns = useMemo<ColumnDef<DocumentQueueRow, unknown>[]>(
    () => [
      {
        id: "applicant",
        header: "Applicant",
        cell: ({ row }) => (
          <LeadCell
            href={`${basePath}/${row.original.leadId}?tab=documents`}
            name={row.original.leadName}
            number={row.original.leadNumber}
          />
        ),
      },
      {
        id: "documents",
        header: "Documents",
        cell: ({ row }) => (
          <Link
            href={`${basePath}/${row.original.leadId}?tab=documents`}
            className="block max-w-sm text-ink hover:text-brand-crimson"
          >
            <span className="font-medium">
              {row.original.requestedCount} requested
            </span>
            <span className="mt-0.5 block truncate text-[0.68rem] text-ink-soft">
              {row.original.documentTypes
                .map((type) => DOCUMENT_TYPE_LABELS[type])
                .join(", ")}
            </span>
          </Link>
        ),
      },
      {
        id: "progress",
        header: "Progress",
        cell: ({ row }) => (
          <div className="whitespace-nowrap">
            <span className="font-medium text-ink">
              {row.original.approvedCount}/{row.original.requestedCount} approved
            </span>
            <span className="mt-0.5 block text-[0.68rem] text-ink-soft">
              {row.original.uploadedCount}/{row.original.requestedCount} uploaded
            </span>
          </div>
        ),
      },
      {
        id: "status",
        header: "Status",
        cell: ({ row }) => (
          <StatusBadge
            label={DOCUMENT_STATUS_LABELS[row.original.status]}
            tone={documentStatusTone(row.original.status)}
          />
        ),
      },
      {
        id: "uploadedAt",
        header: "Uploaded",
        meta: { sortKey: "uploaded_at", hideOnMobile: true } satisfies ColumnMetaConfig,
        cell: ({ row }) => (
          <span className="whitespace-nowrap text-ink-soft">
            {row.original.uploadedAt
              ? formatDateTime(row.original.uploadedAt)
              : "Not uploaded"}
          </span>
        ),
      },
      {
        id: "reviewedBy",
        header: "Reviewed by",
        meta: { hideOnMobile: true } satisfies ColumnMetaConfig,
        cell: ({ row }) => (
          <span className="whitespace-nowrap text-ink-soft">
            {row.original.reviewedByName ?? "—"}
          </span>
        ),
      },
      {
        id: "member",
        header: "Member",
        meta: { hideOnMobile: true } satisfies ColumnMetaConfig,
        cell: ({ row }) => (
          <span className="whitespace-nowrap text-ink-soft">
            {row.original.assignedMemberName ?? "—"}
          </span>
        ),
      },
    ],
    [basePath],
  );

  return (
    <DataTable
      {...shared}
      data={rows}
      columns={columns}
      searchable={false}
      filters={[
        {
          key: "status",
          label: "Status",
          options: DOCUMENT_STATUSES.map((value) => ({
            value,
            label: DOCUMENT_STATUS_LABELS[value],
          })),
        },
      ]}
      rowHref={(row) => `${basePath}/${row.leadId}?tab=documents`}
      emptyTitle="No document requests"
      emptyBody="Each applicant appears here once after documents are requested."
    />
  );
}

export function AgreementsQueueTable({
  rows,
  basePath,
  ...shared
}: Shared & { rows: AgreementQueueRow[] }) {
  const columns = useMemo<ColumnDef<AgreementQueueRow, unknown>[]>(
    () => [
      {
        id: "agreement_number",
        header: "Agreement",
        cell: ({ row }) => (
          <LeadCell
            href={`${basePath}/${row.original.leadId}?tab=agreement`}
            name={row.original.leadName}
            number={row.original.agreement_number}
          />
        ),
      },
      {
        id: "leadNumber",
        header: "Lead",
        meta: { hideOnMobile: true } satisfies ColumnMetaConfig,
        cell: ({ row }) => (
          <span className="whitespace-nowrap font-mono text-[0.72rem] uppercase text-ink-soft">
            {row.original.leadNumber}
          </span>
        ),
      },
      {
        id: "status",
        header: "Status",
        cell: ({ row }) => (
          <StatusBadge
            label={AGREEMENT_STATUS_LABELS[row.original.status]}
            tone={agreementStatusTone(row.original.status)}
          />
        ),
      },
      {
        id: "sent_at",
        header: "Sent",
        meta: { hideOnMobile: true } satisfies ColumnMetaConfig,
        cell: ({ row }) => (
          <span className="whitespace-nowrap text-ink-soft">
            {row.original.sent_at ? formatDate(row.original.sent_at) : "—"}
          </span>
        ),
      },
      {
        id: "completed_at",
        header: "Completed",
        meta: { hideOnMobile: true } satisfies ColumnMetaConfig,
        cell: ({ row }) => (
          <span className="whitespace-nowrap text-ink-soft">
            {row.original.completed_at ? formatDate(row.original.completed_at) : "—"}
          </span>
        ),
      },
      {
        id: "member",
        header: "Member",
        meta: { hideOnMobile: true } satisfies ColumnMetaConfig,
        cell: ({ row }) => (
          <span className="whitespace-nowrap text-ink-soft">
            {row.original.assignedMemberName ?? "—"}
          </span>
        ),
      },
    ],
    [basePath],
  );

  return (
    <DataTable
      {...shared}
      data={rows}
      columns={columns}
      searchPlaceholder="Search agreement number…"
      filters={[
        {
          key: "status",
          label: "Status",
          options: AGREEMENT_STATUSES.map((value) => ({
            value,
            label: AGREEMENT_STATUS_LABELS[value],
          })),
        },
      ]}
      rowHref={(row) => `${basePath}/${row.leadId}?tab=agreement`}
      emptyTitle="No agreements yet"
      emptyBody="Agreements appear once a franchise is approved and the document is uploaded."
    />
  );
}

export function PaymentsQueueTable({
  rows,
  basePath,
  ...shared
}: Shared & { rows: PaymentQueueRow[] }) {
  const columns = useMemo<ColumnDef<PaymentQueueRow, unknown>[]>(
    () => [
      {
        id: "applicant",
        header: "Applicant",
        cell: ({ row }) => (
          <LeadCell
            href={`${basePath}/${row.original.leadId}?tab=payment`}
            name={row.original.leadName}
            number={row.original.leadNumber}
          />
        ),
      },
      {
        id: "amount",
        header: "Amount",
        meta: { align: "right" } satisfies ColumnMetaConfig,
        cell: ({ row }) => (
          <span className="whitespace-nowrap font-medium tabular-nums text-ink">
            {formatCurrency(row.original.amount)}
          </span>
        ),
      },
      {
        id: "payment_mode",
        header: "Mode",
        meta: { hideOnMobile: true } satisfies ColumnMetaConfig,
        cell: ({ row }) => (
          <span className="whitespace-nowrap text-ink-soft">
            {PAYMENT_MODE_LABELS[row.original.payment_mode]}
          </span>
        ),
      },
      {
        id: "status",
        header: "Status",
        cell: ({ row }) => (
          <StatusBadge
            label={PAYMENT_STATUS_LABELS[row.original.status]}
            tone={paymentStatusTone(row.original.status)}
          />
        ),
      },
      {
        id: "hasProof",
        header: "Proof",
        meta: { align: "center", hideOnMobile: true } satisfies ColumnMetaConfig,
        cell: ({ row }) =>
          row.original.hasProof ? (
            <span className="inline-flex items-center gap-1 text-[0.75rem] text-ok">
              <CheckCircle2 className="size-3.5" aria-hidden="true" />
              Attached
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-[0.75rem] text-ink-soft">
              <CircleDashed className="size-3.5" aria-hidden="true" />
              None
            </span>
          ),
      },
      {
        id: "payment_date",
        header: "Paid",
        meta: { hideOnMobile: true } satisfies ColumnMetaConfig,
        cell: ({ row }) => (
          <span className="whitespace-nowrap text-ink-soft">
            {row.original.payment_date ? formatDate(row.original.payment_date) : "—"}
          </span>
        ),
      },
      {
        id: "member",
        header: "Member",
        meta: { hideOnMobile: true } satisfies ColumnMetaConfig,
        cell: ({ row }) => (
          <span className="whitespace-nowrap text-ink-soft">
            {row.original.assignedMemberName ?? "—"}
          </span>
        ),
      },
    ],
    [basePath],
  );

  return (
    <DataTable
      {...shared}
      data={rows}
      columns={columns}
      searchable={false}
      filters={[
        {
          key: "status",
          label: "Status",
          options: PAYMENT_STATUSES.map((value) => ({
            value,
            label: PAYMENT_STATUS_LABELS[value],
          })),
        },
      ]}
      rowHref={(row) => `${basePath}/${row.leadId}?tab=payment`}
      emptyTitle="No payments recorded"
      emptyBody="The franchise investment payment is recorded once an agreement is completed."
    />
  );
}

export function FranchisesQueueTable({
  rows,
  basePath,
  ...shared
}: Shared & { rows: FranchiseQueueRow[] }) {
  const columns = useMemo<ColumnDef<FranchiseQueueRow, unknown>[]>(
    () => [
      {
        id: "franchise_id",
        header: "Franchise",
        meta: { sortKey: "franchise_id" } satisfies ColumnMetaConfig,
        cell: ({ row }) => (
          <LeadCell
            href={`${basePath}/${row.original.leadId}?tab=activation`}
            name={row.original.franchise_name}
            number={row.original.franchise_id}
          />
        ),
      },
      {
        id: "owner_name",
        header: "Owner",
        meta: { hideOnMobile: true } satisfies ColumnMetaConfig,
        cell: ({ row }) => <span className="text-ink">{row.original.owner_name}</span>,
      },
      {
        id: "territory",
        header: "Territory",
        meta: { hideOnMobile: true } satisfies ColumnMetaConfig,
        cell: ({ row }) => (
          <span className="text-ink-soft">{row.original.territory ?? "—"}</span>
        ),
      },
      {
        id: "status",
        header: "Status",
        cell: ({ row }) => (
          <StatusBadge
            label={FRANCHISE_STATUS_LABELS[row.original.status]}
            tone={franchiseStatusTone(row.original.status)}
          />
        ),
      },
      {
        id: "training",
        header: "Training",
        meta: { align: "center", hideOnMobile: true } satisfies ColumnMetaConfig,
        cell: ({ row }) => (
          <span className="whitespace-nowrap tabular-nums text-ink-soft">
            {row.original.trainingComplete}/{row.original.trainingTotal || "—"}
          </span>
        ),
      },
      {
        id: "setup",
        header: "Setup",
        meta: { align: "center", hideOnMobile: true } satisfies ColumnMetaConfig,
        cell: ({ row }) => (
          <span className="whitespace-nowrap tabular-nums text-ink-soft">
            {row.original.setupComplete}/{row.original.setupTotal || "—"}
          </span>
        ),
      },
      {
        id: "activation_date",
        header: "Activated",
        meta: { sortKey: "activation_date", hideOnMobile: true } satisfies ColumnMetaConfig,
        cell: ({ row }) => (
          <span className="whitespace-nowrap text-ink-soft">
            {row.original.activation_date
              ? formatDate(row.original.activation_date)
              : "—"}
          </span>
        ),
      },
    ],
    [basePath],
  );

  return (
    <DataTable
      {...shared}
      data={rows}
      columns={columns}
      searchPlaceholder="Search franchise, owner or territory…"
      filters={[
        {
          key: "status",
          label: "Status",
          options: FRANCHISE_STATUSES.map((value) => ({
            value,
            label: FRANCHISE_STATUS_LABELS[value],
          })),
        },
      ]}
      rowHref={(row) => `${basePath}/${row.leadId}?tab=activation`}
      emptyTitle="No franchises yet"
      emptyBody="A franchise appears here the moment an approved, paid-up lead is activated."
    />
  );
}
