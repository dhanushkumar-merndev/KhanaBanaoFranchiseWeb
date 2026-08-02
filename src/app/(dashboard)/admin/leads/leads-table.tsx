"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import type { ColumnDef } from "@tanstack/react-table";
import {
  AlertTriangle,
  CalendarClock,
  Download,
  LoaderCircle,
  MoreVertical,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import {
  deleteLeadPermanently,
  prepareLeadExport,
} from "@/app/actions/lead-admin";
import { DataTable, type ColumnMetaConfig } from "@/components/data-table/data-table";
import type { FilterConfig } from "@/components/data-table/toolbar";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  LEAD_SOURCES,
  LEAD_SOURCE_LABELS,
  LEAD_STATUSES,
  LEAD_STATUS_LABELS,
  type LeadSource,
  type LeadStatus,
} from "@/lib/domain/enums";
import { leadPipelineLabel, leadPipelineTone } from "@/lib/domain/status";
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
  adminActions = false,
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
  /** Adds permanent export/delete controls. Never enable on member pages. */
  adminActions?: boolean;
  toolbarActions?: React.ReactNode;
  emptyAction?: React.ReactNode;
}) {
  const router = useRouter();
  const [exportingId, setExportingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<LeadTableRow | null>(null);

  const downloadLead = useCallback(async (lead: LeadTableRow) => {
    setExportingId(lead.id);
    const toastId = toast.loading(`Preparing ${lead.lead_number}…`);
    try {
      const prepared = await prepareLeadExport(lead.id);
      if (!prepared.ok) {
        toast.error(prepared.message, { id: toastId });
        return;
      }

      toast.loading("Creating Excel workbook and ZIP in this browser…", {
        id: toastId,
      });
      const { downloadLeadArchive } = await import(
        "@/lib/client/lead-export-browser"
      );
      const result = await downloadLeadArchive(prepared.data);
      toast.success(
        result.missingFiles
          ? `ZIP downloaded. ${result.missingFiles} file${result.missingFiles === 1 ? " was" : "s were"} unavailable; see README.txt inside.`
          : "Complete lead ZIP downloaded.",
        { id: toastId, duration: 6000 },
      );
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "The lead export could not be created.",
        { id: toastId },
      );
    } finally {
      setExportingId(null);
    }
  }, []);

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
            label={leadPipelineLabel(row.original.current_status)}
            tone={leadPipelineTone(row.original.current_status)}
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
      ...(adminActions
        ? [
            {
              id: "actions",
              header: "",
              meta: {
                align: "right",
                locked: true,
              } satisfies ColumnMetaConfig,
              cell: ({ row }) => {
                const lead = row.original;
                const exporting = exportingId === lead.id;
                return (
                  <DropdownMenu.Root>
                    <DropdownMenu.Trigger
                      aria-label={`Actions for ${lead.full_name}`}
                      className="grid size-8 place-items-center rounded-lg text-ink-soft transition hover:bg-surface-muted hover:text-ink"
                    >
                      {exporting ? (
                        <LoaderCircle className="size-4 animate-spin" />
                      ) : (
                        <MoreVertical className="size-4" />
                      )}
                    </DropdownMenu.Trigger>
                    <DropdownMenu.Portal>
                      <DropdownMenu.Content
                        align="end"
                        sideOffset={4}
                        className="z-50 min-w-[13rem] rounded-xl border border-line bg-surface p-1.5 shadow-xl"
                      >
                        <DropdownMenu.Item
                          disabled={exporting}
                          onSelect={() => void downloadLead(lead)}
                          className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-[0.8rem] text-ink outline-none data-[disabled]:pointer-events-none data-[highlighted]:bg-surface-muted data-[disabled]:opacity-50"
                        >
                          {exporting ? (
                            <LoaderCircle className="size-4 animate-spin" />
                          ) : (
                            <Download className="size-4" />
                          )}
                          Download complete record
                        </DropdownMenu.Item>
                        <DropdownMenu.Separator className="my-1 h-px bg-line" />
                        <DropdownMenu.Item
                          onSelect={() => setDeleteTarget(lead)}
                          className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-[0.8rem] text-danger outline-none data-[highlighted]:bg-danger/5"
                        >
                          <Trash2 className="size-4" />
                          Delete permanently
                        </DropdownMenu.Item>
                      </DropdownMenu.Content>
                    </DropdownMenu.Portal>
                  </DropdownMenu.Root>
                );
              },
            } satisfies ColumnDef<LeadTableRow, unknown>,
          ]
        : []),
    ],
    [adminActions, basePath, downloadLead, exportingId],
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
    <>
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

      {deleteTarget && (
        <ConfirmDialog
          open
          onOpenChange={(open) => !open && setDeleteTarget(null)}
          variant="danger"
          title={`Permanently delete ${deleteTarget.full_name}?`}
          description={`${deleteTarget.lead_number} · ${deleteTarget.email}`}
          confirmLabel="Delete everything"
          onConfirm={async () => {
            const result = await deleteLeadPermanently(deleteTarget.id);
            if (result.ok) {
              if (result.data.cleanupWarning) {
                toast.warning(result.data.cleanupWarning, { duration: 7000 });
              }
              router.refresh();
            }
            return result;
          }}
          successMessage={`${deleteTarget.lead_number} and all related records were permanently deleted.`}
        >
          <div className="space-y-3 text-[0.82rem] leading-relaxed text-ink-soft">
            <p>
              This removes the lead, application, document history, uploaded
              files, follow-ups, activities, agreements, payments, franchise,
              training, setup and related email/audit records.
            </p>
            <p className="rounded-lg border border-danger/25 bg-danger/5 px-3 py-2 font-medium text-danger">
              This cannot be undone. Download the complete record first if it
              must be retained.
            </p>
          </div>
        </ConfirmDialog>
      )}
    </>
  );
}
