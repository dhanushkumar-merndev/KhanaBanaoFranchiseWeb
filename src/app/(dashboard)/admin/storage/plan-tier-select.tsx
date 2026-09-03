"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { setPlanTier } from "@/app/actions/settings";
import { Select } from "@/components/ui/field";
import { PLAN_TIERS, type PlanTier } from "@/lib/stats/storage-plan";

/**
 * Which plan's caps the usage bars below are measured against. Supabase
 * doesn't expose that over an API, so an admin sets it here once instead of
 * an engineer editing a constant in code.
 */
export function PlanTierSelect({ value }: { value: PlanTier }) {
  const [plan, setPlan] = useState(value);
  const [pending, startTransition] = useTransition();

  function onChange(next: PlanTier) {
    const previous = plan;
    setPlan(next);
    startTransition(async () => {
      const result = await setPlanTier(next);
      if (!result.ok) {
        setPlan(previous);
        toast.error(result.message);
        return;
      }
      toast.success(`Now comparing usage against the ${PLAN_TIERS[next].label}.`);
    });
  }

  return (
    <label className="flex items-center gap-2 text-[0.78rem] font-medium text-ink-soft">
      Plan
      <Select
        value={plan}
        disabled={pending}
        onChange={(event) => onChange(event.target.value as PlanTier)}
        className="h-9 w-auto py-1.5 text-[0.8rem]"
      >
        {Object.entries(PLAN_TIERS).map(([tier, { label }]) => (
          <option key={tier} value={tier}>
            {label}
          </option>
        ))}
      </Select>
    </label>
  );
}
