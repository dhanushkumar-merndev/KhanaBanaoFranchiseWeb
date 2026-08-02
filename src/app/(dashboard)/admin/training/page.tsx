import type { Metadata } from "next";
import Link from "next/link";
import { GraduationCap } from "lucide-react";
import { PageHeader } from "@/components/shell/page-header";
import { Topbar } from "@/components/shell/topbar";
import { StatusBadge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/feedback";
import { requireAdmin } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatDateTime } from "@/lib/format";
import type { StatusTone } from "@/lib/domain/status";
import type { TrainingStatus } from "@/lib/domain/enums";

export const metadata: Metadata = { title: "Training · Khana Banao" };

const LABEL: Record<TrainingStatus, string> = {
  TRAINING_PENDING: "Pending",
  TRAINING_SCHEDULED: "Scheduled",
  TRAINING_IN_PROGRESS: "In progress",
  TRAINING_COMPLETED: "Completed",
};

const TONE: Record<TrainingStatus, StatusTone> = {
  TRAINING_PENDING: "neutral",
  TRAINING_SCHEDULED: "info",
  TRAINING_IN_PROGRESS: "progress",
  TRAINING_COMPLETED: "success",
};

export default async function AdminTrainingPage() {
  const profile = await requireAdmin();
  const supabase = createAdminClient();

  const { data: records } = await supabase
    .from("training_records")
    .select("*")
    .order("scheduled_at", { ascending: true, nullsFirst: false })
    .limit(200);

  const franchiseIds = [
    ...new Set((records ?? []).map((record) => record.franchise_id)),
  ];

  const { data: franchises } = franchiseIds.length
    ? await supabase
        .from("franchises")
        .select("id, franchise_id, franchise_name, owner_name, lead_id")
        .in("id", franchiseIds)
    : { data: [] };

  const byId = new Map((franchises ?? []).map((f) => [f.id, f] as const));

  // Grouped by franchise: a trainer plans one partner's day, not one module.
  const grouped = new Map<string, typeof records>();
  for (const record of records ?? []) {
    const list = grouped.get(record.franchise_id) ?? [];
    list.push(record);
    grouped.set(record.franchise_id, list);
  }

  return (
    <>
      <Topbar profile={profile} crumbs={[{ label: "Training" }]} />

      <main className="min-w-0 flex-1 px-4 py-6 md:px-6">
        <PageHeader
          title="Training"
          description="Every scheduled module across all franchise partners. Schedule and complete modules on a lead's Training tab."
        />

        {grouped.size === 0 ? (
          <EmptyState
            title="No training scheduled"
            body="Modules appear here once a franchise is activated and its training is booked."
            icon={GraduationCap}
          />
        ) : (
          <div className="space-y-4">
            {[...grouped.entries()].map(([franchiseId, list]) => {
              const franchise = byId.get(franchiseId);
              if (!franchise) return null;
              const done = (list ?? []).filter(
                (record) => record.status === "TRAINING_COMPLETED",
              ).length;

              return (
                <section
                  key={franchiseId}
                  className="rounded-xl border border-line bg-surface"
                >
                  <header className="flex flex-wrap items-baseline justify-between gap-2 border-b border-line px-4 py-3">
                    <h2 className="font-display text-[0.95rem] font-bold text-ink">
                      <Link
                        href={`/admin/leads/${franchise.lead_id}?tab=training`}
                        className="hover:text-brand-crimson"
                      >
                        {franchise.franchise_name}
                      </Link>{" "}
                      <span className="font-mono text-[0.75rem] font-normal text-ink-soft">
                        {franchise.franchise_id}
                      </span>
                    </h2>
                    <p className="text-[0.78rem] text-ink-soft">
                      {done} of {list?.length ?? 0} complete
                    </p>
                  </header>

                  <ul className="divide-y divide-line/70">
                    {(list ?? []).map((record) => (
                      <li
                        key={record.id}
                        className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5"
                      >
                        <div className="min-w-0">
                          <p className="text-[0.85rem] font-medium text-ink">
                            {record.module}
                          </p>
                          <p className="text-[0.72rem] text-ink-soft">
                            {record.scheduled_at
                              ? formatDateTime(record.scheduled_at)
                              : "Not scheduled"}
                            {record.trainer && ` · ${record.trainer}`}
                            {record.venue && ` · ${record.venue}`}
                          </p>
                        </div>
                        <StatusBadge
                          label={LABEL[record.status]}
                          tone={TONE[record.status]}
                        />
                      </li>
                    ))}
                  </ul>
                </section>
              );
            })}
          </div>
        )}
      </main>
    </>
  );
}
