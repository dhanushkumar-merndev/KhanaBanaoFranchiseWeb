import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { TabNav } from "@/components/shell/tab-nav";
import { Topbar } from "@/components/shell/topbar";
import { LeadHeader } from "@/components/leads/lead-header";
import {
  LEAD_TAB_LABELS,
  LeadTabPanel,
  leadTabBadges,
  parseLeadTab,
  type LeadTab,
} from "@/components/leads/lead-tabs";
import {
  checkActivationReadiness,
  checkApprovalReadiness,
} from "@/app/actions/franchises";
import { requireProfile } from "@/lib/auth/session";
import { getLeadDetail } from "@/lib/data/lead-detail";
import { getLeadPipeline } from "@/lib/data/pipeline";
import { LeadActions } from "@/app/(dashboard)/admin/leads/[id]/lead-actions";

export const metadata: Metadata = { title: "Lead · Khana Banao" };

/**
 * Members do the pipeline work but none of the approvals, so the stages they
 * cannot act on at all are left off the strip rather than shown disabled.
 */
const MEMBER_TABS: LeadTab[] = [
  "overview",
  "activity",
  "followups",
  "application",
  "documents",
  "agreement",
  "payment",
  "emails",
];

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

  const [pipeline, approval, activation] = await Promise.all([
    getLeadPipeline(lead.id),
    checkApprovalReadiness(lead.id),
    checkActivationReadiness(lead.id),
  ]);

  const requested = parseLeadTab(raw.tab);
  const tab = MEMBER_TABS.includes(requested) ? requested : "overview";
  const badges = leadTabBadges(lead, pipeline);

  const tabItems = MEMBER_TABS.map((key) => ({
    href: `/member/leads/${lead.id}?tab=${key}`,
    label: LEAD_TAB_LABELS[key],
    badge: badges[key as keyof typeof badges],
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
            businessDiscussionRecorded={lead.activities.some(
              (activity) => activity.activity_type === "BUSINESS_DISCUSSION",
            )}
          />
        </div>

        <TabNav
          items={tabItems}
          active={`/member/leads/${lead.id}?tab=${tab}`}
          label="Lead sections"
          className="mt-5"
        />

        <div className="pt-5">
          <LeadTabPanel
            tab={tab}
            lead={lead}
            pipeline={pipeline}
            approval={approval}
            activation={activation}
            members={[]}
            isAdmin={false}
            // getLeadDetail was scoped to this member, so reaching here proves it.
            isAssignedMember
          />
        </div>
      </main>
    </>
  );
}
