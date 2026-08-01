import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { TabNav } from "@/components/shell/tab-nav";
import { Topbar } from "@/components/shell/topbar";
import { ActivityTab } from "@/components/leads/activity-tab";
import { FollowupsTab } from "@/components/leads/followups-tab";
import { LeadHeader } from "@/components/leads/lead-header";
import { OverviewTab } from "@/components/leads/overview-tab";
import { EmptyState } from "@/components/ui/feedback";
import { requireProfile } from "@/lib/auth/session";
import { getLeadDetail } from "@/lib/data/lead-detail";
import { LeadActions } from "@/app/(dashboard)/admin/leads/[id]/lead-actions";

export const metadata: Metadata = { title: "Lead · Khana Banao" };

const TABS = [
  "overview",
  "activity",
  "followups",
  "application",
  "documents",
  "agreement",
  "payment",
  "emails",
] as const;
type Tab = (typeof TABS)[number];

const TAB_LABELS: Record<Tab, string> = {
  overview: "Overview",
  activity: "Activity",
  followups: "Follow-ups",
  application: "Application",
  documents: "Documents",
  agreement: "Agreement",
  payment: "Payment",
  emails: "Emails",
};

export default async function MemberLeadDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [profile, { id }, raw] = await Promise.all([
    requireProfile(),
    params,
    searchParams,
  ]);

  // Scoped fetch: a lead belonging to someone else is indistinguishable from
  // one that does not exist.
  const lead = await getLeadDetail(id, profile.id);
  if (!lead) notFound();

  const tabParam = Array.isArray(raw.tab) ? raw.tab[0] : raw.tab;
  const tab: Tab = TABS.includes(tabParam as Tab) ? (tabParam as Tab) : "overview";

  const pendingFollowups = lead.followups.filter(
    (followup) => followup.status === "PENDING",
  ).length;

  const tabItems = TABS.map((key) => ({
    href: `/member/leads/${lead.id}?tab=${key}`,
    label: TAB_LABELS[key],
    badge:
      key === "activity"
        ? lead.activities.length
        : key === "followups"
          ? pendingFollowups
          : undefined,
  }));

  return (
    <>
      <Topbar
        profile={profile}
        crumbs={[
          { label: "My leads", href: "/member/leads" },
          { label: lead.lead_number },
        ]}
      />

      <main className="min-w-0 flex-1 px-4 py-6 md:px-6">
        <LeadHeader lead={lead} />

        <div className="mt-4">
          <LeadActions
            leadId={lead.id}
            status={lead.current_status}
            assignedMemberId={lead.assigned_member_id}
            members={[]}
            isAdmin={false}
          />
        </div>

        <TabNav
          items={tabItems}
          active={`/member/leads/${lead.id}?tab=${tab}`}
          label="Lead sections"
          className="mt-5"
        />

        <div className="pt-5">
          {tab === "overview" && <OverviewTab lead={lead} />}
          {tab === "activity" && <ActivityTab activities={lead.activities} />}
          {tab === "followups" && (
            <FollowupsTab
              followups={lead.followups}
              canManage={lead.current_status !== "REJECTED"}
            />
          )}
          {tab !== "overview" && tab !== "activity" && tab !== "followups" && (
            <EmptyState
              title={`${TAB_LABELS[tab]} is not wired up yet`}
              body="This stage of the pipeline is still being built. Overview, Activity and Follow-ups are live."
            />
          )}
        </div>
      </main>
    </>
  );
}
