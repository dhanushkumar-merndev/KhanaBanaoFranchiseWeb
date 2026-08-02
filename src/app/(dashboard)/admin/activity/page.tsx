import type { Metadata } from "next";
import { Activity } from "lucide-react";
import { PageHeader } from "@/components/shell/page-header";
import { Topbar } from "@/components/shell/topbar";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/feedback";
import { requireAdmin } from "@/lib/auth/session";
import { resolveMemberNames } from "@/lib/data/leads";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatDateTime, formatRelative, initialsOf } from "@/lib/format";
import {
  parseTableParams,
  toRange,
  type RawSearchParams,
} from "@/lib/table/params";
import { LogPager } from "../email-logs/log-pager";

export const metadata: Metadata = { title: "Activity · Khana Banao" };

/** Turns `LEAD_REASSIGNED` into `Lead reassigned` for display. */
function humanise(action: string): string {
  const words = action.toLowerCase().replaceAll("_", " ");
  return words.charAt(0).toUpperCase() + words.slice(1);
}

export default async function ActivityPage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  const [profile, raw] = await Promise.all([requireAdmin(), searchParams]);
  const params = parseTableParams(raw, { sort: "created_at", dir: "desc" });
  const { from, to } = toRange(params);

  const supabase = createAdminClient();

  let query = supabase
    .from("activity_logs")
    .select("id, actor_id, entity_type, entity_id, action, summary, created_at", {
      count: "exact",
    });

  if (params.q) {
    const term = `%${params.q}%`;
    query = query.or(`summary.ilike.${term},action.ilike.${term}`);
  }
  if (params.filters.entity) {
    query = query.eq("entity_type", params.filters.entity);
  }

  const { data, count } = await query
    .order("created_at", { ascending: false })
    .range(from, to);

  const logs = data ?? [];
  const names = await resolveMemberNames(logs.map((log) => log.actor_id));

  return (
    <>
      <Topbar profile={profile} crumbs={[{ label: "Activity" }]} />

      <main className="min-w-0 flex-1 px-4 py-6 md:px-6">
        <PageHeader
          title="Activity"
          description="An append-only record of every consequential action taken in this system, newest first."
        />

        {logs.length === 0 ? (
          <EmptyState
            title="Nothing recorded yet"
            body="Inviting a member, creating a lead or approving a document all leave an entry here."
            icon={Activity}
          />
        ) : (
          <ol className="space-y-2">
            {logs.map((log) => {
              const actor = log.actor_id ? names.get(log.actor_id) : null;
              return (
                <li
                  key={log.id}
                  className="flex flex-wrap items-start gap-3 rounded-xl border border-line bg-surface px-4 py-3"
                >
                  <span
                    aria-hidden="true"
                    className="grid size-8 shrink-0 place-items-center rounded-full bg-brand-crimson/10 text-[0.68rem] font-bold text-brand-crimson"
                  >
                    {actor ? initialsOf(actor) : "SYS"}
                  </span>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-[0.85rem] font-medium text-ink">
                        {humanise(log.action)}
                      </p>
                      <Badge tone="neutral">{log.entity_type}</Badge>
                    </div>
                    {log.summary && (
                      <p className="mt-0.5 text-[0.8rem] leading-relaxed text-ink-soft">
                        {log.summary}
                      </p>
                    )}
                    <p className="mt-0.5 text-[0.7rem] text-ink-soft">
                      {actor ?? "System"}
                    </p>
                  </div>

                  <time
                    dateTime={log.created_at}
                    title={formatDateTime(log.created_at)}
                    className="shrink-0 text-[0.7rem] text-ink-soft"
                  >
                    {formatRelative(log.created_at)}
                  </time>
                </li>
              );
            })}
          </ol>
        )}

        <div className="mt-4">
          <LogPager
            page={params.page}
            pageSize={params.pageSize}
            total={count ?? 0}
          />
        </div>
      </main>
    </>
  );
}
