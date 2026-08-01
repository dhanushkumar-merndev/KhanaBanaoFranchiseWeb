import { CircleAlert, Inbox, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      aria-hidden="true"
      className={cn("animate-pulse rounded-md bg-surface-muted", className)}
      {...props}
    />
  );
}

export function TableSkeleton({ rows = 8, cols = 6 }: { rows?: number; cols?: number }) {
  return (
    <div className="space-y-2 p-4" role="status" aria-label="Loading">
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex gap-3">
          {Array.from({ length: cols }).map((_, c) => (
            <Skeleton
              key={c}
              className="h-8 flex-1"
              style={{ opacity: 1 - r * 0.07 }}
            />
          ))}
        </div>
      ))}
      <span className="sr-only">Loading…</span>
    </div>
  );
}

export function EmptyState({
  title,
  body,
  action,
  icon: IconCmp = Inbox,
}: {
  title: string;
  body?: string;
  action?: React.ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      <span className="grid size-12 place-items-center rounded-full bg-surface-muted text-ink-soft">
        <IconCmp className="size-6" />
      </span>
      <h3 className="mt-4 font-display text-base font-bold text-ink">{title}</h3>
      {body && (
        <p className="mt-2 max-w-sm text-[0.8rem] leading-relaxed text-ink-soft">
          {body}
        </p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ErrorState({
  title = "Something went wrong",
  body,
  onRetry,
}: {
  title?: string;
  body?: string;
  onRetry?: () => void;
}) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center justify-center px-6 py-16 text-center"
    >
      <span className="grid size-12 place-items-center rounded-full bg-danger/10 text-danger">
        <CircleAlert className="size-6" />
      </span>
      <h3 className="mt-4 font-display text-base font-bold text-ink">{title}</h3>
      {body && (
        <p className="mt-2 max-w-sm text-[0.8rem] leading-relaxed text-ink-soft">
          {body}
        </p>
      )}
      {onRetry && (
        <Button variant="outline" size="sm" className="mt-5" onClick={onRetry}>
          <RotateCw />
          Try again
        </Button>
      )}
    </div>
  );
}
