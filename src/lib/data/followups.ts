import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { resolveMemberNames } from "./leads";
import type { ContactChannel, FollowupStatus, LeadStatus } from "@/lib/domain/enums";
import { toRange, type TableParams } from "@/lib/table/params";

export const FOLLOWUP_VIEWS = [
  "today",
  "upcoming",
  "overdue",
  "completed",
] as const;
export type FollowupView = (typeof FOLLOWUP_VIEWS)[number];

export const FOLLOWUP_VIEW_LABELS: Record<FollowupView, string> = {
  today: "Due today",
  upcoming: "Upcoming",
  overdue: "Overdue",
  completed: "Completed",
};

export type FollowupQueueRow = {
  id: string;
  due_at: string;
  status: FollowupStatus;
  channel: ContactChannel | null;
  note: string | null;
  completed_at: string | null;
  lead_id: string;
  leadNumber: string;
  leadName: string;
  leadPhone: string;
  leadStatus: LeadStatus;
  memberName: string | null;
  /** Resolved server-side so render never has to read the clock. */
  isOverdue: boolean;
};

type FollowupRecord = {
  id: string;
  due_at: string;
  status: FollowupStatus;
  channel: ContactChannel | null;
  note: string | null;
  completed_at: string | null;
  lead_id: string;
  member_id: string | null;
};

/**
 * Start and end of "today" in IST, as instants.
 *
 * The team works to one clock; deriving the boundary from the server's own
 * midnight would make "due today" mean something different on Vercel.
 */
function istDayBounds(now = new Date()) {
  const IST_OFFSET_MS = 5.5 * 60 * 60_000;
  const istNow = new Date(now.getTime() + IST_OFFSET_MS);
  const startOfIstDay = Date.UTC(
    istNow.getUTCFullYear(),
    istNow.getUTCMonth(),
    istNow.getUTCDate(),
  );
  return {
    start: new Date(startOfIstDay - IST_OFFSET_MS).toISOString(),
    end: new Date(startOfIstDay + 24 * 60 * 60_000 - IST_OFFSET_MS).toISOString(),
    now: now.toISOString(),
  };
}

export function normalizeFollowupMonth(value: string | string[] | undefined, now = new Date()) {
  const candidate = Array.isArray(value) ? value[0] : value;
  if (/^\d{4}-(0[1-9]|1[0-2])$/.test(candidate ?? "")) return candidate as string;

  const IST_OFFSET_MS = 5.5 * 60 * 60_000;
  const istNow = new Date(now.getTime() + IST_OFFSET_MS);
  return `${istNow.getUTCFullYear()}-${String(istNow.getUTCMonth() + 1).padStart(2, "0")}`;
}

function istMonthBounds(month: string) {
  const [year, monthNumber] = month.split("-").map(Number);
  const IST_OFFSET_MS = 5.5 * 60 * 60_000;
  return {
    start: new Date(Date.UTC(year, monthNumber - 1, 1) - IST_OFFSET_MS).toISOString(),
    end: new Date(Date.UTC(year, monthNumber, 1) - IST_OFFSET_MS).toISOString(),
    now: new Date().toISOString(),
  };
}

async function enrichFollowups(
  followups: FollowupRecord[],
  now: string,
): Promise<FollowupQueueRow[]> {
  const supabase = createAdminClient();
  const leadIds = [...new Set(followups.map((followup) => followup.lead_id))];
  const { data: leads } = leadIds.length
    ? await supabase
        .from("leads")
        .select("id, lead_number, full_name, phone, current_status")
        .in("id", leadIds)
    : { data: [] };

  const leadMap = new Map((leads ?? []).map((lead) => [lead.id, lead] as const));
  const memberNames = await resolveMemberNames(followups.map((followup) => followup.member_id));

  return followups.flatMap((followup) => {
    const lead = leadMap.get(followup.lead_id);
    if (!lead) return [];
    return [
      {
        id: followup.id,
        due_at: followup.due_at,
        status: followup.status,
        channel: followup.channel,
        note: followup.note,
        completed_at: followup.completed_at,
        lead_id: followup.lead_id,
        leadNumber: lead.lead_number,
        leadName: lead.full_name,
        leadPhone: lead.phone,
        leadStatus: lead.current_status,
        memberName: followup.member_id
          ? (memberNames.get(followup.member_id) ?? null)
          : null,
        isOverdue: followup.status === "PENDING" && followup.due_at < now,
      },
    ];
  });
}

/** All follow-ups scheduled in one IST calendar month. */
export async function listFollowupsForMonth(
  month: string,
  scopeMemberId: string | null,
): Promise<FollowupQueueRow[]> {
  const supabase = createAdminClient();
  const bounds = istMonthBounds(month);
  let query = supabase
    .from("followups")
    .select("id, due_at, status, channel, note, completed_at, lead_id, member_id")
    .gte("due_at", bounds.start)
    .lt("due_at", bounds.end)
    .order("due_at", { ascending: true })
    .limit(500);

  if (scopeMemberId) query = query.eq("member_id", scopeMemberId);
  const { data } = await query;
  return enrichFollowups((data ?? []) as FollowupRecord[], bounds.now);
}

const SORTABLE = new Set(["due_at", "status", "completed_at"]);

export async function listFollowups(
  params: TableParams,
  view: FollowupView,
  scopeMemberId: string | null,
): Promise<{ rows: FollowupQueueRow[]; total: number; counts: Record<FollowupView, number> }> {
  const supabase = createAdminClient();
  const { from, to } = toRange(params);
  const bounds = istDayBounds();

  const base = () => {
    let query = supabase
      .from("followups")
      .select(
        "id, due_at, status, channel, note, completed_at, lead_id, member_id",
        { count: "exact" },
      );
    if (scopeMemberId) query = query.eq("member_id", scopeMemberId);
    return query;
  };

  const applyView = <T extends ReturnType<typeof base>>(query: T, target: FollowupView) => {
    switch (target) {
      case "today":
        return query
          .eq("status", "PENDING")
          .gte("due_at", bounds.start)
          .lt("due_at", bounds.end);
      case "overdue":
        return query.eq("status", "PENDING").lt("due_at", bounds.now);
      case "upcoming":
        return query.eq("status", "PENDING").gte("due_at", bounds.end);
      case "completed":
        return query.eq("status", "COMPLETED");
    }
  };

  const sortColumn = SORTABLE.has(params.sort ?? "")
    ? (params.sort as string)
    : view === "completed"
      ? "completed_at"
      : "due_at";

  let query = applyView(base(), view);

  if (params.filters.member && !scopeMemberId) {
    query = query.eq("member_id", params.filters.member);
  }

  const { data, count } = await query
    .order(sortColumn, {
      ascending: view === "completed" ? params.dir === "asc" : params.dir !== "desc",
      nullsFirst: false,
    })
    .range(from, to);

  const followups = (data ?? []) as FollowupRecord[];

  // Tab chips need every view's size, not just the open one.
  const counts = {} as Record<FollowupView, number>;
  await Promise.all(
    FOLLOWUP_VIEWS.map(async (target) => {
      const { count: viewCount } = await applyView(
        (() => {
          let q = supabase
            .from("followups")
            .select("id", { count: "exact", head: true });
          if (scopeMemberId) q = q.eq("member_id", scopeMemberId);
          return q as unknown as ReturnType<typeof base>;
        })(),
        target,
      );
      counts[target] = viewCount ?? 0;
    }),
  );

  return {
    total: count ?? 0,
    counts,
    rows: await enrichFollowups(followups, bounds.now),
  };
}
