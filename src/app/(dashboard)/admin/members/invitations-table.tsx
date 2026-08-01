"use client";

import { useMemo, useState } from "react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import type { ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal, Send, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { resendInvitation, revokeInvitation } from "@/app/actions/members";
import { DataTable, type ColumnMetaConfig } from "@/components/data-table/data-table";
import { StatusBadge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { formatDateTime, formatPhone, formatRelative } from "@/lib/format";
import type { InvitationStatus } from "@/lib/domain/enums";
import type { StatusTone } from "@/lib/domain/status";

export type InvitationRowData = {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  status: InvitationStatus;
  created_at: string;
  expires_at: string;
  accepted_at: string | null;
  invitedByName: string | null;
  /** PENDING rows whose expiry has already passed. */
  isExpired: boolean;
};

const INVITATION_LABELS: Record<InvitationStatus, string> = {
  PENDING: "Pending",
  ACCEPTED: "Accepted",
  EXPIRED: "Expired",
  REVOKED: "Revoked",
};

const INVITATION_TONES: Record<InvitationStatus, StatusTone> = {
  PENDING: "warn",
  ACCEPTED: "success",
  EXPIRED: "neutral",
  REVOKED: "neutral",
};

export function InvitationsTable({
  rows,
  total,
  page,
  pageSize,
  sort,
  dir,
  inviteButton,
}: {
  rows: InvitationRowData[];
  total: number;
  page: number;
  pageSize: number;
  sort: string | null;
  dir: "asc" | "desc";
  inviteButton: React.ReactNode;
}) {
  const [revoking, setRevoking] = useState<InvitationRowData | null>(null);
  const [resending, setResending] = useState<string | null>(null);

  const resend = async (row: InvitationRowData) => {
    setResending(row.id);
    try {
      const result = await resendInvitation(row.id);
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success(
        result.data.emailSent
          ? `Invitation re-sent to ${row.email}.`
          : `Expiry extended, but the email could not be sent. Check the email logs.`,
      );
    } finally {
      setResending(null);
    }
  };

  const columns = useMemo<ColumnDef<InvitationRowData, unknown>[]>(
    () => [
      {
        id: "full_name",
        header: "Invitee",
        meta: { sortKey: "full_name" } satisfies ColumnMetaConfig,
        cell: ({ row }) => (
          <div className="min-w-0">
            <p className="truncate font-medium text-ink">
              {row.original.full_name}
            </p>
            <p className="truncate text-[0.72rem] text-ink-soft">
              {row.original.email}
            </p>
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
        id: "status",
        header: "Status",
        meta: { sortKey: "status" } satisfies ColumnMetaConfig,
        cell: ({ row }) => {
          // A PENDING row past its expiry is really expired; the nightly sweep
          // just has not relabelled it yet.
          const effective: InvitationStatus = row.original.isExpired
            ? "EXPIRED"
            : row.original.status;
          return (
            <StatusBadge
              label={INVITATION_LABELS[effective]}
              tone={INVITATION_TONES[effective]}
            />
          );
        },
      },
      {
        id: "expires_at",
        header: "Expires",
        meta: { sortKey: "expires_at", hideOnMobile: true } satisfies ColumnMetaConfig,
        cell: ({ row }) =>
          row.original.status === "ACCEPTED" ? (
            <span className="whitespace-nowrap text-ink-soft">
              Accepted {formatRelative(row.original.accepted_at)}
            </span>
          ) : (
            <span
              className="whitespace-nowrap text-ink-soft"
              title={formatDateTime(row.original.expires_at)}
            >
              {formatRelative(row.original.expires_at)}
            </span>
          ),
      },
      {
        id: "invitedBy",
        header: "Invited by",
        meta: { hideOnMobile: true } satisfies ColumnMetaConfig,
        cell: ({ row }) => (
          <span className="text-ink-soft">
            {row.original.invitedByName ?? "—"}
          </span>
        ),
      },
      {
        id: "actions",
        header: "",
        meta: { align: "right", locked: true } satisfies ColumnMetaConfig,
        cell: ({ row }) => {
          if (row.original.status !== "PENDING") {
            return <span className="text-ink-soft/50">—</span>;
          }
          return (
            <DropdownMenu.Root>
              <DropdownMenu.Trigger
                aria-label={`Actions for ${row.original.email}`}
                disabled={resending === row.original.id}
                className="grid size-8 place-items-center rounded-lg text-ink-soft transition hover:bg-surface-muted hover:text-ink disabled:opacity-40"
              >
                <MoreHorizontal className="size-4" />
              </DropdownMenu.Trigger>
              <DropdownMenu.Portal>
                <DropdownMenu.Content
                  align="end"
                  sideOffset={4}
                  className="z-50 min-w-[12rem] rounded-xl border border-line bg-surface p-1.5 shadow-xl"
                >
                  <DropdownMenu.Item
                    onSelect={() => void resend(row.original)}
                    className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-[0.8rem] text-ink outline-none data-[highlighted]:bg-surface-muted"
                  >
                    <Send className="size-4" />
                    Resend invitation
                  </DropdownMenu.Item>
                  <DropdownMenu.Item
                    onSelect={() => setRevoking(row.original)}
                    className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-[0.8rem] text-danger outline-none data-[highlighted]:bg-danger/5"
                  >
                    <Trash2 className="size-4" />
                    Revoke
                  </DropdownMenu.Item>
                </DropdownMenu.Content>
              </DropdownMenu.Portal>
            </DropdownMenu.Root>
          );
        },
      },
    ],
    [resending],
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
        searchPlaceholder="Search invitee or email…"
        filters={[
          {
            key: "status",
            label: "Status",
            options: (
              ["PENDING", "ACCEPTED", "EXPIRED", "REVOKED"] as const
            ).map((value) => ({ value, label: INVITATION_LABELS[value] })),
          },
        ]}
        emptyTitle="No invitations here"
        emptyBody="Invitations appear here from the moment they are sent until they are accepted, revoked or expire."
        emptyAction={inviteButton}
      />

      {revoking && (
        <ConfirmDialog
          open
          onOpenChange={(open) => !open && setRevoking(null)}
          variant="danger"
          title={`Revoke the invitation for ${revoking.full_name}?`}
          confirmLabel="Revoke"
          successMessage="Invitation revoked."
          onConfirm={() => revokeInvitation(revoking.id)}
        >
          <p className="text-[0.82rem] leading-relaxed text-ink-soft">
            The link in their email stops working immediately. You can invite{" "}
            {revoking.email} again later.
          </p>
        </ConfirmDialog>
      )}
    </>
  );
}
