"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";
import { Check } from "lucide-react";
import { toast } from "sonner";
import { completeFollowup } from "@/app/actions/leads";
import { DataTable, type ColumnMetaConfig } from "@/components/data-table/data-table";
import type { FilterConfig } from "@/components/data-table/toolbar";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LEAD_STATUS_LABELS } from "@/lib/domain/enums";
import { leadStatusTone } from "@/lib/domain/status";
import { formatDateTime, formatPhone, formatRelative } from "@/lib/format";
import type { FollowupQueueRow } from "@/lib/data/followups";

export function FollowupQueueTable({
  rows,
  total,
  page,
  pageSize,
  sort,
  dir,
  basePath,
  view,
  memberOptions,
}: {
  rows: FollowupQueueRow[];
  total: number;
  page: number;
  pageSize: number;
  sort: string | null;
  dir: "asc" | "desc";
  /** `/admin/leads` or `/member/leads` — where a row links to. */
  basePath: string;
  view: string;
  memberOptions?: { value: string; label: string }[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);

  const complete = async (followupId: string) => {
    setBusy(followupId);
    try {
      const result = await completeFollowup(followupId);
      if (result.ok) {
        toast.success("Follow-up completed.");
        router.refresh();
      } else {
        toast.error(result.message);
      }
    } finally {
      setBusy(null);
    }
  };

  const columns = useMemo<ColumnDef<FollowupQueueRow, unknown>[]>(
    () => [
      {
        id: "due_at",
        header: view === "completed" ? "Completed" : "Due",
        meta: { sortKey: view === "completed" ? "completed_at" : "due_at" } satisfies ColumnMetaConfig,
        cell: ({ row }) => {
          const stamp =
            view === "completed"
              ? (row.original.completed_at ?? row.original.due_at)
              : row.original.due_at;
          const overdue = row.original.isOverdue;
          return (
            <div className="min-w-0">
              <p
                className={[
                  "whitespace-nowrap text-[0.82rem]",
                  overdue ? "font-semibold text-danger" : "text-ink",
                ].join(" ")}
              >
                {formatDateTime(stamp)}
              </p>
              <p className="text-[0.7rem] text-ink-soft">
                {formatRelative(stamp)}
                {overdue && " · overdue"}
              </p>
            </div>
          );
        },
      },
      {
        id: "lead",
        header: "Lead",
        cell: ({ row }) => (
          <div className="min-w-0">
            <Link
              href={`${basePath}/${row.original.lead_id}?tab=followups`}
              className="block truncate font-medium text-ink hover:text-brand-crimson"
            >
              {row.original.leadName}
            </Link>
            <p className="truncate font-mono text-[0.68rem] uppercase text-ink-soft">
              {row.original.leadNumber}
            </p>
          </div>
        ),
      },
      {
        id: "phone",
        header: "Phone",
        meta: { hideOnMobile: true } satisfies ColumnMetaConfig,
        cell: ({ row }) => (
          <a
            href={`tel:${row.original.leadPhone}`}
            className="whitespace-nowrap text-ink-soft hover:text-brand-crimson"
          >
            {formatPhone(row.original.leadPhone)}
          </a>
        ),
      },
      {
        id: "leadStatus",
        header: "Lead status",
        meta: { hideOnMobile: true } satisfies ColumnMetaConfig,
        cell: ({ row }) => (
          <StatusBadge
            label={LEAD_STATUS_LABELS[row.original.leadStatus]}
            tone={leadStatusTone(row.original.leadStatus)}
          />
        ),
      },
      {
        id: "note",
        header: "Note",
        meta: { hideOnMobile: true } satisfies ColumnMetaConfig,
        cell: ({ row }) => (
          <span className="line-clamp-2 max-w-[22rem] text-[0.8rem] text-ink-soft">
            {row.original.note ?? "—"}
          </span>
        ),
      },
      ...(memberOptions
        ? [
            {
              id: "memberName",
              header: "Member",
              meta: { hideOnMobile: true } satisfies ColumnMetaConfig,
              cell: ({ row }: { row: { original: FollowupQueueRow } }) => (
                <span className="whitespace-nowrap text-ink-soft">
                  {row.original.memberName ?? "—"}
                </span>
              ),
            } as ColumnDef<FollowupQueueRow, unknown>,
          ]
        : []),
      {
        id: "actions",
        header: "",
        meta: { align: "right", locked: true } satisfies ColumnMetaConfig,
        cell: ({ row }) =>
          row.original.status === "PENDING" ? (
            <Button
              size="sm"
              variant="outline"
              loading={busy === row.original.id}
              onClick={() => void complete(row.original.id)}
            >
              <Check />
              Done
            </Button>
          ) : null,
      },
    ],
    // `complete` is stable enough for this table's lifetime.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [basePath, busy, memberOptions, view],
  );

  const filters: FilterConfig[] = memberOptions
    ? [{ key: "member", label: "Member", options: memberOptions }]
    : [];

  return (
    <DataTable
      data={rows}
      columns={columns}
      total={total}
      page={page}
      pageSize={pageSize}
      sort={sort}
      dir={dir}
      filters={filters}
      searchable={false}
      emptyTitle={
        view === "overdue"
          ? "Nothing is overdue"
          : view === "today"
            ? "Nothing is due today"
            : view === "upcoming"
              ? "Nothing scheduled ahead"
              : "No completed follow-ups yet"
      }
      emptyBody={
        view === "overdue"
          ? "Every commitment is either done or still ahead of its due date."
          : "Follow-ups are scheduled from a lead's page."
      }
    />
  );
}
