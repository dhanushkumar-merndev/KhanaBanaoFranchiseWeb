import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { TabNav } from "@/components/shell/tab-nav";
import { Topbar } from "@/components/shell/topbar";
import { LeadHeader } from "@/components/leads/lead-header";
import {
  LEAD_TABS,
  LEAD_TAB_LABELS,
  LeadTabPanel,
  leadTabBadges,
  parseLeadTab,
} from "@/components/leads/lead-tabs";
import {
  checkActivationReadiness,
  checkApprovalReadiness,
} from "@/app/actions/franchises";
import { requireAdmin } from "@/lib/auth/session";
import { getLeadDetail } from "@/lib/data/lead-detail";
import { getLeadPipeline } from "@/lib/data/pipeline";
import { listActiveMembers } from "@/lib/data/leads";
import { LeadActions } from "./lead-actions";

export const metadata: Metadata = { title: "Lead · Khana Banao" };

export default async function AdminLeadDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [profile, { id }, raw] = await Promise.all([
    requireAdmin(),
    params,
    searchParams,
  ]);

  const lead = await getLeadDetail(id, null);
  if (!lead) notFound();

  const [pipeline, approval, activation, members] = await Promise.all([
    getLeadPipeline(lead.id),
    checkApprovalReadiness(lead.id),
    checkActivationReadiness(lead.id),
    listActiveMembers(),
  ]);

  const tab = parseLeadTab(raw.tab);
  const badges = leadTabBadges(lead, pipeline);

  const tabItems = LEAD_TABS.map((key) => ({
    href: `/admin/leads/${lead.id}?tab=${key}`,
    label: LEAD_TAB_LABELS[key],
    badge: badges[key as keyof typeof badges],
  }));

  return (
    <>
      <Topbar
        profile={profile}
        crumbs={[
          { label: "Leads", href: "/admin/leads" },
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
            members={members.map((m) => ({ id: m.id, full_name: m.full_name }))}
            isAdmin
          />
        </div>

        <TabNav
          items={tabItems}
          active={`/admin/leads/${lead.id}?tab=${tab}`}
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
            members={members.map((m) => ({ id: m.id, full_name: m.full_name }))}
            isAdmin
          />
        </div>
      </main>
    </>
  );
}
