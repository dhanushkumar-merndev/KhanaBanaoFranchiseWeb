"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarPlus, GraduationCap } from "lucide-react";
import { toast } from "sonner";
import { scheduleTraining, setTrainingStatus } from "@/app/actions/franchises";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/feedback";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { TRAINING_MODULES, type TrainingStatus } from "@/lib/domain/enums";
import { formatDateTime, localInputToIso } from "@/lib/format";
import type { FranchiseDetail } from "@/lib/data/pipeline";
import type { StatusTone } from "@/lib/domain/status";

const TRAINING_LABEL: Record<TrainingStatus, string> = {
  TRAINING_PENDING: "Pending",
  TRAINING_SCHEDULED: "Scheduled",
  TRAINING_IN_PROGRESS: "In progress",
  TRAINING_COMPLETED: "Completed",
};

const TRAINING_TONE: Record<TrainingStatus, StatusTone> = {
  TRAINING_PENDING: "neutral",
  TRAINING_SCHEDULED: "info",
  TRAINING_IN_PROGRESS: "progress",
  TRAINING_COMPLETED: "success",
};

/** What a record can move to next. Training only moves forward. */
const NEXT: Partial<Record<TrainingStatus, TrainingStatus>> = {
  TRAINING_PENDING: "TRAINING_SCHEDULED",
  TRAINING_SCHEDULED: "TRAINING_IN_PROGRESS",
  TRAINING_IN_PROGRESS: "TRAINING_COMPLETED",
};

export function TrainingTab({
  franchise,
  isAdmin,
}: {
  franchise: FranchiseDetail | null;
  isAdmin: boolean;
}) {
  const [scheduleOpen, setScheduleOpen] = useState(false);

  if (!franchise) {
    return (
      <EmptyState
        title="Training starts after activation"
        body="Once this lead is activated as a franchise, its training modules are scheduled here."
        icon={GraduationCap}
      />
    );
  }

  const scheduleButton = isAdmin && (
    <Button size="sm" onClick={() => setScheduleOpen(true)}>
      <CalendarPlus />
      Schedule training
    </Button>
  );

  const done = franchise.training.filter(
    (record) => record.status === "TRAINING_COMPLETED",
  ).length;

  return (
    <div className="space-y-4">
      {franchise.training.length === 0 ? (
        <EmptyState
          title="No training scheduled yet"
          body="Schedule the modules this partner needs before they set up."
          icon={GraduationCap}
          action={scheduleButton || undefined}
        />
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-[0.82rem] text-ink-soft">
              {done} of {franchise.training.length} modules complete
            </p>
            {scheduleButton}
          </div>

          <ul className="space-y-3">
            {franchise.training.map((record) => (
              <TrainingCard key={record.id} record={record} isAdmin={isAdmin} />
            ))}
          </ul>
        </>
      )}

      {scheduleOpen && (
        <ScheduleDialog
          franchiseId={franchise.id}
          scheduled={franchise.training.map((record) => record.module)}
          onClose={() => setScheduleOpen(false)}
        />
      )}
    </div>
  );
}

function TrainingCard({
  record,
  isAdmin,
}: {
  record: FranchiseDetail["training"][number];
  isAdmin: boolean;
}) {
  const [advanceOpen, setAdvanceOpen] = useState(false);
  const [attendance, setAttendance] = useState("");
  const target = NEXT[record.status];

  return (
    <li className="rounded-xl border border-line bg-surface px-4 py-3.5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-[0.9rem] font-semibold text-ink">{record.module}</h3>
            <StatusBadge
              label={TRAINING_LABEL[record.status]}
              tone={TRAINING_TONE[record.status]}
            />
          </div>

          <p className="mt-1 text-[0.75rem] text-ink-soft">
            {record.scheduled_at
              ? formatDateTime(record.scheduled_at)
              : "Not scheduled"}
            {record.trainer && ` · ${record.trainer}`}
            {record.venue && ` · ${record.venue}`}
          </p>

          {record.attendance && (
            <p className="mt-1 text-[0.78rem] text-ink">
              <span className="font-medium">Attendance:</span> {record.attendance}
            </p>
          )}

          {record.notes && (
            <p className="mt-1.5 whitespace-pre-wrap text-[0.8rem] leading-relaxed text-ink-soft">
              {record.notes}
            </p>
          )}

          {record.completed_at && (
            <p className="mt-1 text-[0.72rem] text-ink-soft">
              Completed {formatDateTime(record.completed_at)}
            </p>
          )}
        </div>

        {isAdmin && target && (
          <Button size="sm" variant="outline" onClick={() => setAdvanceOpen(true)}>
            Mark {TRAINING_LABEL[target].toLowerCase()}
          </Button>
        )}
      </div>

      {target && (
        <ConfirmDialog
          open={advanceOpen}
          onOpenChange={(open) => {
            setAdvanceOpen(open);
            if (!open) setAttendance("");
          }}
          title={`Mark "${record.module}" as ${TRAINING_LABEL[target].toLowerCase()}?`}
          confirmLabel={`Mark ${TRAINING_LABEL[target].toLowerCase()}`}
          successMessage="Training updated."
          onConfirm={() =>
            setTrainingStatus(
              record.id,
              target,
              attendance,
              target === "TRAINING_COMPLETED",
            )
          }
        >
          <div className="space-y-3">
            {target === "TRAINING_COMPLETED" && (
              <p className="text-[0.8rem] leading-relaxed text-ink-soft">
                When every module is complete the franchise moves on to setup,
                and a completion email goes out.
              </p>
            )}
            <Field
              label="Attendance"
              htmlFor={`att-${record.id}`}
              hint="Who actually attended. Optional."
            >
              <Input
                id={`att-${record.id}`}
                value={attendance}
                onChange={(event) => setAttendance(event.target.value)}
                placeholder="e.g. Owner and two staff"
              />
            </Field>
          </div>
        </ConfirmDialog>
      )}
    </li>
  );
}

function ScheduleDialog({
  franchiseId,
  scheduled,
  onClose,
}: {
  franchiseId: string;
  scheduled: string[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [pending, setPending] = useState<"email" | "silent" | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formEl, setFormEl] = useState<HTMLFormElement | null>(null);

  const run = async (sendEmail: boolean) => {
    if (!formEl) return;
    setPending(sendEmail ? "email" : "silent");
    setErrors({});
    try {
      const formData = new FormData(formEl);
      // datetime-local is wall-clock; convert here so the server gets an instant.
      formData.set(
        "scheduledAt",
        localInputToIso(String(formData.get("scheduledAt") ?? "")),
      );

      const result = await scheduleTraining(franchiseId, formData, sendEmail);
      if (!result.ok) {
        setErrors(result.fieldErrors ?? {});
        toast.error(result.message);
        return;
      }
      toast.success("Training scheduled.");
      router.refresh();
      onClose();
    } finally {
      setPending(null);
    }
  };

  const busy = pending !== null;
  const remaining = TRAINING_MODULES.filter(
    (module) => !scheduled.includes(module),
  );

  return (
    <Dialog open onOpenChange={(open) => !open && !busy && onClose()}>
      <DialogContent className="max-w-lg">
        <form ref={setFormEl} onSubmit={(event) => event.preventDefault()}>
          <DialogHeader>
            <DialogTitle>Schedule a training module</DialogTitle>
            <DialogDescription>
              One record per module. All of them have to be completed before
              setup begins.
            </DialogDescription>
          </DialogHeader>

          <DialogBody className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Module" htmlFor="tr-module" required error={errors.module}>
                <Select id="tr-module" name="module" defaultValue={remaining[0] ?? ""}>
                  {remaining.length === 0 && (
                    <option value="">Every module is already scheduled</option>
                  )}
                  {remaining.map((module) => (
                    <option key={module} value={module}>
                      {module}
                    </option>
                  ))}
                </Select>
              </Field>

              <Field
                label="Date and time"
                htmlFor="tr-when"
                required
                error={errors.scheduledAt}
              >
                <Input id="tr-when" name="scheduledAt" type="datetime-local" />
              </Field>

              <Field label="Trainer" htmlFor="tr-trainer">
                <Input id="tr-trainer" name="trainer" />
              </Field>

              <Field label="Meeting link or venue" htmlFor="tr-venue">
                <Input id="tr-venue" name="venue" placeholder="https:// or an address" />
              </Field>
            </div>

            <Field label="Notes" htmlFor="tr-notes">
              <Textarea id="tr-notes" name="notes" rows={2} />
            </Field>
          </DialogBody>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={busy}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="secondary"
              loading={pending === "silent"}
              disabled={busy || remaining.length === 0}
              onClick={() => void run(false)}
            >
              Schedule without email
            </Button>
            <Button
              type="button"
              loading={pending === "email"}
              disabled={busy || remaining.length === 0}
              onClick={() => void run(true)}
            >
              Schedule and send email
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
