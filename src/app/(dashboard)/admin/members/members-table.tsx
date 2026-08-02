"use client";

import { useMemo, useState } from "react";
import * as Avatar from "@radix-ui/react-avatar";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import type { ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal, ShieldCheck, UserCheck, UserX } from "lucide-react";
import { setMemberStatus } from "@/app/actions/members";
import { DataTable, type ColumnMetaConfig } from "@/components/data-table/data-table";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { formatDate, formatPhone, initialsOf } from "@/lib/format";
import { formatNumber } from "@/lib/utils";

export type MemberRowData = {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  role: "ADMIN" | "MEMBER";
  status: "ACTIVE" | "INACTIVE";
  created_at: string;
  assignedLeads: number;
  acceptedLeads: number;
  /** The signed-in admin cannot deactivate their own account. */
  isSelf: boolean;
  avatar_url?: string | null;
};

type PendingChange = { row: MemberRowData; next: "ACTIVE" | "INACTIVE" };

export function MembersTable({
  rows,
  total,
  page,
  pageSize,
  sort,
  dir,
  inviteButton,
}: {
  rows: MemberRowData[];
  total: number;
  page: number;
  pageSize: number;
  sort: string | null;
  dir: "asc" | "desc";
  inviteButton: React.ReactNode;
}) {
  const [pending, setPending] = useState<PendingChange | null>(null);

  const columns = useMemo<ColumnDef<MemberRowData, unknown>[]>(
    () => [
      {
        id: "full_name",
        header: "Member",
        meta: { sortKey: "full_name" } satisfies ColumnMetaConfig,
        cell: ({ row }) => (
          <div className="flex items-center gap-2.5">
            <Avatar.Root className="inline-flex size-8 select-none items-center justify-center overflow-hidden rounded-full align-middle bg-brand-crimson/10 shrink-0">
              <Avatar.Image
                className="size-full object-cover"
                src={row.original.avatar_url || undefined}
                alt={row.original.full_name}
              />
              <Avatar.Fallback className="text-[0.7rem] font-bold text-brand-crimson">
                {initialsOf(row.original.full_name)}
              </Avatar.Fallback>
            </Avatar.Root>
            <div className="min-w-0">
              <p className="truncate font-medium text-ink">
                {row.original.full_name}
                {row.original.isSelf && (
                  <span className="ml-1.5 text-[0.7rem] font-normal text-ink-soft">
                    (you)
                  </span>
                )}
              </p>
              <p className="truncate text-[0.72rem] text-ink-soft">
                {row.original.email}
              </p>
            </div>
          </div>
        ),
      },
      {
        id: "phone",
        header: "Phone",
        meta: { hideOnMobile: true } satisfies ColumnMetaConfig,
        cell: ({ row }) => (
          <span className="whitespace-nowrap text-ink-soft">
            {formatPhone(row.original.phone)}
          </span>
        ),
      },
      {
        id: "role",
        header: "Role",
        meta: { sortKey: "role", hideOnMobile: true } satisfies ColumnMetaConfig,
        cell: ({ row }) =>
          row.original.role === "ADMIN" ? (
            <Badge tone="info">
              <ShieldCheck className="size-3" aria-hidden="true" />
              Administrator
            </Badge>
          ) : (
            <Badge tone="neutral">Member</Badge>
          ),
      },
      {
        id: "status",
        header: "Status",
        meta: { sortKey: "status" } satisfies ColumnMetaConfig,
        cell: ({ row }) => (
          <StatusBadge
            label={row.original.status === "ACTIVE" ? "Active" : "Deactivated"}
            tone={row.original.status === "ACTIVE" ? "success" : "neutral"}
          />
        ),
      },
      {
        id: "assignedLeads",
        header: "Leads",
        meta: { align: "right", hideOnMobile: true } satisfies ColumnMetaConfig,
        cell: ({ row }) => (
          <span className="tabular-nums text-ink">
            {formatNumber(row.original.assignedLeads)}
          </span>
        ),
      },
      {
        id: "acceptedLeads",
        header: "Accepted",
        meta: { align: "right", hideOnMobile: true } satisfies ColumnMetaConfig,
        cell: ({ row }) => (
          <span className="tabular-nums text-ink-soft">
            {formatNumber(row.original.acceptedLeads)}
          </span>
        ),
      },
      {
        id: "created_at",
        header: "Joined",
        meta: { sortKey: "created_at", hideOnMobile: true } satisfies ColumnMetaConfig,
        cell: ({ row }) => (
          <span className="whitespace-nowrap text-ink-soft">
            {formatDate(row.original.created_at)}
          </span>
        ),
      },
      {
        id: "actions",
        header: "",
        meta: { align: "right", locked: true } satisfies ColumnMetaConfig,
        cell: ({ row }) => {
          const member = row.original;
          const canDeactivate = !(member.isSelf && member.role === "ADMIN");

          return (
            <DropdownMenu.Root>
              <DropdownMenu.Trigger
                aria-label={`Actions for ${member.full_name}`}
                className="grid size-8 place-items-center rounded-lg text-ink-soft transition hover:bg-surface-muted hover:text-ink"
              >
                <MoreHorizontal className="size-4" />
              </DropdownMenu.Trigger>
              <DropdownMenu.Portal>
                <DropdownMenu.Content
                  align="end"
                  sideOffset={4}
                  className="z-50 min-w-[11rem] rounded-xl border border-line bg-surface p-1.5 shadow-xl"
                >
                  {member.status === "ACTIVE" ? (
                    <DropdownMenu.Item
                      disabled={!canDeactivate}
                      onSelect={() =>
                        setPending({ row: member, next: "INACTIVE" })
                      }
                      className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-[0.8rem] text-danger outline-none data-[disabled]:pointer-events-none data-[highlighted]:bg-danger/5 data-[disabled]:opacity-40"
                    >
                      <UserX className="size-4" />
                      Deactivate
                    </DropdownMenu.Item>
                  ) : (
                    <DropdownMenu.Item
                      onSelect={() => setPending({ row: member, next: "ACTIVE" })}
                      className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-[0.8rem] text-ink outline-none data-[highlighted]:bg-surface-muted"
                    >
                      <UserCheck className="size-4" />
                      Reactivate
                    </DropdownMenu.Item>
                  )}
                </DropdownMenu.Content>
              </DropdownMenu.Portal>
            </DropdownMenu.Root>
          );
        },
      },
    ],
    [],
  );

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
        searchPlaceholder="Search name or email…"
        filters={[
          {
            key: "status",
            label: "Status",
            options: [
              { value: "ACTIVE", label: "Active" },
              { value: "INACTIVE", label: "Deactivated" },
            ],
          },
          {
            key: "role",
            label: "Role",
            options: [
              { value: "ADMIN", label: "Administrator" },
              { value: "MEMBER", label: "Member" },
            ],
          },
        ]}
        emptyTitle="No team members match this view"
        emptyBody="Invite a member to start assigning leads through round-robin."
        emptyAction={inviteButton}
      />

      {pending && (
        <ConfirmDialog
          open
          onOpenChange={(open) => !open && setPending(null)}
          variant={pending.next === "INACTIVE" ? "danger" : "primary"}
          title={
            pending.next === "INACTIVE"
              ? `Deactivate ${pending.row.full_name}?`
              : `Reactivate ${pending.row.full_name}?`
          }
          confirmLabel={
            pending.next === "INACTIVE" ? "Deactivate" : "Reactivate"
          }
          successMessage={
            pending.next === "INACTIVE"
              ? `${pending.row.full_name} can no longer sign in.`
              : `${pending.row.full_name} can sign in again.`
          }
          onConfirm={() => setMemberStatus(pending.row.id, pending.next)}
        >
          <p className="text-[0.82rem] leading-relaxed text-ink-soft">
            {pending.next === "INACTIVE" ? (
              <>
                They will be signed out and removed from the round-robin
                rotation. Their {formatNumber(pending.row.assignedLeads)}{" "}
                assigned {pending.row.assignedLeads === 1 ? "lead" : "leads"}{" "}
                stay on their name until reassigned, and their history is kept.
              </>
            ) : (
              <>
                They will be able to sign in with Google again and will re-enter
                the round-robin rotation.
              </>
            )}
          </p>
        </ConfirmDialog>
      )}
    </>
  );
}
