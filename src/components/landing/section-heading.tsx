import { Reveal } from "@/components/motion/reveal";
import { cn } from "@/lib/utils";

/**
 * Serif, letter-spaced, uppercase heading with the small red-diamond rule
 * underneath — the recurring section marker across the page.
 */
export function SectionHeading({
  children,
  className,
  tone = "dark",
  as: Tag = "h2",
}: {
  children: React.ReactNode;
  className?: string;
  tone?: "dark" | "light";
  as?: "h2" | "h3";
}) {
  return (
    <Reveal className={cn("text-center", className)}>
      <Tag
        className={cn(
          "font-display text-2xl font-bold uppercase tracking-[0.14em] sm:text-3xl md:text-[2.1rem]",
          tone === "dark" ? "text-ink" : "text-white",
        )}
      >
        {children}
      </Tag>
      <span className="mt-4 flex items-center justify-center gap-2" aria-hidden="true">
        <span
          className={cn(
            "h-px w-12 sm:w-16",
            tone === "dark"
              ? "bg-gradient-to-r from-transparent to-brand-red"
              : "bg-gradient-to-r from-transparent to-brand-gold-light",
          )}
        />
        <span
          className={cn(
            "size-2 rotate-45",
            tone === "dark" ? "bg-brand-red" : "bg-brand-gold-light",
          )}
        />
        <span
          className={cn(
            "h-px w-12 sm:w-16",
            tone === "dark"
              ? "bg-gradient-to-l from-transparent to-brand-red"
              : "bg-gradient-to-l from-transparent to-brand-gold-light",
          )}
        />
      </span>
    </Reveal>
  );
}
