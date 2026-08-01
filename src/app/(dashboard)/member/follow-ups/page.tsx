import type { Metadata } from "next";
import { PageHeader } from "@/components/shell/page-header";
import { TabNav } from "@/components/shell/tab-nav";
import { Topbar } from "@/components/shell/topbar";
import { FollowupQueueTable } from "@/components/leads/followup-queue-table";
import { requireProfile } from "@/lib/auth/session";
import {
  FOLLOWUP_VIEWS,
  FOLLOWUP_VIEW_LABELS,
  listFollowups,
  type FollowupView,
} from "@/lib/data/followups";
import { parseTableParams, type RawSearchParams } from "@/lib/table/params";

export const metadata: Metadata = { title: "My follow-ups · Khana Banao" };

export default async function MemberFollowupsPage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  const [profile, raw] = await Promise.all([requireProfile(), searchParams]);

  const rawView = Array.isArray(raw.view) ? raw.view[0] : raw.view;
  const view: FollowupView = FOLLOWUP_VIEWS.includes(rawView as FollowupView)
    ? (rawView as FollowupView)
    : "today";

  const params = parseTableParams(raw, {
    sort: view === "completed" ? "completed_at" : "due_at",
    dir: view === "completed" ? "desc" : "asc",
  });

  const { rows, total, counts } = await listFollowups(params, view, profile.id);

  const tabs = FOLLOWUP_VIEWS.map((key) => ({
    href: `/member/follow-ups?view=${key}`,
    label: FOLLOWUP_VIEW_LABELS[key],
    badge: key === "completed" ? undefined : counts[key],
  }));

  return (
    <>
      <Topbar profile={profile} crumbs={[{ label: "Follow-ups" }]} />

      <main className="min-w-0 flex-1 px-4 py-6 md:px-6">
        <PageHeader
          title="My follow-ups"
          description="What you have committed to, and when. Overdue items come first."
        />

        <TabNav
          items={tabs}
          active={`/member/follow-ups?view=${view}`}
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
          basePath="/member/leads"
          view={view}
        />
      </main>
    </>
  );
}
