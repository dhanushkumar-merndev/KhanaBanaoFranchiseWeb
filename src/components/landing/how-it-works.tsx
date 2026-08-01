import { Icon } from "@/components/landing/icons";
import { SectionHeading } from "@/components/landing/section-heading";
import { Reveal } from "@/components/motion/reveal";
import { howItWorks } from "@/lib/site";
import { cn } from "@/lib/utils";

export function HowItWorks() {
  return (
    <section id="how-it-works" className="relative overflow-hidden py-20 md:py-24">
      <div className="shell relative">
        <SectionHeading>How It Works</SectionHeading>

        <ol className="relative mt-14 grid gap-8 sm:grid-cols-2 lg:grid-cols-6 lg:gap-4">
          {/* Desktop connector rail, sitting behind the step markers */}
          <span
            aria-hidden="true"
            className="absolute inset-x-[8.33%] top-9 hidden h-px bg-[repeating-linear-gradient(to_right,var(--color-brand-red)_0_6px,transparent_6px_14px)] opacity-45 lg:block"
          />

          {howItWorks.map((step, index) => {
            const gold = index % 2 === 0;
            return (
              <Reveal
                as="li"
                key={step.title}
                delay={index * 80}
                className="relative flex flex-col items-center gap-1 text-center"
              >
                <span
                  className={cn(
                    "relative z-10 grid size-[4.5rem] place-items-center rounded-full text-white shadow-[0_16px_30px_-16px_rgba(110,40,20,0.85)] ring-4 ring-canvas transition duration-300 hover:scale-105",
                    gold
                      ? "bg-gradient-to-br from-brand-gold-light to-brand-gold"
                      : "bg-gradient-to-br from-brand-red to-brand-crimson",
                  )}
                >
                  <Icon name={step.icon} className="size-8" strokeWidth={1.6} />
                </span>

                <p className="mt-3 text-sm font-semibold text-ink-soft">{index + 1}</p>
                <h3 className="font-display text-base font-bold text-ink">
                  {step.title}
                </h3>
                <p className="max-w-[14rem] text-[0.72rem] leading-snug text-ink-soft">
                  {step.body}
                </p>
              </Reveal>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
