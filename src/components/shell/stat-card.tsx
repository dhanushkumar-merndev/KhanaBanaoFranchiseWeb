import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatNumber } from "@/lib/utils";

export type StatTone = "neutral" | "info" | "warn" | "success" | "danger";

const TONE_RING: Record<StatTone, string> = {
  neutral: "bg-surface-muted text-ink-soft",
  info: "bg-brand-blue/10 text-[#0f6fab]",
  warn: "bg-warn/12 text-[#9a6410]",
  success: "bg-ok/12 text-[#217a33]",
  danger: "bg-danger/10 text-[#a8322c]",
};

/**
 * Summary tile. When `href` is given the whole card is a link to the list
 * filtered to exactly what the number counts, so the figure is always one
 * click from the rows behind it.
 */
export function StatCard({
  label,
  value,
  href,
  hint,
  tone = "neutral",
  icon: IconCmp,
}: {
  label: string;
  value: number;
  href?: string;
  hint?: string;
  tone?: StatTone;
  icon?: React.ComponentType<{ className?: string }>;
}) {
  const body = (
    <>
      <div className="flex items-start justify-between gap-2">
        <p className="text-[0.72rem] font-semibold uppercase tracking-wide text-ink-soft">
          {label}
        </p>
        {IconCmp && (
          <span
            aria-hidden="true"
            className={cn(
              "grid size-7 shrink-0 place-items-center rounded-lg",
              TONE_RING[tone],
            )}
          >
            <IconCmp className="size-3.5" />
          </span>
        )}
      </div>

      <p className="mt-2 font-display text-2xl font-bold tabular-nums text-ink">
        {formatNumber(value)}
      </p>

      {hint && <p className="mt-1 text-[0.7rem] text-ink-soft">{hint}</p>}

      {href && (
        <span className="mt-2 inline-flex items-center gap-1 text-[0.72rem] font-medium text-brand-crimson opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
          View
          <ArrowUpRight className="size-3" aria-hidden="true" />
        </span>
      )}
    </>
  );

  const shell =
    "group flex flex-col rounded-xl border border-line bg-surface px-4 py-3.5 shadow-[0_10px_30px_-24px_rgba(110,40,20,0.5)] transition";

  if (!href) return <div className={shell}>{body}</div>;

  return (
    <Link
      href={href}
      className={cn(
        shell,
        "hover:border-brand-red/40 hover:shadow-[0_14px_34px_-22px_rgba(193,39,45,0.55)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-red",
      )}
    >
      {body}
    </Link>
  );
}

/** Consistent wrapper for a chart, so every panel on the page lines up. */
export function ChartCard({
  title,
  description,
  children,
  className,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "rounded-xl border border-line bg-surface p-4 shadow-[0_10px_30px_-24px_rgba(110,40,20,0.5)]",
        className,
      )}
    >
      <h2 className="font-display text-[0.95rem] font-bold text-ink">{title}</h2>
      {description && (
        <p className="mt-0.5 text-[0.72rem] text-ink-soft">{description}</p>
      )}
      <div className="mt-3">{children}</div>
    </section>
  );
}
