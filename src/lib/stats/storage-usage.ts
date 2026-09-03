import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { STORAGE_BUCKETS } from "@/lib/domain/enums";
import type { BucketName } from "@/lib/storage";
import { PLAN_TIERS, type PlanTier } from "@/lib/stats/storage-plan";

/**
 * Supabase's published per-plan caps. There is no API that reports "bytes
 * left on your account" — only the dashboard's billing page knows that — so
 * this page shows actual usage against whichever of these an admin has
 * picked for this project on the Storage page.
 */
export type TableSize = { tableName: string; bytes: number; rowEstimate: number };
export type BucketUsage = { bucket: BucketName; label: string; objectCount: number; bytes: number };

export type StorageUsage = {
  planTier: PlanTier;
  database: { bytes: number; limitBytes: number };
  tables: TableSize[];
  storage: { bytes: number; limitBytes: number };
  buckets: BucketUsage[];
  /** Non-null when one of the three RPCs failed — figures below may read 0. */
  error: string | null;
};

const BUCKET_LABELS: Record<BucketName, string> = {
  [STORAGE_BUCKETS.documents]: "Application documents",
  [STORAGE_BUCKETS.paymentProofs]: "Payment proofs",
  [STORAGE_BUCKETS.agreements]: "Agreements",
  [STORAGE_BUCKETS.training]: "Training documents",
  [STORAGE_BUCKETS.approvalLetters]: "Approval letters",
};

export async function getStorageUsage(): Promise<StorageUsage> {
  const supabase = createAdminClient();

  const [dbSize, tableSizes, bucketUsage, settings] = await Promise.all([
    supabase.rpc("admin_database_size"),
    supabase.rpc("admin_table_sizes"),
    supabase.rpc("admin_object_storage_usage"),
    supabase.from("app_settings").select("plan_tier").eq("id", true).maybeSingle(),
  ]);

  const planTier = settings.data?.plan_tier ?? "free";
  const limits = PLAN_TIERS[planTier];

  const tables: TableSize[] = (tableSizes.data ?? [])
    .map((row) => ({
      tableName: row.table_name,
      bytes: row.total_bytes,
      rowEstimate: row.row_estimate,
    }))
    .sort((a, b) => b.bytes - a.bytes);

  const byBucket = new Map(
    (bucketUsage.data ?? []).map((row) => [row.bucket_id, row]),
  );

  // Every known bucket is listed even when empty, so a quiet bucket still
  // shows "0 B" rather than silently disappearing from the page.
  const buckets: BucketUsage[] = Object.values(STORAGE_BUCKETS).map((bucket) => {
    const row = byBucket.get(bucket);
    return {
      bucket,
      label: BUCKET_LABELS[bucket],
      objectCount: row?.object_count ?? 0,
      bytes: row?.total_bytes ?? 0,
    };
  });

  const totalStorageBytes = buckets.reduce((sum, b) => sum + b.bytes, 0);

  // Surface a failed call rather than let its 0/[] fallback read as real
  // usage — most commonly PostgREST briefly not yet knowing about a function
  // right after its migration lands.
  const error = dbSize.error ?? tableSizes.error ?? bucketUsage.error;

  return {
    planTier,
    database: { bytes: dbSize.data ?? 0, limitBytes: limits.databaseBytes },
    tables,
    storage: { bytes: totalStorageBytes, limitBytes: limits.storageBytes },
    buckets,
    error: error ? error.message : null,
  };
}
