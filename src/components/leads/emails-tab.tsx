"use client";

import * as Accordion from "@radix-ui/react-accordion";
import { ChevronDown, Mail } from "lucide-react";
import { StatusBadge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/feedback";
import { formatDateTime } from "@/lib/format";
import type { EmailLogRow } from "@/lib/data/pipeline";
import type { StatusTone } from "@/lib/domain/status";

const STATUS_TONE: Record<string, StatusTone> = {
  SENT: "success",
  FAILED: "danger",
  SKIPPED: "neutral",
};

const STATUS_LABEL: Record<string, string> = {
  SENT: "Sent",
  FAILED: "Failed",
  SKIPPED: "Not sent",
};

/** Every send attempt against this lead, newest first (spec §21). */
export function EmailsTab({ emails }: { emails: EmailLogRow[] }) {
  if (emails.length === 0) {
    return (
      <EmptyState
        title="No emails yet"
        body="Every message this system sends about this lead is logged here — including the ones that fail."
        icon={Mail}
      />
    );
  }

  return (
    <Accordion.Root
      type="single"
      collapsible
      defaultValue={emails[0]?.id}
      className="space-y-2.5"
    >
      {emails.map((email) => (
        <Accordion.Item
          key={email.id}
          value={email.id}
          className="overflow-hidden rounded-xl border border-line bg-surface transition data-[state=open]:border-brand-red/25 data-[state=open]:shadow-[0_12px_30px_-28px_rgba(110,40,20,0.6)]"
        >
          <Accordion.Header>
            <Accordion.Trigger className="group flex w-full items-start justify-between gap-3 px-4 py-3.5 text-left transition hover:bg-surface-muted/45">
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="font-display text-[0.87rem] font-semibold text-ink">
                    {email.subject || "(no subject)"}
                  </span>
                  <StatusBadge
                    label={STATUS_LABEL[email.status] ?? email.status}
                    tone={STATUS_TONE[email.status] ?? "neutral"}
                  />
                </span>
                <span className="mt-0.5 block truncate text-[0.72rem] text-ink-soft">
                  To {email.to_email} ·{" "}
                  <span className="font-mono">{email.template_key}</span>
                  {email.triggeredByName && ` · by ${email.triggeredByName}`}
                </span>
              </span>

              <span className="flex shrink-0 items-center gap-3">
                <time
                  dateTime={email.created_at}
                  className="hidden text-[0.7rem] text-ink-soft sm:block"
                >
                  {formatDateTime(email.created_at)}
                </time>
                <span className="grid size-7 place-items-center rounded-full bg-surface-muted text-ink-soft transition group-hover:text-brand-crimson">
                  <ChevronDown
                    className="size-4 transition-transform duration-200 group-data-[state=open]:rotate-180"
                    aria-hidden="true"
                  />
                </span>
              </span>
            </Accordion.Trigger>
          </Accordion.Header>

          <Accordion.Content className="overflow-hidden border-t border-line/70 data-[state=closed]:animate-[accordion-up_200ms_ease-out] data-[state=open]:animate-[accordion-down_200ms_ease-out]">
            <div className="px-4 py-3.5">
              <time
                dateTime={email.created_at}
                className="mb-2 block text-[0.7rem] text-ink-soft sm:hidden"
              >
                {formatDateTime(email.created_at)}
              </time>

              {email.body_preview ? (
                <p className="whitespace-pre-wrap text-[0.8rem] leading-relaxed text-ink-soft">
                  {email.body_preview}
                </p>
              ) : (
                <p className="text-[0.78rem] italic text-ink-soft">
                  No message preview was recorded.
                </p>
              )}

              {email.error_message && (
                <p className="mt-3 rounded-lg border border-danger/25 bg-danger/5 px-3 py-2 text-[0.78rem] leading-relaxed text-ink">
                  <span className="font-semibold text-danger">
                    {email.status === "SKIPPED" ? "Not sent:" : "Failed:"}
                  </span>{" "}
                  {email.error_message}
                </p>
              )}
            </div>
          </Accordion.Content>
        </Accordion.Item>
      ))}
    </Accordion.Root>
  );
}
