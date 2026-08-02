import type { Metadata } from "next";
import Link from "next/link";
import { CalendarDays, List } from "lucide-react";
import { FollowupCalendar } from "@/components/leads/followup-calendar";
import { PageHeader } from "@/components/shell/page-header";
import { TabNav } from "@/components/shell/tab-nav";
import { Topbar } from "@/components/shell/topbar";
import { FollowupQueueTable } from "@/components/leads/followup-queue-table";
import { requireProfile } from "@/lib/auth/session";
import {
  FOLLOWUP_VIEWS,
  FOLLOWUP_VIEW_LABELS,
  listFollowups,
  listFollowupsForMonth,
  normalizeFollowupMonth,
  type FollowupView,
} from "@/lib/data/followups";
import { parseTableParams, type RawSearchParams } from "@/lib/table/params";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "My follow-ups · Khana Banao" };

export default async function MemberFollowupsPage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  const [profile, raw] = await Promise.all([requireProfile(), searchParams]);
  const mode = raw.mode === "calendar" ? "calendar" : "table";
  const month = normalizeFollowupMonth(raw.month);

  const rawView = Array.isArray(raw.view) ? raw.view[0] : raw.view;
  const view: FollowupView = FOLLOWUP_VIEWS.includes(rawView as FollowupView)
    ? (rawView as FollowupView)
    : "today";

  const params = parseTableParams(raw, {
    sort: view === "completed" ? "completed_at" : "due_at",
    dir: view === "completed" ? "desc" : "asc",
  });

  let tableData: Awaited<ReturnType<typeof listFollowups>> | null = null;
  let calendarRows: Awaited<ReturnType<typeof listFollowupsForMonth>> = [];

  if (mode === "calendar") {
    calendarRows = await listFollowupsForMonth(month, profile.id);
  } else {
    tableData = await listFollowups(params, view, profile.id);
  }

  const tabs = FOLLOWUP_VIEWS.map((key) => ({
    href: `/member/follow-ups?view=${key}`,
    label: FOLLOWUP_VIEW_LABELS[key],
    badge: key === "completed" ? undefined : tableData?.counts[key],
  }));

  const todayKey = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

  return (
    <>
      <Topbar profile={profile} crumbs={[{ label: "Follow-ups" }]} />

      <main className="min-w-0 flex-1 px-4 py-6 md:px-6">
        <PageHeader
          title="My follow-ups"
          description="What you have committed to, and when. Overdue items come first."
          actions={
            <div className="inline-flex rounded-xl border border-line bg-surface p-1 shadow-sm">
              <Link
                href={`/member/follow-ups?view=${view}`}
                scroll={false}
                className={cn(
                  "inline-flex h-8 items-center gap-2 rounded-lg px-3 text-[0.76rem] font-semibold transition",
                  mode === "table"
                    ? "bg-brand-crimson text-white shadow-sm"
                    : "text-ink-soft hover:bg-surface-muted hover:text-ink",
                )}
              >
                <List className="size-3.5" /> Table
              </Link>
              <Link
                href={`/member/follow-ups?mode=calendar&month=${month}`}
                scroll={false}
                className={cn(
                  "inline-flex h-8 items-center gap-2 rounded-lg px-3 text-[0.76rem] font-semibold transition",
                  mode === "calendar"
                    ? "bg-brand-crimson text-white shadow-sm"
                    : "text-ink-soft hover:bg-surface-muted hover:text-ink",
                )}
              >
                <CalendarDays className="size-3.5" /> Calendar
              </Link>
            </div>
          }
        />

        {mode === "table" && tableData ? (
          <>
            <TabNav
              items={tabs}
              active={`/member/follow-ups?view=${view}`}
              label="Follow-up views"
              className="mb-5"
            />

            <FollowupQueueTable
              rows={tableData.rows}
              total={tableData.total}
              page={params.page}
              pageSize={params.pageSize}
              sort={params.sort}
              dir={params.dir}
              basePath="/member/leads"
              view={view}
            />
          </>
        ) : (
          <FollowupCalendar
            rows={calendarRows}
            month={month}
            todayKey={todayKey}
            pagePath="/member/follow-ups"
            leadBasePath="/member/leads"
          />
        )}
      </main>
    </>
  );
}
