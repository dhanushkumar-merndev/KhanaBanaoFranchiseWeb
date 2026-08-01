import {
  AlertTriangle,
  CalendarClock,
  Mail,
  MapPin,
  Phone,
  User,
} from "lucide-react";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { LEAD_STATUS_LABELS } from "@/lib/domain/enums";
import { leadStatusTone } from "@/lib/domain/status";
import { formatDate, formatDateTime, formatPhone, formatRelative } from "@/lib/format";
import type { LeadDetail } from "@/lib/data/lead-detail";

function Detail({
  icon: IconCmp,
  label,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-2">
      <IconCmp className="mt-0.5 size-3.5 shrink-0 text-ink-soft" aria-hidden="true" />
      <div className="min-w-0">
        <dt className="text-[0.68rem] font-semibold uppercase tracking-wide text-ink-soft">
          {label}
        </dt>
        <dd className="truncate text-[0.82rem] text-ink">{children}</dd>
      </div>
    </div>
  );
}

/** The identity block at the top of the lead page (spec §11). */
export function LeadHeader({ lead }: { lead: LeadDetail }) {
  const overdue = lead.nextFollowupOverdue;

  return (
    <header className="rounded-xl border border-line bg-surface p-4 shadow-[0_10px_30px_-24px_rgba(110,40,20,0.5)] md:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-display text-xl font-bold text-ink md:text-2xl">
              {lead.full_name}
            </h1>
            <StatusBadge
              label={LEAD_STATUS_LABELS[lead.current_status]}
              tone={leadStatusTone(lead.current_status)}
            />
          </div>
          <p className="mt-1 font-mono text-[0.72rem] uppercase tracking-wide text-ink-soft">
            {lead.lead_number}
          </p>
        </div>
      </div>

      <dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Detail icon={Phone} label="Phone">
          <a href={`tel:${lead.phone}`} className="hover:text-brand-crimson">
            {formatPhone(lead.phone)}
          </a>
        </Detail>

        <Detail icon={Mail} label="Email">
          <a href={`mailto:${lead.email}`} className="hover:text-brand-crimson">
            {lead.email}
          </a>
        </Detail>

        <Detail icon={MapPin} label="City">
          {lead.city}
        </Detail>

        <Detail icon={User} label="Assigned member">
          {lead.assignedMemberName ?? (
            <Badge tone="warn">
              <AlertTriangle className="size-3" aria-hidden="true" />
              Unassigned
            </Badge>
          )}
        </Detail>

        <Detail icon={CalendarClock} label="Created">
          <span title={formatDateTime(lead.created_at)}>
            {formatDate(lead.created_at)}
          </span>
        </Detail>

        <Detail icon={CalendarClock} label="Next follow-up">
          {lead.next_followup_at ? (
            <span
              className={overdue ? "font-medium text-danger" : undefined}
              title={formatDateTime(lead.next_followup_at)}
            >
              {formatDateTime(lead.next_followup_at)}
              {overdue && " · overdue"}
            </span>
          ) : (
            <span className="text-ink-soft">None scheduled</span>
          )}
        </Detail>
      </dl>

      {lead.current_status === "REJECTED" && lead.rejection_reason && (
        <p
          role="note"
          className="mt-4 rounded-lg border border-danger/25 bg-danger/5 px-3 py-2.5 text-[0.8rem] leading-relaxed text-ink"
        >
          <span className="font-semibold text-danger">Rejected:</span>{" "}
          {lead.rejection_reason}
          <span className="ml-1 text-ink-soft">
            ({formatRelative(lead.updated_at)})
          </span>
        </p>
      )}
    </header>
  );
}
