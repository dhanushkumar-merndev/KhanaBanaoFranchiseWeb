import { Mail } from "lucide-react";
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
    <ul className="space-y-3">
      {emails.map((email) => (
        <li
          key={email.id}
          className="rounded-xl border border-line bg-surface px-4 py-3.5"
        >
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-[0.87rem] font-semibold text-ink">
                  {email.subject || "(no subject)"}
                </h3>
                <StatusBadge
                  label={STATUS_LABEL[email.status] ?? email.status}
                  tone={STATUS_TONE[email.status] ?? "neutral"}
                />
              </div>
              <p className="mt-0.5 text-[0.72rem] text-ink-soft">
                To {email.to_email} ·{" "}
                <span className="font-mono">{email.template_key}</span>
                {email.triggeredByName && ` · by ${email.triggeredByName}`}
              </p>
            </div>

            <time
              dateTime={email.created_at}
              className="shrink-0 text-[0.7rem] text-ink-soft"
            >
              {formatDateTime(email.created_at)}
            </time>
          </div>

          {email.body_preview && (
            <p className="mt-2 line-clamp-3 whitespace-pre-wrap text-[0.8rem] leading-relaxed text-ink-soft">
              {email.body_preview}
            </p>
          )}

          {email.error_message && (
            <p className="mt-2 rounded-lg border border-danger/25 bg-danger/5 px-3 py-2 text-[0.78rem] leading-relaxed text-ink">
              <span className="font-semibold text-danger">
                {email.status === "SKIPPED" ? "Not sent:" : "Failed:"}
              </span>{" "}
              {email.error_message}
            </p>
          )}
        </li>
      ))}
    </ul>
  );
}
