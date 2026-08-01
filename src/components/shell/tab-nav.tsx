import Link from "next/link";
import { cn } from "@/lib/utils";

export type TabItem = {
  href: string;
  label: string;
  /** Rendered as a count chip beside the label. */
  badge?: number;
};

/**
 * Link-driven tabs. Real `<a>`s rather than local state, so a tab is
 * shareable, survives a refresh and works with the back button.
 */
export function TabNav({
  items,
  active,
  className,
  label = "Sections",
}: {
  items: TabItem[];
  /** `href` of the current tab. */
  active: string;
  className?: string;
  label?: string;
}) {
  return (
    <nav aria-label={label} className={cn("-mb-px overflow-x-auto", className)}>
      <ul className="flex min-w-max gap-1 border-b border-line">
        {items.map((item) => {
          const current = item.href === active;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={current ? "page" : undefined}
                scroll={false}
                className={cn(
                  "inline-flex items-center gap-2 border-b-2 px-3.5 py-2.5 text-[0.82rem] font-medium transition",
                  current
                    ? "border-brand-red text-brand-crimson"
                    : "border-transparent text-ink-soft hover:border-line hover:text-ink",
                )}
              >
                {item.label}
                {item.badge !== undefined && item.badge > 0 && (
                  <span
                    className={cn(
                      "rounded-full px-1.5 py-0.5 text-[0.65rem] font-bold leading-none",
                      current
                        ? "bg-brand-red/10 text-brand-crimson"
                        : "bg-surface-muted text-ink-soft",
                    )}
                  >
                    {item.badge}
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
