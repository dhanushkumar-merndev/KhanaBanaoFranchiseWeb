import type { Metadata } from "next";
import Link from "next/link";
import { Wrench } from "lucide-react";
import { PageHeader } from "@/components/shell/page-header";
import { Topbar } from "@/components/shell/topbar";
import { StatusBadge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/feedback";
import { requireAdmin } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { FRANCHISE_STATUS_LABELS, franchiseStatusTone } from "@/lib/domain/status";

export const metadata: Metadata = { title: "Setup · Khana Banao" };

export default async function AdminSetupPage() {
  const profile = await requireAdmin();
  const supabase = createAdminClient();

  const { data: franchises } = await supabase
    .from("franchises")
    .select("id, franchise_id, franchise_name, owner_name, territory, status, lead_id")
    .order("created_at", { ascending: false })
    .limit(200);

  const ids = (franchises ?? []).map((franchise) => franchise.id);

  const { data: items } = ids.length
    ? await supabase
        .from("setup_items")
        .select("franchise_id, label, is_done")
        .in("franchise_id", ids)
        .order("sort_order")
    : { data: [] };

  const byFranchise = new Map<string, { label: string; is_done: boolean }[]>();
  for (const item of items ?? []) {
    const list = byFranchise.get(item.franchise_id) ?? [];
    list.push({ label: item.label, is_done: item.is_done });
    byFranchise.set(item.franchise_id, list);
  }

  return (
    <>
      <Topbar profile={profile} crumbs={[{ label: "Setup" }]} />

      <main className="min-w-0 flex-1 px-4 py-6 md:px-6">
        <PageHeader
          title="Setup"
          description="The twelve-point checklist for every franchise. Tick items off on a lead's Setup tab."
        />

        {(franchises ?? []).length === 0 ? (
          <EmptyState
            title="No franchises to set up"
            body="A checklist is created automatically the moment a lead is activated."
            icon={Wrench}
          />
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {(franchises ?? []).map((franchise) => {
              const list = byFranchise.get(franchise.id) ?? [];
              const done = list.filter((item) => item.is_done).length;
              const percent = list.length
                ? Math.round((done / list.length) * 100)
                : 0;

              return (
                <section
                  key={franchise.id}
                  className="rounded-xl border border-line bg-surface p-4"
                >
                  <header className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h2 className="font-display text-[0.95rem] font-bold text-ink">
                        <Link
                          href={`/admin/leads/${franchise.lead_id}?tab=setup`}
                          className="hover:text-brand-crimson"
                        >
                          {franchise.franchise_name}
                        </Link>
                      </h2>
                      <p className="mt-0.5 font-mono text-[0.7rem] uppercase text-ink-soft">
                        {franchise.franchise_id}
                        {franchise.territory && ` · ${franchise.territory}`}
                      </p>
                    </div>
                    <StatusBadge
                      label={FRANCHISE_STATUS_LABELS[franchise.status]}
                      tone={franchiseStatusTone(franchise.status)}
                    />
                  </header>

                  <div className="mt-3 flex items-center gap-3">
                    <div
                      className="h-2 flex-1 overflow-hidden rounded-full bg-surface-muted"
                      role="progressbar"
                      aria-valuenow={percent}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-label={`Setup progress for ${franchise.franchise_name}`}
                    >
                      <div
                        className="h-full rounded-full bg-ok transition-[width] duration-500"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                    <span className="shrink-0 text-[0.78rem] tabular-nums text-ink-soft">
                      {done}/{list.length}
                    </span>
                  </div>

                  {done < list.length && (
                    <ul className="mt-3 space-y-1">
                      {list
                        .filter((item) => !item.is_done)
                        .slice(0, 4)
                        .map((item) => (
                          <li
                            key={item.label}
                            className="text-[0.78rem] text-ink-soft"
                          >
                            • {item.label}
                          </li>
                        ))}
                      {list.filter((item) => !item.is_done).length > 4 && (
                        <li className="text-[0.75rem] text-ink-soft/70">
                          and {list.filter((item) => !item.is_done).length - 4} more
                        </li>
                      )}
                    </ul>
                  )}
                </section>
              );
            })}
          </div>
        )}
      </main>
    </>
  );
}
