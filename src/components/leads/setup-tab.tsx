"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Wrench } from "lucide-react";
import { toast } from "sonner";
import { toggleSetupItem } from "@/app/actions/franchises";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, Input, Label } from "@/components/ui/field";
import { EmptyState } from "@/components/ui/feedback";
import { formatDateTime } from "@/lib/format";
import type { FranchiseDetail } from "@/lib/data/pipeline";

export function SetupTab({
  franchise,
  isAdmin,
}: {
  franchise: FranchiseDetail | null;
  isAdmin: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [noting, setNoting] = useState<string | null>(null);
  const [note, setNote] = useState("");

  if (!franchise) {
    return (
      <EmptyState
        title="Setup starts after activation"
        body="The twelve-point checklist is created automatically when this lead becomes a franchise."
        icon={Wrench}
      />
    );
  }

  if (franchise.setup.length === 0) {
    return (
      <EmptyState
        title="No checklist items"
        body="This franchise was activated without a checklist. Contact support."
        icon={Wrench}
      />
    );
  }

  const done = franchise.setup.filter((item) => item.is_done).length;
  const total = franchise.setup.length;
  const percent = Math.round((done / total) * 100);

  const toggle = async (itemId: string, next: boolean, itemNote?: string) => {
    setBusy(itemId);
    try {
      const result = await toggleSetupItem(itemId, next, itemNote);
      if (result.ok) router.refresh();
      else toast.error(result.message);
    } finally {
      setBusy(null);
      setNoting(null);
      setNote("");
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-line bg-surface px-4 py-3.5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-display text-[0.95rem] font-bold text-ink">
            Setup checklist
          </h2>
          <p className="text-[0.8rem] text-ink-soft">
            {done} of {total} complete
          </p>
        </div>

        <div
          className="mt-2.5 h-2 overflow-hidden rounded-full bg-surface-muted"
          role="progressbar"
          aria-valuenow={percent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Setup progress"
        >
          <div
            className="h-full rounded-full bg-ok transition-[width] duration-500"
            style={{ width: `${percent}%` }}
          />
        </div>

        {done === total && (
          <p className="mt-2.5 text-[0.8rem] font-medium text-[#217a33]">
            Everything is done — this franchise is ready to go live.
          </p>
        )}
      </div>

      <ul className="space-y-2">
        {franchise.setup.map((item) => (
          <li
            key={item.id}
            className="rounded-xl border border-line bg-surface px-4 py-3"
          >
            <div className="flex items-start gap-3">
              <Label
                htmlFor={`setup-${item.id}`}
                className="mb-0 flex min-w-0 flex-1 cursor-pointer items-start gap-3 font-normal"
              >
                <Checkbox
                  id={`setup-${item.id}`}
                  className="mt-0.5"
                  checked={item.is_done}
                  disabled={!isAdmin || busy === item.id}
                  onChange={(event) => void toggle(item.id, event.target.checked)}
                />
                <span className="min-w-0">
                  <span
                    className={
                      item.is_done
                        ? "block text-[0.87rem] font-medium text-ink"
                        : "block text-[0.87rem] text-ink"
                    }
                  >
                    {item.label}
                  </span>
                  {item.note && (
                    <span className="mt-0.5 block text-[0.75rem] text-ink-soft">
                      {item.note}
                    </span>
                  )}
                  {item.completed_at && (
                    <span className="mt-0.5 block text-[0.7rem] text-ink-soft">
                      Done {formatDateTime(item.completed_at)}
                      {item.completedByName && ` by ${item.completedByName}`}
                    </span>
                  )}
                </span>
              </Label>

              {isAdmin && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setNoting(noting === item.id ? null : item.id);
                    setNote(item.note ?? "");
                  }}
                >
                  Note
                </Button>
              )}
            </div>

            {noting === item.id && (
              <div className="mt-3 flex flex-wrap items-end gap-2 border-t border-line pt-3">
                <Field
                  label="Note"
                  htmlFor={`setup-note-${item.id}`}
                  className="min-w-[12rem] flex-1"
                >
                  <Input
                    id={`setup-note-${item.id}`}
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                    placeholder="e.g. Waiting on the bank confirmation letter."
                  />
                </Field>
                <Button
                  size="sm"
                  loading={busy === item.id}
                  onClick={() => void toggle(item.id, item.is_done, note)}
                >
                  Save
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setNoting(null)}>
                  Cancel
                </Button>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
