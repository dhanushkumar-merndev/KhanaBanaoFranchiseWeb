import type { Metadata } from "next";
import {
  BadgeIndianRupee,
  CalendarClock,
  CheckCircle2,
  FileSignature,
  FileText,
  Inbox,
  Rocket,
  Store,
  ThumbsUp,
  UserPlus,
  Users,
  XCircle,
} from "lucide-react";
import { BarChartCard, DonutChartCard, TrendChartCard } from "@/components/charts/charts";
import { PageHeader } from "@/components/shell/page-header";
import { ChartCard, StatCard } from "@/components/shell/stat-card";
import { Topbar } from "@/components/shell/topbar";
import { requireAdmin } from "@/lib/auth/session";
import { getDashboardStats, getMemberPerformance } from "@/lib/stats/dashboard";
import { MemberPerformanceTable } from "./member-performance-table";

export const metadata: Metadata = { title: "Dashboard · Khana Banao" };

export default async function AdminDashboardPage() {
  const profile = await requireAdmin();
  const [stats, performance] = await Promise.all([
    getDashboardStats(),
    getMemberPerformance(),
  ]);

  const { cards } = stats;

  return (
    <>
      <Topbar profile={profile} crumbs={[{ label: "Dashboard" }]} />

      <main className="min-w-0 flex-1 px-4 py-6 md:px-6">
        <PageHeader
          title={`Welcome back, ${profile.full_name.split(" ")[0]}`}
          description="Everything moving through the franchise pipeline, at a glance. Every number links to the rows behind it."
        />

        {/* Summary cards (spec §22) */}
        <section aria-labelledby="summary-heading">
          <h2 id="summary-heading" className="sr-only">
            Summary
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6">
            <StatCard
              label="Total leads"
              value={cards.total_leads}
              href="/admin/leads"
              icon={Users}
              tone="neutral"
            />
            <StatCard
              label="New leads"
              value={cards.new_leads}
              href="/admin/leads?status=NEW"
              icon={Inbox}
              tone="info"
              hint="Awaiting first contact"
            />
            <StatCard
              label="Assigned leads"
              value={cards.assigned_leads}
              href="/admin/leads?assigned=yes"
              icon={UserPlus}
              tone="info"
            />
            <StatCard
              label="Follow-ups due"
              value={cards.followups_due}
              href="/admin/follow-ups?due=overdue"
              icon={CalendarClock}
              tone={cards.followups_due > 0 ? "warn" : "neutral"}
              hint="Due now or overdue"
            />
            <StatCard
              label="Accepted leads"
              value={cards.accepted_leads}
              href="/admin/leads?outcome=accepted"
              icon={ThumbsUp}
              tone="success"
            />
            <StatCard
              label="Rejected leads"
              value={cards.rejected_leads}
              href="/admin/leads?status=REJECTED"
              icon={XCircle}
              tone="danger"
            />
            <StatCard
              label="Applications submitted"
              value={cards.applications_submitted}
              href="/admin/applications"
              icon={FileText}
              tone="info"
            />
            <StatCard
              label="Documents to review"
              value={cards.documents_pending_review}
              href="/admin/documents?status=UPLOADED"
              icon={FileText}
              tone={cards.documents_pending_review > 0 ? "warn" : "neutral"}
            />
            <StatCard
              label="Payments to approve"
              value={cards.payments_pending_approval}
              href="/admin/payments?status=PROOF_SUBMITTED"
              icon={BadgeIndianRupee}
              tone={cards.payments_pending_approval > 0 ? "warn" : "neutral"}
            />
            <StatCard
              label="Agreements pending"
              value={cards.agreements_pending}
              href="/admin/agreements"
              icon={FileSignature}
              tone={cards.agreements_pending > 0 ? "warn" : "neutral"}
            />
            <StatCard
              label="Active franchises"
              value={cards.active_franchises}
              href="/admin/franchises"
              icon={Store}
              tone="success"
            />
            <StatCard
              label="Live franchises"
              value={cards.live_franchises}
              href="/admin/franchises?status=LIVE"
              icon={Rocket}
              tone="success"
            />
          </div>
        </section>

        {/* Charts (spec §22) */}
        <section aria-labelledby="charts-heading" className="mt-6">
          <h2 id="charts-heading" className="sr-only">
            Analytics
          </h2>
          <div className="grid gap-3 lg:grid-cols-2">
            <ChartCard
              title="Monthly lead trend"
              description="Enquiries received over the last twelve months"
              className="lg:col-span-2"
            >
              <TrendChartCard data={stats.monthlyLeadTrend} height={230} />
            </ChartCard>

            <ChartCard
              title="Leads by status"
              description="Where every lead currently sits"
            >
              <BarChartCard data={stats.leadsByStatus} height={300} />
            </ChartCard>

            <ChartCard title="Leads by source" description="Where enquiries come from">
              <BarChartCard data={stats.leadsBySource} height={300} />
            </ChartCard>

            <ChartCard
              title="Leads by member"
              description="Round-robin distribution across the team"
            >
              <BarChartCard
                data={stats.leadsByMember}
                height={260}
                emptyLabel="Leads appear here once members are assigned."
              />
            </ChartCard>

            <ChartCard
              title="Accepted vs rejected"
              description="Outcome of every enquiry so far"
            >
              <DonutChartCard data={stats.acceptedVsRejected} height={260} />
            </ChartCard>

            <ChartCard
              title="Franchise pipeline"
              description="Franchises by activation stage"
            >
              <DonutChartCard
                data={stats.franchisePipeline}
                height={260}
                emptyLabel="Stages appear once the first franchise is activated."
              />
            </ChartCard>

            <ChartCard title="Payment status" description="Franchise fee collection">
              <DonutChartCard
                data={stats.paymentStatus}
                height={260}
                emptyLabel="Payments appear here once the first proof is recorded."
              />
            </ChartCard>

            <ChartCard
              title="Active franchises by territory"
              description="Geographic spread of the network"
              className="lg:col-span-2"
            >
              <BarChartCard
                data={stats.franchisesByTerritory}
                height={240}
                layout="horizontal"
                emptyLabel="Territories appear once franchises are activated."
              />
            </ChartCard>
          </div>
        </section>

        {/* Member performance (spec §22) */}
        <section aria-labelledby="performance-heading" className="mt-6">
          <div className="rounded-xl border border-line bg-surface shadow-[0_10px_30px_-24px_rgba(110,40,20,0.5)]">
            <div className="border-b border-line px-4 py-3.5">
              <h2
                id="performance-heading"
                className="font-display text-[0.95rem] font-bold text-ink"
              >
                Member performance
              </h2>
              <p className="mt-0.5 text-[0.72rem] text-ink-soft">
                Pipeline activity per member. Scroll sideways for the full set of
                columns.
              </p>
            </div>
            <MemberPerformanceTable rows={performance} />
          </div>
        </section>

        <p className="mt-6 flex items-center gap-1.5 text-[0.72rem] text-ink-soft">
          <CheckCircle2 className="size-3.5" aria-hidden="true" />
          Figures are live — this page is rendered fresh on every visit.
        </p>
      </main>
    </>
  );
}
