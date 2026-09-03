"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { PLAN_TIERS, type PlanTier } from "@/lib/stats/storage-plan";
import type { ActionResult } from "@/lib/validation/result";

/** Which Supabase billing plan the Storage page should size its caps to. */
export async function setPlanTier(plan: PlanTier): Promise<ActionResult> {
  const profile = await requireAdmin();

  if (!(plan in PLAN_TIERS)) {
    return { ok: false, message: "That's not a recognised plan." };
  }

  const { error } = await createAdminClient()
    .from("app_settings")
    .update({ plan_tier: plan, updated_by: profile.id, updated_at: new Date().toISOString() })
    .eq("id", true);

  if (error) return { ok: false, message: error.message };

  revalidatePath("/admin/storage");
  return { ok: true };
}
