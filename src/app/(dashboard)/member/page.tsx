import type { Metadata } from "next";
import Link from "next/link";
import {
  AlertTriangle,
  BadgeIndianRupee,
  CalendarClock,
  FileText,
  Inbox,
  ThumbsUp,
} from "lucide-react";
import { PageHeader } from "@/components/shell/page-header";
import { StatCard } from "@/components/shell/stat-card";
import { Topbar } from "@/components/shell/topbar";
import { EmptyState } from "@/components/ui/feedback";
import { requireProfile } from "@/lib/auth/session";
import { formatRelative } from "@/lib/format";
import { getMemberDashboard } from "@/lib/stats/member";

export const metadata: Metadata = { title: "My dashboard · Khana Banao" };

const ACTIVITY_LABEL: Record<string, string> = {
  CONTACT: "Logged a contact",
  BUSINESS_DISCUSSION: "Recorded a discussion",
  STATUS_CHANGE: "Moved the lead on",
};

export default async function MemberDashboardPage() {
  const profile = await requireProfile();
  const stats = await getMemberDashboard(profile.id);

  return (
    <>
      <Topbar profile={profile} crumbs={[{ label: "My dashboard" }]} />

      <main className="min-w-0 flex-1 px-4 py-6 md:px-6">
        <PageHeader
          title={`Good to see you, ${profile.full_name.split(" ")[0]}`}
          description="Only the leads assigned to you appear anywhere in this dashboard."
        />

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
          <StatCard
            label="My new leads"
            value={stats.newLeads}
            href="/member/leads?status=NEW"
            icon={Inbox}
            tone="info"
            hint="Not contacted yet"
          />
          <StatCard
            label="Follow-ups today"
            value={stats.followupsToday}
            href="/member/follow-ups?view=today"
            icon={CalendarClock}
            tone={stats.followupsToday > 0 ? "warn" : "neutral"}
          />
          <StatCard
            label="Overdue follow-ups"
            value={stats.followupsOverdue}
            href="/member/follow-ups?view=overdue"
            icon={AlertTriangle}
            tone={stats.followupsOverdue > 0 ? "danger" : "neutral"}
          />
          <StatCard
            label="My accepted leads"
            value={stats.acceptedLeads}
            href="/member/leads?outcome=accepted"
            icon={ThumbsUp}
            tone="success"
          />
          <StatCard
            label="Applications waiting"
            value={stats.applicationsWaiting}
            href="/member/applications"
            icon={FileText}
            tone="info"
          />
          <StatCard
            label="Documents pending"
            value={stats.documentsPending}
            href="/member/documents"
            icon={FileText}
            tone={stats.documentsPending > 0 ? "warn" : "neutral"}
          />
          <StatCard
            label="Payment proof rejected"
            value={stats.paymentProofRejected}
            href="/member/leads?status=PAYMENT_REJECTED"
            icon={BadgeIndianRupee}
            tone={stats.paymentProofRejected > 0 ? "danger" : "neutral"}
          />
        </div>

        <section aria-labelledby="recent-heading" className="mt-6">
          <div className="rounded-xl border border-line bg-surface shadow-[0_10px_30px_-24px_rgba(110,40,20,0.5)]">
            <div className="border-b border-line px-4 py-3.5">
              <h2
                id="recent-heading"
                className="font-display text-[0.95rem] font-bold text-ink"
              >
                Recent activity
              </h2>
              <p className="mt-0.5 text-[0.72rem] text-ink-soft">
                The last few things you logged.
              </p>
            </div>

            {stats.recentActivity.length === 0 ? (
              <EmptyState
                title="Nothing logged yet"
                body="Open one of your leads and log a contact to get started."
              />
            ) : (
              <ul className="divide-y divide-line/70">
                {stats.recentActivity.map((activity) => (
                  <li key={activity.id}>
                    <Link
                      href={`/member/leads/${activity.leadId}?tab=activity`}
                      className="flex flex-wrap items-baseline justify-between gap-2 px-4 py-3 transition hover:bg-surface-muted/60"
                    >
                      <span className="min-w-0">
                        <span className="block text-[0.84rem] font-medium text-ink">
                          {ACTIVITY_LABEL[activity.activity_type] ??
                            activity.activity_type}{" "}
                          <span className="font-normal text-ink-soft">
                            · {activity.leadName}
                          </span>
                        </span>
                        {activity.notes && (
                          <span className="mt-0.5 line-clamp-1 block text-[0.76rem] text-ink-soft">
                            {activity.notes}
                          </span>
                        )}
                      </span>
                      <time
                        dateTime={activity.created_at}
                        className="shrink-0 text-[0.7rem] text-ink-soft"
                      >
                        {formatRelative(activity.created_at)}
                      </time>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </main>
    </>
  );
}
