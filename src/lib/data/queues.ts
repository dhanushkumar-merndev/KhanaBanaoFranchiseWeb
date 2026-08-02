import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { resolveMemberNames } from "./leads";
import {
  AGREEMENT_STATUSES,
  APPLICATION_STATUSES,
  DOCUMENT_STATUSES,
  FRANCHISE_STATUSES,
  PAYMENT_STATUSES,
  type AgreementStatus,
  type ApplicationStatus,
  type DocumentStatus,
  type DocumentType,
  type FranchiseStatus,
  type PaymentMode,
  type PaymentStatus,
} from "@/lib/domain/enums";
import { pickEnum, toRange, type TableParams } from "@/lib/table/params";

/**
 * Cross-lead work queues.
 *
 * Each of these answers "what needs my attention across every lead?", which
 * the per-lead tabs cannot. They all take an optional member scope so the
 * member-facing versions cannot see anyone else's work.
 */

type Scoped = { scopeMemberId: string | null };

/** Resolves lead ids a member is allowed to see, or null for unrestricted. */
async function scopedLeadIds(scopeMemberId: string | null): Promise<string[] | null> {
  if (!scopeMemberId) return null;
  const { data } = await createAdminClient()
    .from("leads")
    .select("id")
    .eq("assigned_member_id", scopeMemberId);
  // An empty array is meaningful: this member owns nothing, so the queue is
  // empty rather than unfiltered.
  return (data ?? []).map((lead) => lead.id);
}

export type ApplicationQueueRow = {
  id: string;
  application_number: string;
  status: ApplicationStatus;
  submitted_at: string | null;
  leadId: string;
  leadNumber: string;
  leadName: string;
  leadCity: string;
  assignedMemberName: string | null;
};

export async function listApplications(
  params: TableParams,
  { scopeMemberId }: Scoped,
): Promise<{ rows: ApplicationQueueRow[]; total: number }> {
  const supabase = createAdminClient();
  const { from, to } = toRange(params);
  const allowed = await scopedLeadIds(scopeMemberId);

  let query = supabase
    .from("applications")
    .select("id, application_number, status, submitted_at, lead_id", {
      count: "exact",
    });

  if (allowed) query = query.in("lead_id", allowed.length ? allowed : ["-"]);

  const status = pickEnum(params.filters.status, APPLICATION_STATUSES);
  if (status) query = query.eq("status", status);
  if (params.q) query = query.ilike("application_number", `%${params.q}%`);

  const { data, count } = await query
    .order(params.sort === "application_number" ? "application_number" : "submitted_at", {
      ascending: params.dir === "asc",
      nullsFirst: false,
    })
    .range(from, to);

  const applications = data ?? [];
  const leads = await loadLeads(applications.map((row) => row.lead_id));

  return {
    total: count ?? 0,
    rows: applications.flatMap((application) => {
      const lead = leads.get(application.lead_id);
      if (!lead) return [];
      return [
        {
          id: application.id,
          application_number: application.application_number,
          status: application.status,
          submitted_at: application.submitted_at,
          leadId: lead.id,
          leadNumber: lead.lead_number,
          leadName: lead.full_name,
          leadCity: lead.city,
          assignedMemberName: lead.memberName,
        },
      ];
    }),
  };
}

export type DocumentQueueRow = {
  id: string;
  documentTypes: DocumentType[];
  requestedCount: number;
  uploadedCount: number;
  approvedCount: number;
  status: DocumentStatus;
  uploadedAt: string | null;
  reviewedByName: string | null;
  leadId: string;
  leadNumber: string;
  leadName: string;
  assignedMemberName: string | null;
};

export async function listDocuments(
  params: TableParams,
  { scopeMemberId }: Scoped,
): Promise<{ rows: DocumentQueueRow[]; total: number }> {
  const supabase = createAdminClient();
  const { from, to } = toRange(params);
  const allowed = await scopedLeadIds(scopeMemberId);

  let applicationQuery = supabase.from("applications").select("id, lead_id");
  if (allowed) {
    applicationQuery = applicationQuery.in(
      "lead_id",
      allowed.length ? allowed : ["-"],
    );
  }
  const { data: applications } = await applicationQuery.limit(5000);
  const applicationIds = (applications ?? []).map((row) => row.id);
  if (applicationIds.length === 0) return { rows: [], total: 0 };

  // The queue is intentionally based on request rows, then rolled up by lead.
  // Adding PAN after Aadhaar therefore updates the same applicant row instead
  // of creating another top-level queue row.
  const { data: requests } = await supabase
    .from("document_requests")
    .select("id, application_id, document_type, status")
    .in("application_id", applicationIds)
    .limit(5000);

  const requestRows = requests ?? [];
  if (requestRows.length === 0) return { rows: [], total: 0 };

  const requestIds = requestRows.map((request) => request.id);
  const { data: documents } = await supabase
    .from("documents")
    .select("document_request_id, uploaded_at, reviewed_by, version")
    .in("document_request_id", requestIds)
    .order("version", { ascending: false })
    .limit(5000);

  const latestByRequest = new Map<
    string,
    { uploaded_at: string; reviewed_by: string | null; version: number }
  >();
  for (const document of documents ?? []) {
    if (!latestByRequest.has(document.document_request_id)) {
      latestByRequest.set(document.document_request_id, document);
    }
  }

  const leadByApplication = new Map(
    (applications ?? []).map((row) => [row.id, row.lead_id] as const),
  );
  const leads = await loadLeads([...leadByApplication.values()]);
  const reviewerNames = await resolveMemberNames(
    [...latestByRequest.values()].map((document) => document.reviewed_by),
  );

  const requestsByLead = new Map<string, typeof requestRows>();
  for (const request of requestRows) {
    const leadId = leadByApplication.get(request.application_id);
    if (!leadId) continue;
    const grouped = requestsByLead.get(leadId) ?? [];
    grouped.push(request);
    requestsByLead.set(leadId, grouped);
  }

  const aggregateStatus = (statuses: DocumentStatus[]): DocumentStatus => {
    if (statuses.includes("REUPLOAD_REQUIRED")) return "REUPLOAD_REQUIRED";
    if (statuses.every((value) => value === "APPROVED")) return "APPROVED";
    if (statuses.includes("UNDER_REVIEW")) return "UNDER_REVIEW";
    if (statuses.includes("UPLOADED") || statuses.includes("APPROVED")) {
      return "UPLOADED";
    }
    return "REQUESTED";
  };

  let groupedRows: DocumentQueueRow[] = [];
  for (const [leadId, leadRequests] of requestsByLead) {
    const lead = leads.get(leadId);
    if (!lead) continue;

    const latestDocuments = leadRequests.flatMap((request) => {
      const document = latestByRequest.get(request.id);
      return document ? [document] : [];
    });
    const latestDocument = latestDocuments.sort((a, b) =>
      b.uploaded_at.localeCompare(a.uploaded_at),
    )[0];
    const statuses = leadRequests.map(
      (request) => request.status as DocumentStatus,
    );

    groupedRows.push({
      id: lead.id,
      leadId: lead.id,
      leadNumber: lead.lead_number,
      leadName: lead.full_name,
      assignedMemberName: lead.memberName,
      documentTypes: [
        ...new Set(leadRequests.map((request) => request.document_type)),
      ],
      requestedCount: leadRequests.length,
      uploadedCount: statuses.filter((value) => value !== "REQUESTED").length,
      approvedCount: statuses.filter((value) => value === "APPROVED").length,
      status: aggregateStatus(statuses),
      uploadedAt: latestDocument?.uploaded_at ?? null,
      reviewedByName: latestDocument?.reviewed_by
        ? (reviewerNames.get(latestDocument.reviewed_by) ?? null)
        : null,
    });
  }

  const status = pickEnum(params.filters.status, DOCUMENT_STATUSES);
  if (status) groupedRows = groupedRows.filter((row) => row.status === status);

  groupedRows.sort((a, b) => {
    const comparison = (a.uploadedAt ?? "").localeCompare(b.uploadedAt ?? "");
    return params.dir === "asc" ? comparison : -comparison;
  });

  return {
    total: groupedRows.length,
    rows: groupedRows.slice(from, to + 1),
  };
}

export type AgreementQueueRow = {
  id: string;
  agreement_number: string;
  version: number;
  status: AgreementStatus;
  sent_at: string | null;
  completed_at: string | null;
  created_at: string;
  leadId: string;
  leadNumber: string;
  leadName: string;
  assignedMemberName: string | null;
};

export async function listAgreements(
  params: TableParams,
): Promise<{ rows: AgreementQueueRow[]; total: number }> {
  const supabase = createAdminClient();
  const { from, to } = toRange(params);

  let query = supabase
    .from("agreements")
    .select(
      "id, agreement_number, version, status, sent_at, completed_at, created_at, lead_id",
      { count: "exact" },
    );

  const status = pickEnum(params.filters.status, AGREEMENT_STATUSES);
  if (status) query = query.eq("status", status);
  if (params.q) query = query.ilike("agreement_number", `%${params.q}%`);

  const { data, count } = await query
    .order("created_at", { ascending: params.dir === "asc" })
    .range(from, to);

  const agreements = data ?? [];
  const leads = await loadLeads(agreements.map((row) => row.lead_id));

  return {
    total: count ?? 0,
    rows: agreements.flatMap((agreement) => {
      const lead = leads.get(agreement.lead_id);
      if (!lead) return [];
      return [
        {
          id: agreement.id,
          agreement_number: agreement.agreement_number,
          version: agreement.version,
          status: agreement.status,
          sent_at: agreement.sent_at,
          completed_at: agreement.completed_at,
          created_at: agreement.created_at,
          leadId: lead.id,
          leadNumber: lead.lead_number,
          leadName: lead.full_name,
          assignedMemberName: lead.memberName,
        },
      ];
    }),
  };
}

export type PaymentQueueRow = {
  id: string;
  amount: number;
  payment_mode: PaymentMode;
  status: PaymentStatus;
  payment_date: string | null;
  submitted_at: string | null;
  hasProof: boolean;
  leadId: string;
  leadNumber: string;
  leadName: string;
  assignedMemberName: string | null;
};

export async function listPayments(
  params: TableParams,
  { scopeMemberId }: Scoped,
): Promise<{ rows: PaymentQueueRow[]; total: number }> {
  const supabase = createAdminClient();
  const { from, to } = toRange(params);
  const allowed = await scopedLeadIds(scopeMemberId);

  let query = supabase
    .from("payments")
    .select(
      "id, amount, payment_mode, status, payment_date, submitted_at, proof_storage_path, lead_id, created_at",
      { count: "exact" },
    );

  if (allowed) query = query.in("lead_id", allowed.length ? allowed : ["-"]);

  const status = pickEnum(params.filters.status, PAYMENT_STATUSES);
  if (status) query = query.eq("status", status);

  const { data, count } = await query
    .order("created_at", { ascending: params.dir === "asc" })
    .range(from, to);

  const payments = data ?? [];
  const leads = await loadLeads(payments.map((row) => row.lead_id));

  return {
    total: count ?? 0,
    rows: payments.flatMap((payment) => {
      const lead = leads.get(payment.lead_id);
      if (!lead) return [];
      return [
        {
          id: payment.id,
          amount: Number(payment.amount),
          payment_mode: payment.payment_mode,
          status: payment.status,
          payment_date: payment.payment_date,
          submitted_at: payment.submitted_at,
          hasProof: Boolean(payment.proof_storage_path),
          leadId: lead.id,
          leadNumber: lead.lead_number,
          leadName: lead.full_name,
          assignedMemberName: lead.memberName,
        },
      ];
    }),
  };
}

export type FranchiseQueueRow = {
  id: string;
  franchise_id: string;
  franchise_name: string;
  owner_name: string;
  territory: string | null;
  status: FranchiseStatus;
  activation_date: string | null;
  go_live_date: string | null;
  leadId: string;
  leadNumber: string;
  setupComplete: number;
  setupTotal: number;
  trainingComplete: number;
  trainingTotal: number;
};

export async function listFranchises(
  params: TableParams,
): Promise<{ rows: FranchiseQueueRow[]; total: number }> {
  const supabase = createAdminClient();
  const { from, to } = toRange(params);

  let query = supabase
    .from("franchises")
    .select(
      "id, franchise_id, franchise_name, owner_name, territory, status, activation_date, go_live_date, lead_id",
      { count: "exact" },
    );

  const status = pickEnum(params.filters.status, FRANCHISE_STATUSES);
  if (status) query = query.eq("status", status);

  if (params.q) {
    const term = `%${params.q}%`;
    query = query.or(
      `franchise_id.ilike.${term},franchise_name.ilike.${term},owner_name.ilike.${term},territory.ilike.${term}`,
    );
  }

  const { data, count } = await query
    .order(params.sort === "franchise_id" ? "franchise_id" : "activation_date", {
      ascending: params.dir === "asc",
      nullsFirst: false,
    })
    .range(from, to);

  const franchises = data ?? [];
  const ids = franchises.map((franchise) => franchise.id);

  const [{ data: setup }, { data: training }, leads] = await Promise.all([
    ids.length
      ? supabase.from("setup_items").select("franchise_id, is_done").in("franchise_id", ids)
      : Promise.resolve({ data: [] }),
    ids.length
      ? supabase.from("training_records").select("franchise_id, status").in("franchise_id", ids)
      : Promise.resolve({ data: [] }),
    loadLeads(franchises.map((franchise) => franchise.lead_id)),
  ]);

  const tally = (
    rows: { franchise_id: string }[],
    matches: (row: never) => boolean,
  ) => {
    const totals = new Map<string, { done: number; total: number }>();
    for (const row of rows) {
      const entry = totals.get(row.franchise_id) ?? { done: 0, total: 0 };
      entry.total += 1;
      if (matches(row as never)) entry.done += 1;
      totals.set(row.franchise_id, entry);
    }
    return totals;
  };

  const setupTotals = tally(setup ?? [], (row: { is_done: boolean }) => row.is_done);
  const trainingTotals = tally(
    training ?? [],
    (row: { status: string }) => row.status === "TRAINING_COMPLETED",
  );

  return {
    total: count ?? 0,
    rows: franchises.map((franchise) => {
      const lead = leads.get(franchise.lead_id);
      const setupCount = setupTotals.get(franchise.id) ?? { done: 0, total: 0 };
      const trainingCount = trainingTotals.get(franchise.id) ?? { done: 0, total: 0 };
      return {
        id: franchise.id,
        franchise_id: franchise.franchise_id,
        franchise_name: franchise.franchise_name,
        owner_name: franchise.owner_name,
        territory: franchise.territory,
        status: franchise.status,
        activation_date: franchise.activation_date,
        go_live_date: franchise.go_live_date,
        leadId: franchise.lead_id,
        leadNumber: lead?.lead_number ?? "—",
        setupComplete: setupCount.done,
        setupTotal: setupCount.total,
        trainingComplete: trainingCount.done,
        trainingTotal: trainingCount.total,
      };
    }),
  };
}

type LeadSummary = {
  id: string;
  lead_number: string;
  full_name: string;
  city: string;
  memberName: string | null;
};

async function loadLeads(ids: string[]): Promise<Map<string, LeadSummary>> {
  const unique = [...new Set(ids)];
  if (unique.length === 0) return new Map();

  const { data } = await createAdminClient()
    .from("leads")
    .select("id, lead_number, full_name, city, assigned_member_id")
    .in("id", unique);

  const memberNames = await resolveMemberNames(
    (data ?? []).map((lead) => lead.assigned_member_id),
  );

  return new Map(
    (data ?? []).map((lead) => [
      lead.id,
      {
        id: lead.id,
        lead_number: lead.lead_number,
        full_name: lead.full_name,
        city: lead.city,
        memberName: lead.assigned_member_id
          ? (memberNames.get(lead.assigned_member_id) ?? null)
          : null,
      },
    ]),
  );
}
