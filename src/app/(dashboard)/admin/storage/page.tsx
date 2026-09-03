import type { Metadata } from "next";
import { AlertTriangle, Database as DatabaseIcon, HardDrive } from "lucide-react";
import { PageHeader } from "@/components/shell/page-header";
import { Topbar } from "@/components/shell/topbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAdmin } from "@/lib/auth/session";
import { formatBytes } from "@/lib/format";
import {
  getStorageUsage,
  type BucketUsage,
  type TableSize,
} from "@/lib/stats/storage-usage";
import { PLAN_TIERS } from "@/lib/stats/storage-plan";
import { cn } from "@/lib/utils";
import { PlanTierSelect } from "./plan-tier-select";

export const metadata: Metadata = { title: "Storage · Khana Banao" };

function UsageBar({ used, limit }: { used: number; limit: number }) {
  const pct = limit > 0 ? Math.min(100, (used / limit) * 100) : 0;
  const tone =
    pct >= 90 ? "bg-danger" : pct >= 70 ? "bg-warn" : "bg-brand-crimson";
  return (
    <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-surface-muted">
      <div
        className={cn("h-full rounded-full transition-all", tone)}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

function UsageSummary({
  icon: Icon,
  title,
  used,
  limit,
  planLabel,
}: {
  icon: typeof DatabaseIcon;
  title: string;
  used: number;
  limit: number;
  planLabel: string;
}) {
  const pct = limit > 0 ? (used / limit) * 100 : 0;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Icon className="size-4 text-brand-crimson" aria-hidden="true" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="font-display text-2xl font-bold tabular-nums text-ink">
          {formatBytes(used)}
          <span className="ml-1 text-sm font-normal text-ink-soft">
            of {formatBytes(limit)}
          </span>
        </p>
        <UsageBar used={used} limit={limit} />
        <p className="mt-1.5 text-[0.72rem] text-ink-soft">
          {pct.toFixed(1)}% used · {formatBytes(Math.max(limit - used, 0))} left on the{" "}
          {planLabel}
        </p>
      </CardContent>
    </Card>
  );
}

function TableSizeRow({ table, dbBytes }: { table: TableSize; dbBytes: number }) {
  const share = dbBytes > 0 ? (table.bytes / dbBytes) * 100 : 0;
  return (
    <li className="flex items-center justify-between gap-3 border-b border-line/60 py-2 last:border-0">
      <div className="min-w-0">
        <p className="truncate text-[0.83rem] font-medium text-ink">{table.tableName}</p>
        <p className="text-[0.7rem] text-ink-soft">~{table.rowEstimate.toLocaleString()} rows</p>
      </div>
      <div className="shrink-0 text-right">
        <p className="text-[0.83rem] tabular-nums text-ink">{formatBytes(table.bytes)}</p>
        <p className="text-[0.7rem] text-ink-soft">{share.toFixed(1)}%</p>
      </div>
    </li>
  );
}

function BucketRow({ bucket, storageBytes }: { bucket: BucketUsage; storageBytes: number }) {
  const share = storageBytes > 0 ? (bucket.bytes / storageBytes) * 100 : 0;
  return (
    <li className="flex items-center justify-between gap-3 border-b border-line/60 py-2 last:border-0">
      <div className="min-w-0">
        <p className="truncate text-[0.83rem] font-medium text-ink">{bucket.label}</p>
        <p className="text-[0.7rem] text-ink-soft">
          {bucket.bucket} · {bucket.objectCount.toLocaleString()} file
          {bucket.objectCount === 1 ? "" : "s"}
        </p>
      </div>
      <div className="shrink-0 text-right">
        <p className="text-[0.83rem] tabular-nums text-ink">{formatBytes(bucket.bytes)}</p>
        <p className="text-[0.7rem] text-ink-soft">{share.toFixed(1)}%</p>
      </div>
    </li>
  );
}

export default async function StoragePage() {
  const profile = await requireAdmin();
  const usage = await getStorageUsage();
  const planLabel = PLAN_TIERS[usage.planTier].label;

  return (
    <>
      <Topbar profile={profile} crumbs={[{ label: "Storage" }]} />

      <main className="min-w-0 flex-1 px-4 py-6 md:px-6">
        <PageHeader
          title="Storage"
          description="Database size and object storage used across every lead, application, agreement and franchise — with how much is left on the current Supabase plan."
          actions={<PlanTierSelect value={usage.planTier} />}
        />

        {usage.error && (
          <div className="mb-4 flex items-start gap-3 rounded-xl border border-danger/30 bg-danger/5 px-4 py-3">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-danger" aria-hidden="true" />
            <div>
              <p className="text-[0.83rem] font-medium text-ink">
                Couldn&apos;t load current usage
              </p>
              <p className="mt-0.5 text-[0.78rem] text-ink-soft">
                {usage.error} Figures below are showing 0 rather than real numbers.
                Reload the page — this is usually a few seconds&apos; delay right after a
                database migration.
              </p>
            </div>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <UsageSummary
            icon={DatabaseIcon}
            title="Database"
            used={usage.database.bytes}
            limit={usage.database.limitBytes}
            planLabel={planLabel}
          />
          <UsageSummary
            icon={HardDrive}
            title="Object storage"
            used={usage.storage.bytes}
            limit={usage.storage.limitBytes}
            planLabel={planLabel}
          />
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Tables</CardTitle>
            </CardHeader>
            <CardContent>
              {usage.tables.length === 0 ? (
                <p className="text-[0.8rem] text-ink-soft">No tables found.</p>
              ) : (
                <ul>
                  {usage.tables.map((table) => (
                    <TableSizeRow key={table.tableName} table={table} dbBytes={usage.database.bytes} />
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Buckets</CardTitle>
            </CardHeader>
            <CardContent>
              <ul>
                {usage.buckets.map((bucket) => (
                  <BucketRow key={bucket.bucket} bucket={bucket} storageBytes={usage.storage.bytes} />
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>

        <p className="mt-4 text-[0.7rem] text-ink-soft">
          Plan limits shown here are the published Supabase caps for whichever plan is picked above,
          not a live billing figure. For exact billing numbers, see Project Settings → Usage in the
          Supabase dashboard.
        </p>
      </main>
    </>
  );
}
