"use client";

import { useMemo } from "react";
import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import { AlertTriangle, CalendarClock } from "lucide-react";
import { DataTable, type ColumnMetaConfig } from "@/components/data-table/data-table";
import type { FilterConfig } from "@/components/data-table/toolbar";
import { Badge, StatusBadge } from "@/components/ui/badge";
import {
  LEAD_SOURCES,
  LEAD_SOURCE_LABELS,
  LEAD_STATUSES,
  LEAD_STATUS_LABELS,
  type LeadSource,
  type LeadStatus,
} from "@/lib/domain/enums";
import { leadStatusTone } from "@/lib/domain/status";
import { formatDate, formatPhone, formatRelative } from "@/lib/format";

export type LeadTableRow = {
  id: string;
  lead_number: string;
  full_name: string;
  phone: string;
  email: string;
  city: string;
  source: LeadSource;
  current_status: LeadStatus;
  next_followup_at: string | null;
  created_at: string;
  assignedMemberName: string | null;
  followupOverdue: boolean;
};

export function LeadsTable({
  rows,
  total,
  page,
  pageSize,
  sort,
  dir,
  basePath,
  memberOptions,
  toolbarActions,
  emptyAction,
}: {
  rows: LeadTableRow[];
  total: number;
  page: number;
  pageSize: number;
  sort: string | null;
  dir: "asc" | "desc";
  /** `/admin/leads` or `/member/leads` — drives the row link target. */
  basePath: string;
  /** Admin only; omit to hide the member filter. */
  memberOptions?: { value: string; label: string }[];
  toolbarActions?: React.ReactNode;
  emptyAction?: React.ReactNode;
}) {
  const columns = useMemo<ColumnDef<LeadTableRow, unknown>[]>(
    () => [
      {
        id: "lead_number",
        header: "Lead",
        meta: { sortKey: "lead_number" } satisfies ColumnMetaConfig,
        cell: ({ row }) => (
          <div className="min-w-0">
            <Link
              href={`${basePath}/${row.original.id}`}
              className="block truncate font-medium text-ink hover:text-brand-crimson"
            >
              {row.original.full_name}
            </Link>
            <p className="truncate font-mono text-[0.68rem] uppercase text-ink-soft">
              {row.original.lead_number}
            </p>
          </div>
        ),
      },
      {
        id: "phone",
        header: "Contact",
        meta: { hideOnMobile: true } satisfies ColumnMetaConfig,
        cell: ({ row }) => (
          <div className="min-w-0">
            <p className="whitespace-nowrap text-ink">
              {formatPhone(row.original.phone)}
            </p>
            <p className="truncate text-[0.7rem] text-ink-soft">
              {row.original.email}
            </p>
          </div>
        ),
      },
      {
        id: "city",
        header: "City",
        meta: { sortKey: "city", hideOnMobile: true } satisfies ColumnMetaConfig,
        cell: ({ row }) => <span className="text-ink-soft">{row.original.city}</span>,
      },
      {
        id: "current_status",
        header: "Status",
        meta: { sortKey: "current_status" } satisfies ColumnMetaConfig,
        cell: ({ row }) => (
          <StatusBadge
            label={LEAD_STATUS_LABELS[row.original.current_status]}
            tone={leadStatusTone(row.original.current_status)}
          />
        ),
      },
      {
        id: "assignedMemberName",
        header: "Assigned to",
        meta: { hideOnMobile: true } satisfies ColumnMetaConfig,
        cell: ({ row }) =>
          row.original.assignedMemberName ? (
            <span className="whitespace-nowrap text-ink-soft">
              {row.original.assignedMemberName}
            </span>
          ) : (
            // Unassigned leads must be obvious to the admin (spec §9.8).
            <Badge tone="warn">
              <AlertTriangle className="size-3" aria-hidden="true" />
              Unassigned
            </Badge>
          ),
      },
      {
        id: "source",
        header: "Source",
        meta: { hideOnMobile: true } satisfies ColumnMetaConfig,
        cell: ({ row }) => (
          <span className="whitespace-nowrap text-ink-soft">
            {LEAD_SOURCE_LABELS[row.original.source]}
          </span>
        ),
      },
      {
        id: "next_followup_at",
        header: "Follow-up",
        meta: { sortKey: "next_followup_at", hideOnMobile: true } satisfies ColumnMetaConfig,
        cell: ({ row }) => {
          const due = row.original.next_followup_at;
          if (!due) return <span className="text-ink-soft/50">—</span>;
          const overdue = row.original.followupOverdue;
          return (
            <span
              className={[
                "inline-flex items-center gap-1 whitespace-nowrap",
                overdue ? "font-medium text-danger" : "text-ink-soft",
              ].join(" ")}
            >
              <CalendarClock className="size-3.5" aria-hidden="true" />
              {formatRelative(due)}
            </span>
          );
        },
      },
      {
        id: "created_at",
        header: "Created",
        meta: { sortKey: "created_at", hideOnMobile: true } satisfies ColumnMetaConfig,
        cell: ({ row }) => (
          <span className="whitespace-nowrap text-ink-soft">
            {formatDate(row.original.created_at)}
          </span>
        ),
      },
    ],
    [basePath],
  );

  const filters: FilterConfig[] = [
    {
      key: "status",
      label: "Status",
      options: LEAD_STATUSES.map((value) => ({
        value,
        label: LEAD_STATUS_LABELS[value],
      })),
    },
    {
      key: "source",
      label: "Source",
      options: LEAD_SOURCES.map((value) => ({
        value,
        label: LEAD_SOURCE_LABELS[value],
      })),
    },
  ];

  if (memberOptions) {
    filters.push({ key: "member", label: "Member", options: memberOptions });
    filters.push({
      key: "assigned",
      label: "Assignment",
      options: [
        { value: "no", label: "Unassigned only" },
        { value: "yes", label: "Assigned only" },
      ],
    });
  }

  return (
    <DataTable
      data={rows}
      columns={columns}
      total={total}
      page={page}
      pageSize={pageSize}
      sort={sort}
      dir={dir}
      searchPlaceholder="Search name, phone, email or lead number…"
      filters={filters}
      toolbarActions={toolbarActions}
      rowHref={(row) => `${basePath}/${row.id}`}
      emptyTitle="No leads match this view"
      emptyBody="Clear the filters, or add a lead that came in by phone or WhatsApp."
      emptyAction={emptyAction}
    />
  );
}
