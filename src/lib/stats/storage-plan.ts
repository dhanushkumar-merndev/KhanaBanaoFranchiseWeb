export type PlanTier = "free" | "pro";

export const PLAN_TIERS: Record<
  PlanTier,
  { label: string; databaseBytes: number; storageBytes: number }
> = {
  free: {
    label: "Free plan",
    databaseBytes: 500 * 1024 * 1024,
    storageBytes: 1024 * 1024 * 1024,
  },
  pro: {
    label: "Pro plan",
    databaseBytes: 8 * 1024 * 1024 * 1024,
    storageBytes: 100 * 1024 * 1024 * 1024,
  },
};
