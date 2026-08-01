import { StatusBadge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/feedback";
import type { MemberPerformance } from "@/lib/stats/dashboard";
import { initialsOf } from "@/lib/format";
import { formatNumber } from "@/lib/utils";

const COLUMNS: { key: keyof MemberPerformance; label: string; short: string }[] = [
  { key: "assignedLeads", label: "Assigned leads", short: "Assigned" },
  { key: "contactedLeads", label: "Contacted leads", short: "Contacted" },
  { key: "followupsCompleted", label: "Follow-ups completed", short: "Follow-ups" },
  { key: "acceptedLeads", label: "Accepted", short: "Accepted" },
  { key: "rejectedLeads", label: "Rejected", short: "Rejected" },
  { key: "applicationsSent", label: "Applications sent", short: "Apps sent" },
  { key: "documentsCollected", label: "Documents collected", short: "Docs" },
  { key: "paymentProofsSubmitted", label: "Payment proofs submitted", short: "Proofs" },
  { key: "liveConversions", label: "Live conversions", short: "Live" },
];

/**
 * Static server-rendered table — this is a read-only summary of at most 20
 * rows, so it does not need the sorting/paging machinery of DataTable.
 */
export function MemberPerformanceTable({ rows }: { rows: MemberPerformance[] }) {
  if (rows.length === 0) {
    return (
      <EmptyState
        title="No members yet"
        body="Invite your team and their numbers will show up here."
      />
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[52rem] border-collapse text-sm">
        <caption className="sr-only">
          Pipeline activity per member since the account was created
        </caption>
        <thead>
          <tr>
            <th
              scope="col"
              className="sticky left-0 z-10 bg-surface px-3 py-2 text-left text-[0.68rem] font-bold uppercase tracking-wider text-ink-soft"
            >
              Member
            </th>
            {COLUMNS.map((column) => (
              <th
                key={column.key}
                scope="col"
                title={column.label}
                className="whitespace-nowrap px-3 py-2 text-right text-[0.68rem] font-bold uppercase tracking-wider text-ink-soft"
              >
                {column.short}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.memberId}
              className="border-t border-line/70 hover:bg-surface-muted/50"
            >
              <th
                scope="row"
                className="sticky left-0 z-10 bg-surface px-3 py-2.5 text-left font-normal"
              >
                <span className="flex items-center gap-2.5">
                  <span className="grid size-7 shrink-0 place-items-center rounded-full bg-brand-crimson/10 text-[0.65rem] font-bold text-brand-crimson">
                    {initialsOf(row.fullName)}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate font-medium text-ink">
                      {row.fullName}
                    </span>
                    {row.status === "INACTIVE" && (
                      <StatusBadge
                        label="Deactivated"
                        tone="neutral"
                        className="mt-1"
                      />
                    )}
                  </span>
                </span>
              </th>
              {COLUMNS.map((column) => {
                const value = row[column.key] as number;
                return (
                  <td
                    key={column.key}
                    className={[
                      "whitespace-nowrap px-3 py-2.5 text-right tabular-nums",
                      value === 0 ? "text-ink-soft/50" : "text-ink",
                    ].join(" ")}
                  >
                    {formatNumber(value)}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
