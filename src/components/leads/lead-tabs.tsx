import { ActivationTab } from "./activation-tab";
import { ActivityTab } from "./activity-tab";
import { AgreementTab } from "./agreement-tab";
import { ApplicationTab } from "./application-tab";
import { DocumentsTab } from "./documents-tab";
import { EmailsTab } from "./emails-tab";
import { FollowupsTab } from "./followups-tab";
import { OverviewTab } from "./overview-tab";
import { PaymentTab } from "./payment-tab";
import { SetupTab } from "./setup-tab";
import { TrainingTab } from "./training-tab";
import type { LeadDetail } from "@/lib/data/lead-detail";
import type { LeadPipeline } from "@/lib/data/pipeline";
import type {
  ActivationReadiness,
  ApprovalReadiness,
} from "@/app/actions/franchises";

export const LEAD_TABS = [
  "overview",
  "activity",
  "followups",
  "application",
  "documents",
  "agreement",
  "payment",
  "activation",
  "training",
  "setup",
  "emails",
] as const;

export type LeadTab = (typeof LEAD_TABS)[number];

export const LEAD_TAB_LABELS: Record<LeadTab, string> = {
  overview: "Overview",
  activity: "Activity",
  followups: "Follow-ups",
  application: "Application",
  documents: "Documents",
  agreement: "Agreement",
  payment: "Payment",
  activation: "Activation",
  training: "Training",
  setup: "Setup",
  emails: "Emails",
};

export function parseLeadTab(raw: string | string[] | undefined): LeadTab {
  const value = Array.isArray(raw) ? raw[0] : raw;
  return LEAD_TABS.includes(value as LeadTab) ? (value as LeadTab) : "overview";
}

/** Count chips on the tab strip, so the badges never lie about what is inside. */
export function leadTabBadges(lead: LeadDetail, pipeline: LeadPipeline) {
  const pendingFollowups = lead.followups.filter(
    (followup) => followup.status === "PENDING",
  ).length;

  const outstandingDocuments = pipeline.documents.filter(
    (row) => row.requestStatus !== "APPROVED",
  ).length;

  const outstandingSetup = pipeline.franchise
    ? pipeline.franchise.setup.filter((item) => !item.is_done).length
    : 0;

  return {
    activity: lead.activities.length,
    followups: pendingFollowups,
    documents: outstandingDocuments,
    payment: pipeline.payments.length,
    training: pipeline.franchise?.training.length ?? 0,
    setup: outstandingSetup,
    emails: pipeline.emails.length,
  } satisfies Partial<Record<LeadTab, number>>;
}

/**
 * Renders whichever tab is open. Kept in one place so the admin and member
 * pages cannot drift apart — they differ only in `isAdmin` and which tabs the
 * strip offers.
 */
export function LeadTabPanel({
  tab,
  lead,
  pipeline,
  approval,
  activation,
  members,
  isAdmin,
}: {
  tab: LeadTab;
  lead: LeadDetail;
  pipeline: LeadPipeline;
  approval: ApprovalReadiness;
  activation: ActivationReadiness;
  members: { id: string; full_name: string }[];
  isAdmin: boolean;
}) {
  // Nothing further is owed on a rejected lead.
  const active = lead.current_status !== "REJECTED";

  switch (tab) {
    case "overview":
      return <OverviewTab lead={lead} />;
    case "activity":
      return <ActivityTab activities={lead.activities} />;
    case "followups":
      return <FollowupsTab followups={lead.followups} canManage={active} />;
    case "application":
      return (
        <ApplicationTab
          leadId={lead.id}
          leadStatus={lead.current_status}
          application={pipeline.application}
          canManage={active}
          isAdmin={isAdmin}
        />
      );
    case "documents":
      return (
        <DocumentsTab
          leadId={lead.id}
          documents={pipeline.documents}
          hasApplication={Boolean(pipeline.application)}
          canRequest={active}
          isAdmin={isAdmin}
        />
      );
    case "agreement":
      return (
        <AgreementTab
          leadId={lead.id}
          leadStatus={lead.current_status}
          agreement={pipeline.agreement}
          isAdmin={isAdmin}
        />
      );
    case "payment":
      return (
        <PaymentTab
          leadId={lead.id}
          leadStatus={lead.current_status}
          agreementStatus={pipeline.agreement?.status ?? null}
          payments={pipeline.payments}
          canRecord={active}
          isAdmin={isAdmin}
        />
      );
    case "activation":
      return (
        <ActivationTab
          leadId={lead.id}
          leadName={lead.full_name}
          franchise={pipeline.franchise}
          approval={approval}
          activation={activation}
          members={members}
          isAdmin={isAdmin}
        />
      );
    case "training":
      return <TrainingTab franchise={pipeline.franchise} isAdmin={isAdmin} />;
    case "setup":
      return <SetupTab franchise={pipeline.franchise} isAdmin={isAdmin} />;
    case "emails":
      return <EmailsTab emails={pipeline.emails} />;
  }
}
