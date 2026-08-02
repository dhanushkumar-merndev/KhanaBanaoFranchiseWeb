"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CalendarClock,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock3,
  ExternalLink,
  MessageSquareText,
  Phone,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";
import { completeFollowup } from "@/app/actions/leads";
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
import type { ContactChannel } from "@/lib/domain/enums";
import { LEAD_STATUS_LABELS } from "@/lib/domain/enums";
import {
  FOLLOWUP_STATUS_LABELS,
  followupStatusTone,
  leadStatusTone,
} from "@/lib/domain/status";
import { formatDateTime, formatPhone, formatTime } from "@/lib/format";
import type { FollowupQueueRow } from "@/lib/data/followups";
import { cn } from "@/lib/utils";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const CHANNEL_LABELS: Record<ContactChannel, string> = {
  PHONE: "Phone call",
  WHATSAPP: "WhatsApp",
  EMAIL: "Email",
  VIDEO_MEETING: "Video meeting",
  OFFICE_MEETING: "Office meeting",
  OTHER: "Other",
};

function istDateKey(value: string | Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(value));
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

function shiftMonth(month: string, delta: number) {
  const [year, monthNumber] = month.split("-").map(Number);
  const date = new Date(Date.UTC(year, monthNumber - 1 + delta, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function eventClass(row: FollowupQueueRow) {
  if (row.status === "COMPLETED") {
    return "border-ok/25 bg-ok/10 text-[#217a33] hover:bg-ok/15";
  }
  if (row.isOverdue || row.status === "OVERDUE") {
    return "border-danger/25 bg-danger/10 text-[#a8322c] hover:bg-danger/15";
  }
  return "border-brand-blue/25 bg-brand-blue/10 text-[#0f6fab] hover:bg-brand-blue/15";
}

export function FollowupCalendar({
  rows,
  month,
  todayKey,
  pagePath,
  leadBasePath,
}: {
  rows: FollowupQueueRow[];
  month: string;
  todayKey: string;
  pagePath: string;
  leadBasePath: string;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<FollowupQueueRow | null>(null);
  const [busy, setBusy] = useState(false);
  const [year, monthNumber] = month.split("-").map(Number);

  const days = useMemo(() => {
    const first = new Date(Date.UTC(year, monthNumber - 1, 1));
    const mondayOffset = (first.getUTCDay() + 6) % 7;
    const gridStart = new Date(Date.UTC(year, monthNumber - 1, 1 - mondayOffset));
    return Array.from({ length: 42 }, (_, index) => {
      const date = new Date(gridStart);
      date.setUTCDate(gridStart.getUTCDate() + index);
      const key = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
      return {
        key,
        day: date.getUTCDate(),
        inMonth: date.getUTCMonth() === monthNumber - 1,
      };
    });
  }, [monthNumber, year]);

  const rowsByDay = useMemo(() => {
    const grouped = new Map<string, FollowupQueueRow[]>();
    for (const row of rows) {
      const key = istDateKey(row.due_at);
      grouped.set(key, [...(grouped.get(key) ?? []), row]);
    }
    return grouped;
  }, [rows]);

  const monthLabel = new Intl.DateTimeFormat("en-IN", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, monthNumber - 1, 1)));

  const overdue = rows.filter((row) => row.isOverdue).length;
  const completed = rows.filter((row) => row.status === "COMPLETED").length;
  const pending = rows.filter((row) => row.status === "PENDING" && !row.isOverdue).length;

  const markDone = async () => {
    if (!selected) return;
    setBusy(true);
    try {
      const result = await completeFollowup(selected.id);
      if (result.ok) {
        toast.success("Follow-up completed.");
        setSelected(null);
        router.refresh();
      } else {
        toast.error(result.message);
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <section className="overflow-hidden rounded-2xl border border-line bg-surface shadow-[0_20px_50px_-40px_rgba(110,40,20,0.65)]">
        <div className="flex flex-col gap-4 border-b border-line bg-[linear-gradient(135deg,rgba(229,72,63,0.07),rgba(19,152,235,0.05))] px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div className="flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-xl bg-brand-crimson text-white shadow-sm">
              <CalendarClock className="size-5" />
            </div>
            <div>
              <p className="font-display text-lg font-bold text-ink">{monthLabel}</p>
              <p className="text-[0.72rem] text-ink-soft">{rows.length} scheduled follow-ups</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button asChild variant="outline" size="icon">
              <Link
                href={`${pagePath}?mode=calendar&month=${shiftMonth(month, -1)}`}
                scroll={false}
                aria-label="Previous month"
              >
                <ChevronLeft />
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href={`${pagePath}?mode=calendar`} scroll={false}>
                Today
              </Link>
            </Button>
            <Button asChild variant="outline" size="icon">
              <Link
                href={`${pagePath}?mode=calendar&month=${shiftMonth(month, 1)}`}
                scroll={false}
                aria-label="Next month"
              >
                <ChevronRight />
              </Link>
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-3 border-b border-line bg-surface-muted/35">
          <div className="px-4 py-3 text-center">
            <p className="text-lg font-bold text-brand-blue">{pending}</p>
            <p className="text-[0.66rem] font-semibold uppercase tracking-wider text-ink-soft">Pending</p>
          </div>
          <div className="border-x border-line px-4 py-3 text-center">
            <p className="text-lg font-bold text-danger">{overdue}</p>
            <p className="text-[0.66rem] font-semibold uppercase tracking-wider text-ink-soft">Overdue</p>
          </div>
          <div className="px-4 py-3 text-center">
            <p className="text-lg font-bold text-ok">{completed}</p>
            <p className="text-[0.66rem] font-semibold uppercase tracking-wider text-ink-soft">Completed</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <div className="min-w-[760px]">
            <div className="grid grid-cols-7 border-b border-line bg-surface-muted/60">
              {WEEKDAYS.map((day) => (
                <div
                  key={day}
                  className="px-2 py-2 text-center text-[0.65rem] font-bold uppercase tracking-wider text-ink-soft"
                >
                  {day}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7">
              {days.map((day, index) => {
                const events = rowsByDay.get(day.key) ?? [];
                return (
                  <div
                    key={day.key}
                    className={cn(
                      "min-h-28 border-b border-r border-line/75 p-1.5",
                      index % 7 === 6 && "border-r-0",
                      !day.inMonth && "bg-surface-muted/30",
                    )}
                  >
                    <div className="mb-1 flex items-center justify-between">
                      <span
                        className={cn(
                          "grid size-6 place-items-center rounded-full text-[0.68rem] font-semibold",
                          day.key === todayKey
                            ? "bg-brand-crimson text-white"
                            : day.inMonth
                              ? "text-ink"
                              : "text-ink-soft/45",
                        )}
                      >
                        {day.day}
                      </span>
                      {events.length > 0 && (
                        <span className="text-[0.6rem] font-semibold text-ink-soft">
                          {events.length}
                        </span>
                      )}
                    </div>

                    <div className="space-y-1">
                      {events.slice(0, 3).map((row) => (
                        <button
                          key={row.id}
                          type="button"
                          onClick={() => setSelected(row)}
                          className={cn(
                            "block w-full rounded-md border px-1.5 py-1 text-left transition",
                            eventClass(row),
                          )}
                        >
                          <span className="block truncate text-[0.62rem] font-bold">
                            {formatTime(row.due_at)}
                          </span>
                          <span className="block truncate text-[0.64rem] font-medium">
                            {row.leadName}
                          </span>
                        </button>
                      ))}
                      {events.length > 3 && (
                        <button
                          type="button"
                          onClick={() => setSelected(events[3])}
                          className="w-full px-1 text-left text-[0.62rem] font-semibold text-brand-crimson hover:underline"
                        >
                          +{events.length - 3} more
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {rows.length === 0 && (
          <div className="border-t border-line px-5 py-10 text-center">
            <CalendarClock className="mx-auto size-8 text-ink-soft/40" />
            <p className="mt-3 font-semibold text-ink">No follow-ups this month</p>
            <p className="mt-1 text-[0.78rem] text-ink-soft">
              Use the arrows to inspect another month.
            </p>
          </div>
        )}
      </section>

      <Dialog open={Boolean(selected)} onOpenChange={(open) => !open && setSelected(null)}>
        {selected && (
          <DialogContent className="max-w-lg">
            <DialogHeader className="bg-[linear-gradient(135deg,rgba(229,72,63,0.07),rgba(19,152,235,0.05))]">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <StatusBadge
                  label={
                    selected.isOverdue
                      ? "Overdue"
                      : FOLLOWUP_STATUS_LABELS[selected.status]
                  }
                  tone={selected.isOverdue ? "danger" : followupStatusTone(selected.status)}
                />
                <StatusBadge
                  label={LEAD_STATUS_LABELS[selected.leadStatus]}
                  tone={leadStatusTone(selected.leadStatus)}
                />
              </div>
              <DialogTitle>{selected.leadName}</DialogTitle>
              <DialogDescription>
                {selected.leadNumber} · {formatDateTime(selected.due_at)}
              </DialogDescription>
            </DialogHeader>

            <DialogBody className="space-y-5">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-line bg-surface-muted/45 p-3">
                  <div className="flex items-center gap-2 text-[0.68rem] font-semibold uppercase tracking-wider text-ink-soft">
                    <Clock3 className="size-3.5" /> Scheduled
                  </div>
                  <p className="mt-1.5 text-[0.82rem] font-medium text-ink">
                    {formatDateTime(selected.due_at)}
                  </p>
                </div>
                <div className="rounded-xl border border-line bg-surface-muted/45 p-3">
                  <div className="flex items-center gap-2 text-[0.68rem] font-semibold uppercase tracking-wider text-ink-soft">
                    <UserRound className="size-3.5" /> Owner
                  </div>
                  <p className="mt-1.5 text-[0.82rem] font-medium text-ink">
                    {selected.memberName ?? "Unassigned"}
                  </p>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <a
                  href={`tel:${selected.leadPhone}`}
                  className="flex items-center gap-3 rounded-xl border border-line p-3 transition hover:border-brand-red/30 hover:bg-brand-red/5"
                >
                  <span className="grid size-9 place-items-center rounded-lg bg-brand-red/10 text-brand-crimson">
                    <Phone className="size-4" />
                  </span>
                  <span>
                    <span className="block text-[0.68rem] text-ink-soft">Phone</span>
                    <span className="block text-[0.8rem] font-medium text-ink">
                      {formatPhone(selected.leadPhone)}
                    </span>
                  </span>
                </a>
                <div className="flex items-center gap-3 rounded-xl border border-line p-3">
                  <span className="grid size-9 place-items-center rounded-lg bg-brand-blue/10 text-brand-blue">
                    <MessageSquareText className="size-4" />
                  </span>
                  <span>
                    <span className="block text-[0.68rem] text-ink-soft">Channel</span>
                    <span className="block text-[0.8rem] font-medium text-ink">
                      {selected.channel ? CHANNEL_LABELS[selected.channel] : "Not specified"}
                    </span>
                  </span>
                </div>
              </div>

              <div>
                <p className="text-[0.68rem] font-semibold uppercase tracking-wider text-ink-soft">
                  Follow-up note
                </p>
                <p className="mt-2 whitespace-pre-wrap rounded-xl border border-line bg-surface-muted/40 p-3 text-[0.82rem] leading-relaxed text-ink">
                  {selected.note || "No note was added for this follow-up."}
                </p>
              </div>
            </DialogBody>

            <DialogFooter>
              <Button asChild variant="outline">
                <Link href={`${leadBasePath}/${selected.lead_id}?tab=followups`}>
                  View lead <ExternalLink />
                </Link>
              </Button>
              {selected.status === "PENDING" && (
                <Button onClick={() => void markDone()} loading={busy}>
                  <Check /> Mark complete
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </>
  );
}
