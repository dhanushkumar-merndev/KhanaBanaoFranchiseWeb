import {
  ArrowRight,
  Mail,
  MessageSquare,
  MonitorPlay,
  Phone,
  Building2,
  CircleDot,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/feedback";
import { LEAD_STATUS_LABELS, type ContactChannel } from "@/lib/domain/enums";
import { formatDateTime, formatRelative } from "@/lib/format";
import type { LeadDetailActivity } from "@/lib/data/lead-detail";

const CHANNEL_ICON: Record<
  ContactChannel,
  React.ComponentType<{ className?: string }>
> = {
  PHONE: Phone,
  WHATSAPP: MessageSquare,
  EMAIL: Mail,
  VIDEO_MEETING: MonitorPlay,
  OFFICE_MEETING: Building2,
  OTHER: CircleDot,
};

const CHANNEL_LABEL: Record<ContactChannel, string> = {
  PHONE: "Phone call",
  WHATSAPP: "WhatsApp",
  EMAIL: "Email",
  VIDEO_MEETING: "Video meeting",
  OFFICE_MEETING: "Office meeting",
  OTHER: "Other",
};

const TYPE_LABEL: Record<string, string> = {
  CONTACT: "Contact logged",
  BUSINESS_DISCUSSION: "Business discussion",
  STATUS_CHANGE: "Status changed",
  APPLICATION_EDITED: "Application corrected",
};

const OUTCOME_LABEL: Record<string, string> = {
  ACCEPTED: "Accepted",
  FOLLOW_UP_REQUIRED: "Follow-up required",
  REJECTED: "Rejected",
  UNREACHABLE: "Unreachable",
};

/** Reverse-chronological timeline of everything that happened to this lead. */
export function ActivityTab({ activities }: { activities: LeadDetailActivity[] }) {
  if (activities.length === 0) {
    return (
      <EmptyState
        title="Nothing has happened yet"
        body="Logging a contact or recording a discussion adds an entry here."
      />
    );
  }

  return (
    <ol className="relative space-y-3 border-l border-line pl-6">
      {activities.map((activity) => {
        const ChannelIcon = activity.channel
          ? CHANNEL_ICON[activity.channel]
          : CircleDot;

        return (
          <li key={activity.id} className="relative">
            <span
              aria-hidden="true"
              className="absolute -left-[1.94rem] top-3 grid size-6 place-items-center rounded-full border border-line bg-surface text-ink-soft"
            >
              <ChannelIcon className="size-3" />
            </span>

            <article className="rounded-xl border border-line bg-surface px-4 py-3">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="text-[0.85rem] font-semibold text-ink">
                  {TYPE_LABEL[activity.activity_type] ?? activity.activity_type}
                  {activity.channel && (
                    <span className="ml-1.5 font-normal text-ink-soft">
                      · {CHANNEL_LABEL[activity.channel]}
                    </span>
                  )}
                </h3>
                <time
                  dateTime={activity.created_at}
                  title={formatDateTime(activity.created_at)}
                  className="text-[0.7rem] text-ink-soft"
                >
                  {formatRelative(activity.created_at)}
                </time>
              </div>

              {activity.activity_type === "STATUS_CHANGE" &&
                activity.previous_status &&
                activity.new_status && (
                  <p className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[0.78rem] text-ink-soft">
                    <span>{LEAD_STATUS_LABELS[activity.previous_status]}</span>
                    <ArrowRight className="size-3" aria-hidden="true" />
                    <span className="font-medium text-ink">
                      {LEAD_STATUS_LABELS[activity.new_status]}
                    </span>
                  </p>
                )}

              {activity.notes && (
                <p className="mt-1.5 whitespace-pre-wrap text-[0.82rem] leading-relaxed text-ink">
                  {activity.notes}
                </p>
              )}

              {(activity.investment_discussed ||
                activity.territory_discussed ||
                activity.interest_level ||
                activity.outcome) && (
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  {activity.outcome && (
                    <Badge
                      tone={
                        activity.outcome === "ACCEPTED"
                          ? "success"
                          : activity.outcome === "REJECTED"
                            ? "danger"
                            : "warn"
                      }
                    >
                      {OUTCOME_LABEL[activity.outcome] ?? activity.outcome}
                    </Badge>
                  )}
                  {activity.interest_level && (
                    <Badge tone="neutral">
                      Interest: {activity.interest_level.toLowerCase()}
                    </Badge>
                  )}
                  {activity.investment_discussed && (
                    <Badge tone="neutral">
                      Investment: {activity.investment_discussed}
                    </Badge>
                  )}
                  {activity.territory_discussed && (
                    <Badge tone="neutral">
                      Territory: {activity.territory_discussed}
                    </Badge>
                  )}
                </div>
              )}

              <p className="mt-2.5 text-[0.7rem] text-ink-soft">
                {activity.memberName ?? "System"}
                {activity.discussion_date &&
                  activity.activity_type === "BUSINESS_DISCUSSION" &&
                  ` · discussed ${formatDateTime(activity.discussion_date)}`}
              </p>
            </article>
          </li>
        );
      })}
    </ol>
  );
}
