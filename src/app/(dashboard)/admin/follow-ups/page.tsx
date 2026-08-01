import type { Metadata } from "next";
import { PageHeader } from "@/components/shell/page-header";
import { TabNav } from "@/components/shell/tab-nav";
import { Topbar } from "@/components/shell/topbar";
import { FollowupQueueTable } from "@/components/leads/followup-queue-table";
import { requireAdmin } from "@/lib/auth/session";
import {
  FOLLOWUP_VIEWS,
  FOLLOWUP_VIEW_LABELS,
  listFollowups,
  type FollowupView,
} from "@/lib/data/followups";
import { listActiveMembers } from "@/lib/data/leads";
import { parseTableParams, type RawSearchParams } from "@/lib/table/params";

export const metadata: Metadata = { title: "Follow-ups · Khana Banao" };

export default async function AdminFollowupsPage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  const [profile, raw] = await Promise.all([requireAdmin(), searchParams]);

  // `?due=overdue` comes from the dashboard card, so that link lands on the
  // matching view rather than the default one.
  const rawView = Array.isArray(raw.view) ? raw.view[0] : raw.view;
  const fallback = raw.due === "overdue" ? "overdue" : "today";
  const view: FollowupView = FOLLOWUP_VIEWS.includes(rawView as FollowupView)
    ? (rawView as FollowupView)
    : fallback;

  const params = parseTableParams(raw, {
    sort: view === "completed" ? "completed_at" : "due_at",
    dir: view === "completed" ? "desc" : "asc",
  });

  const [{ rows, total, counts }, members] = await Promise.all([
    listFollowups(params, view, null),
    listActiveMembers(),
  ]);

  const tabs = FOLLOWUP_VIEWS.map((key) => ({
    href: `/admin/follow-ups?view=${key}`,
    label: FOLLOWUP_VIEW_LABELS[key],
    badge: key === "completed" ? undefined : counts[key],
  }));

  return (
    <>
      <Topbar profile={profile} crumbs={[{ label: "Follow-ups" }]} />

      <main className="min-w-0 flex-1 px-4 py-6 md:px-6">
        <PageHeader
          title="Follow-ups"
          description="Every commitment the team has made to a lead, across all members."
        />

        <TabNav
          items={tabs}
          active={`/admin/follow-ups?view=${view}`}
          label="Follow-up views"
          className="mb-5"
        />

        <FollowupQueueTable
          rows={rows}
          total={total}
          page={params.page}
          pageSize={params.pageSize}
          sort={params.sort}
          dir={params.dir}
          basePath="/admin/leads"
          view={view}
          memberOptions={members.map((member) => ({
            value: member.id,
            label: member.full_name,
          }))}
        />
      </main>
    </>
  );
}
