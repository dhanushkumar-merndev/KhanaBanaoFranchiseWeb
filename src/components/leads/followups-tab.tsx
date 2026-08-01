"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CalendarClock, Check, RotateCw, X } from "lucide-react";
import { toast } from "sonner";
import {
  cancelFollowup,
  completeFollowup,
  rescheduleFollowup,
} from "@/app/actions/leads";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, Input, Textarea } from "@/components/ui/field";
import { EmptyState } from "@/components/ui/feedback";
import { FOLLOWUP_STATUS_LABELS, followupStatusTone } from "@/lib/domain/status";
import { formatDateTime, formatRelative, localInputToIso } from "@/lib/format";
import {
  rescheduleFollowupSchema,
  type RescheduleFollowupInput,
} from "@/lib/validation/lead";
import type { LeadDetailFollowup } from "@/lib/data/lead-detail";

const CHANNEL_LABEL: Record<string, string> = {
  PHONE: "Phone call",
  WHATSAPP: "WhatsApp",
  EMAIL: "Email",
  VIDEO_MEETING: "Video meeting",
  OFFICE_MEETING: "Office meeting",
  OTHER: "Other",
};

export function FollowupsTab({
  followups,
  canManage,
}: {
  followups: LeadDetailFollowup[];
  /** False on a rejected lead — nothing further is owed. */
  canManage: boolean;
}) {
  const router = useRouter();
  const [completing, setCompleting] = useState<LeadDetailFollowup | null>(null);
  const [rescheduling, setRescheduling] = useState<LeadDetailFollowup | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  if (followups.length === 0) {
    return (
      <EmptyState
        title="No follow-ups scheduled"
        body="Schedule one from the actions above so this lead does not go quiet."
        icon={CalendarClock}
      />
    );
  }

  const cancel = async (followup: LeadDetailFollowup) => {
    setBusy(followup.id);
    try {
      const result = await cancelFollowup(followup.id);
      if (result.ok) {
        toast.success("Follow-up cancelled.");
        router.refresh();
      } else {
        toast.error(result.message);
      }
    } finally {
      setBusy(null);
    }
  };

  return (
    <>
      <ul className="space-y-3">
        {followups.map((followup) => {
          const overdue = followup.isOverdue;

          return (
            <li
              key={followup.id}
              className="rounded-xl border border-line bg-surface px-4 py-3"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p
                      className={[
                        "text-[0.85rem] font-semibold",
                        overdue ? "text-danger" : "text-ink",
                      ].join(" ")}
                    >
                      {formatDateTime(followup.due_at)}
                    </p>
                    <StatusBadge
                      label={
                        overdue
                          ? "Overdue"
                          : FOLLOWUP_STATUS_LABELS[followup.status]
                      }
                      tone={
                        overdue ? "danger" : followupStatusTone(followup.status)
                      }
                    />
                    {followup.channel && (
                      <span className="text-[0.72rem] text-ink-soft">
                        {CHANNEL_LABEL[followup.channel] ?? followup.channel}
                      </span>
                    )}
                  </div>

                  <p className="mt-0.5 text-[0.7rem] text-ink-soft">
                    {followup.status === "PENDING"
                      ? `Due ${formatRelative(followup.due_at)}`
                      : followup.completed_at
                        ? `Completed ${formatRelative(followup.completed_at)}`
                        : `Created ${formatRelative(followup.created_at)}`}
                    {followup.memberName && ` · ${followup.memberName}`}
                  </p>

                  {followup.note && (
                    <p className="mt-2 whitespace-pre-wrap text-[0.82rem] leading-relaxed text-ink">
                      {followup.note}
                    </p>
                  )}

                  {followup.completed_note && (
                    <p className="mt-2 rounded-lg bg-ok/8 px-3 py-2 text-[0.8rem] leading-relaxed text-ink">
                      <span className="font-semibold">Outcome:</span>{" "}
                      {followup.completed_note}
                    </p>
                  )}
                </div>

                {canManage && followup.status === "PENDING" && (
                  <div className="flex shrink-0 flex-wrap gap-1.5">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setCompleting(followup)}
                    >
                      <Check />
                      Complete
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setRescheduling(followup)}
                    >
                      <RotateCw />
                      Reschedule
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      loading={busy === followup.id}
                      onClick={() => void cancel(followup)}
                      aria-label="Cancel follow-up"
                    >
                      <X />
                    </Button>
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      {completing && (
        <CompleteDialog
          followup={completing}
          onDone={() => setCompleting(null)}
        />
      )}
      {rescheduling && (
        <RescheduleDialog
          followup={rescheduling}
          onDone={() => setRescheduling(null)}
        />
      )}
    </>
  );
}

function CompleteDialog({
  followup,
  onDone,
}: {
  followup: LeadDetailFollowup;
  onDone: () => void;
}) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [pending, setPending] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setPending(true);
    try {
      const result = await completeFollowup(followup.id, note);
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success("Follow-up completed.");
      router.refresh();
      onDone();
    } finally {
      setPending(false);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && !pending && onDone()}>
      <DialogContent className="max-w-md">
        <form onSubmit={submit}>
          <DialogHeader>
            <DialogTitle>Complete this follow-up</DialogTitle>
            <DialogDescription>
              Due {formatDateTime(followup.due_at)}.
            </DialogDescription>
          </DialogHeader>

          <DialogBody>
            <Field
              label="What came of it?"
              htmlFor="fu-complete-note"
              hint="Optional, but it is what the next person reads."
            >
              <Textarea
                id="fu-complete-note"
                rows={3}
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="e.g. Confirmed interest, sending the application link."
              />
            </Field>
          </DialogBody>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onDone} disabled={pending}>
              Cancel
            </Button>
            <Button type="submit" loading={pending}>
              Mark complete
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function RescheduleDialog({
  followup,
  onDone,
}: {
  followup: LeadDetailFollowup;
  onDone: () => void;
}) {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<RescheduleFollowupInput>({
    resolver: zodResolver(rescheduleFollowupSchema),
    defaultValues: { followupId: followup.id, dueAt: "", note: "" },
  });

  const onSubmit = handleSubmit(async (values) => {
    const result = await rescheduleFollowup({
      ...values,
      dueAt: localInputToIso(values.dueAt),
    });
    if (!result.ok) {
      if (result.fieldErrors) {
        for (const [field, message] of Object.entries(result.fieldErrors)) {
          setError(field as keyof RescheduleFollowupInput, {
            type: "server",
            message,
          });
        }
      }
      toast.error(result.message);
      return;
    }
    toast.success("Follow-up rescheduled.");
    router.refresh();
    onDone();
  });

  return (
    <Dialog open onOpenChange={(open) => !open && onDone()}>
      <DialogContent className="max-w-md">
        <form onSubmit={onSubmit}>
          <input type="hidden" {...register("followupId")} />
          <DialogHeader>
            <DialogTitle>Reschedule this follow-up</DialogTitle>
            <DialogDescription>
              The original stays in the history marked as rescheduled.
            </DialogDescription>
          </DialogHeader>

          <DialogBody className="space-y-4">
            <Field
              label="New date and time"
              htmlFor="fu-new-due"
              required
              error={errors.dueAt?.message}
            >
              <Input
                id="fu-new-due"
                type="datetime-local"
                aria-invalid={Boolean(errors.dueAt)}
                {...register("dueAt")}
              />
            </Field>

            <Field label="Note" htmlFor="fu-new-note" error={errors.note?.message}>
              <Textarea
                id="fu-new-note"
                rows={2}
                placeholder="Leave blank to carry the original note across."
                {...register("note")}
              />
            </Field>
          </DialogBody>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onDone} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" loading={isSubmitting}>
              Reschedule
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
