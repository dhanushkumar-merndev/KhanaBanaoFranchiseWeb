import type { Metadata } from "next";
import { PageHeader } from "@/components/shell/page-header";
import { Topbar } from "@/components/shell/topbar";
import { EmailsTab } from "@/components/leads/emails-tab";
import { TabNav } from "@/components/shell/tab-nav";
import { requireAdmin } from "@/lib/auth/session";
import { resolveMemberNames } from "@/lib/data/leads";
import { createAdminClient } from "@/lib/supabase/admin";
import { EMAIL_LOG_STATUSES } from "@/lib/domain/enums";
import {
  parseTableParams,
  pickEnum,
  toRange,
  type RawSearchParams,
} from "@/lib/table/params";
import type { EmailLogRow } from "@/lib/data/pipeline";
import { LogPager } from "./log-pager";

export const metadata: Metadata = { title: "Email logs · Khana Banao" };

const VIEWS = ["all", "SENT", "FAILED", "SKIPPED"] as const;

const VIEW_LABELS: Record<(typeof VIEWS)[number], string> = {
  all: "All",
  SENT: "Sent",
  FAILED: "Failed",
  SKIPPED: "Not sent",
};

export default async function EmailLogsPage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  const [profile, raw] = await Promise.all([requireAdmin(), searchParams]);
  const params = parseTableParams(raw, { sort: "created_at", dir: "desc" });
  const { from, to } = toRange(params);

  const status = pickEnum(params.filters.status, EMAIL_LOG_STATUSES);

  const supabase = createAdminClient();

  let query = supabase
    .from("email_logs")
    .select(
      "id, template_key, to_email, subject, body_preview, status, error_message, created_at, triggered_by",
      { count: "exact" },
    );

  if (status) query = query.eq("status", status);
  if (params.q) {
    const term = `%${params.q}%`;
    query = query.or(`to_email.ilike.${term},subject.ilike.${term}`);
  }

  const { data, count } = await query
    .order("created_at", { ascending: false })
    .range(from, to);

  const names = await resolveMemberNames(
    (data ?? []).map((log) => log.triggered_by),
  );

  const emails: EmailLogRow[] = (data ?? []).map((log) => ({
    id: log.id,
    template_key: log.template_key,
    to_email: log.to_email,
    subject: log.subject,
    body_preview: log.body_preview,
    status: log.status,
    error_message: log.error_message,
    created_at: log.created_at,
    triggeredByName: log.triggered_by
      ? (names.get(log.triggered_by) ?? null)
      : null,
  }));

  const tabs = VIEWS.map((view) => ({
    href: view === "all" ? "/admin/email-logs" : `/admin/email-logs?status=${view}`,
    label: VIEW_LABELS[view],
  }));

  const activeHref =
    status && VIEWS.includes(status)
      ? `/admin/email-logs?status=${status}`
      : "/admin/email-logs";

  return (
    <>
      <Topbar profile={profile} crumbs={[{ label: "Email logs" }]} />

      <main className="min-w-0 flex-1 px-4 py-6 md:px-6">
        <PageHeader
          title="Email logs"
          description="Every send attempt this system has made, successful or not. A failed email never rolls back the action that triggered it."
        />

        <TabNav items={tabs} active={activeHref} label="Log views" className="mb-5" />

        <EmailsTab emails={emails} />

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
