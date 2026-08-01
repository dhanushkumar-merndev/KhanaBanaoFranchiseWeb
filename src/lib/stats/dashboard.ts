import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import {
  FRANCHISE_STATUS_LABELS,
  PAYMENT_STATUS_LABELS,
} from "@/lib/domain/status";
import {
  LEAD_SOURCE_LABELS,
  LEAD_STATUS_LABELS,
  type FranchiseStatus,
  type LeadSource,
  type LeadStatus,
  type PaymentStatus,
} from "@/lib/domain/enums";

/** One bar/slice: a display label and its count. */
export type ChartPoint = { key: string; value: number };

export type DashboardCards = {
  total_leads: number;
  new_leads: number;
  assigned_leads: number;
  followups_due: number;
  accepted_leads: number;
  rejected_leads: number;
  applications_submitted: number;
  documents_pending_review: number;
  payments_pending_approval: number;
  agreements_pending: number;
  active_franchises: number;
  live_franchises: number;
};

export type DashboardStats = {
  cards: DashboardCards;
  leadsByStatus: ChartPoint[];
  leadsBySource: ChartPoint[];
  leadsByMember: ChartPoint[];
  acceptedVsRejected: ChartPoint[];
  monthlyLeadTrend: ChartPoint[];
  franchisePipeline: ChartPoint[];
  paymentStatus: ChartPoint[];
  franchisesByTerritory: ChartPoint[];
};

const EMPTY_CARDS: DashboardCards = {
  total_leads: 0,
  new_leads: 0,
  assigned_leads: 0,
  followups_due: 0,
  accepted_leads: 0,
  rejected_leads: 0,
  applications_submitted: 0,
  documents_pending_review: 0,
  payments_pending_approval: 0,
  agreements_pending: 0,
  active_franchises: 0,
  live_franchises: 0,
};

/** Raw jsonb from Postgres, so everything needs narrowing before use. */
type RawPoint = { key?: unknown; value?: unknown };

function toPoints(
  raw: unknown,
  label?: (key: string) => string,
): ChartPoint[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((entry) => {
      const point = entry as RawPoint;
      const key = typeof point.key === "string" ? point.key : String(point.key);
      const value = Number(point.value);
      return {
        key: label ? label(key) : key,
        value: Number.isFinite(value) ? value : 0,
      };
    })
    .filter((point) => point.key !== "undefined" && point.key !== "null");
}

function toCards(raw: unknown): DashboardCards {
  if (!raw || typeof raw !== "object") return EMPTY_CARDS;
  const source = raw as Record<string, unknown>;
  const cards = { ...EMPTY_CARDS };
  for (const key of Object.keys(EMPTY_CARDS) as (keyof DashboardCards)[]) {
    const value = Number(source[key]);
    cards[key] = Number.isFinite(value) ? value : 0;
  }
  return cards;
}

/** Fall back to the raw enum if the database ever grows a value the UI lacks. */
function labelled<T extends string>(map: Record<T, string>) {
  return (key: string) => map[key as T] ?? key;
}

/**
 * Every card and chart on the admin dashboard in a single round trip.
 *
 * Caller must have already established that the viewer is an ADMIN — the
 * underlying function is only granted to the service role.
 */
export async function getDashboardStats(): Promise<DashboardStats> {
  const { data, error } = await createAdminClient().rpc("admin_dashboard_stats");

  if (error || !data || typeof data !== "object") {
    return {
      cards: EMPTY_CARDS,
      leadsByStatus: [],
      leadsBySource: [],
      leadsByMember: [],
      acceptedVsRejected: [],
      monthlyLeadTrend: [],
      franchisePipeline: [],
      paymentStatus: [],
      franchisesByTerritory: [],
    };
  }

  const raw = data as Record<string, unknown>;

  return {
    cards: toCards(raw.cards),
    leadsByStatus: toPoints(
      raw.leads_by_status,
      labelled<LeadStatus>(LEAD_STATUS_LABELS),
    ),
    leadsBySource: toPoints(
      raw.leads_by_source,
      labelled<LeadSource>(LEAD_SOURCE_LABELS),
    ),
    leadsByMember: toPoints(raw.leads_by_member),
    acceptedVsRejected: toPoints(raw.accepted_vs_rejected),
    monthlyLeadTrend: toPoints(raw.monthly_lead_trend),
    franchisePipeline: toPoints(
      raw.franchise_pipeline,
      labelled<FranchiseStatus>(FRANCHISE_STATUS_LABELS),
    ),
    paymentStatus: toPoints(
      raw.payment_status,
      labelled<PaymentStatus>(PAYMENT_STATUS_LABELS),
    ),
    franchisesByTerritory: toPoints(raw.franchises_by_territory),
  };
}

export type MemberPerformance = {
  memberId: string;
  fullName: string;
  status: "ACTIVE" | "INACTIVE";
  assignedLeads: number;
  contactedLeads: number;
  followupsCompleted: number;
  acceptedLeads: number;
  rejectedLeads: number;
  applicationsSent: number;
  documentsCollected: number;
  paymentProofsSubmitted: number;
  liveConversions: number;
};

/** Member-performance table (spec §22), busiest member first. */
export async function getMemberPerformance(): Promise<MemberPerformance[]> {
  const { data } = await createAdminClient()
    .from("member_performance")
    .select("*")
    .eq("member_role", "MEMBER")
    .order("assigned_leads", { ascending: false });

  return (data ?? []).map((row) => ({
    memberId: row.member_id,
    fullName: row.full_name,
    status: row.member_status,
    assignedLeads: Number(row.assigned_leads),
    contactedLeads: Number(row.contacted_leads),
    followupsCompleted: Number(row.followups_completed),
    acceptedLeads: Number(row.accepted_leads),
    rejectedLeads: Number(row.rejected_leads),
    applicationsSent: Number(row.applications_sent),
    documentsCollected: Number(row.documents_collected),
    paymentProofsSubmitted: Number(row.payment_proofs_submitted),
    liveConversions: Number(row.live_conversions),
  }));
}
