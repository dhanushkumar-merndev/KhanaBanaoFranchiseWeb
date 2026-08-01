import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import type { StatusTone } from "@/lib/domain/status";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[0.7rem] font-semibold leading-none ring-1 ring-inset",
  {
    variants: {
      tone: {
        neutral: "bg-surface-muted text-ink-soft ring-line",
        info: "bg-brand-blue/10 text-[#0f6fab] ring-brand-blue/25",
        progress: "bg-[#8b5cf6]/10 text-[#6d3fc4] ring-[#8b5cf6]/25",
        warn: "bg-warn/12 text-[#9a6410] ring-warn/30",
        success: "bg-ok/12 text-[#217a33] ring-ok/30",
        danger: "bg-danger/10 text-[#a8322c] ring-danger/25",
      },
    },
    defaultVariants: { tone: "neutral" },
  },
);

export type BadgeProps = React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants>;

export function Badge({ className, tone, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />;
}

/**
 * Status pill. The dot is decorative — the label always carries the meaning,
 * so status is never communicated by colour alone (spec §29).
 */
export function StatusBadge({
  label,
  tone,
  className,
}: {
  label: string;
  tone: StatusTone;
  className?: string;
}) {
  return (
    <Badge tone={tone} className={className}>
      <span
        aria-hidden="true"
        className={cn(
          "size-1.5 rounded-full",
          tone === "neutral" && "bg-ink-soft",
          tone === "info" && "bg-brand-blue",
          tone === "progress" && "bg-[#8b5cf6]",
          tone === "warn" && "bg-warn",
          tone === "success" && "bg-ok",
          tone === "danger" && "bg-danger",
        )}
      />
      {label}
    </Badge>
  );
}
