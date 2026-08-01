import { Leaf } from "@/components/decor/leaf";
import { Icon } from "@/components/landing/icons";
import { SectionHeading } from "@/components/landing/section-heading";
import { Reveal } from "@/components/motion/reveal";
import { whyPartner } from "@/lib/site";

export function WhyPartner() {
  return (
    <section id="why-partner" className="relative overflow-hidden py-20 md:py-28">
      <Leaf src="/decor/cashews.svg" className="bottom-6 left-[-1%] w-16 md:w-28" speed={0.12} rotate={-6} sway opacity={0.9} />
      <Leaf src="/decor/garlic.svg" className="bottom-4 left-[38%] w-9 md:w-14" speed={-0.09} rotate={8} sway swayDelay={0.7} desktopOnly />
      <Leaf src="/decor/chilli.svg" className="bottom-16 left-[26%] w-6 md:w-9" speed={0.15} rotate={-24} sway swayDelay={1.1} desktopOnly />
      <Leaf src="/decor/leaf-basil.svg" className="bottom-8 right-[4%] w-11 md:w-20" speed={0.13} rotate={16} flip sway swayDelay={0.4} opacity={0.9} />
      <Leaf src="/decor/leaf-mint.svg" className="right-[32%] top-8 w-8 md:w-12" speed={-0.14} rotate={-10} sway swayDelay={0.9} desktopOnly />

      <div className="shell relative">
        <SectionHeading>Why Partner With Us?</SectionHeading>

        <ul className="mt-16 grid gap-x-5 gap-y-16 sm:grid-cols-2 lg:grid-cols-4">
          {whyPartner.map((card, index) => (
            <Reveal as="li" key={card.title} delay={index * 90} className="relative">
              <article className="relative flex h-full flex-col rounded-2xl border border-line/70 bg-surface px-5 pb-7 pt-12 text-center shadow-[0_20px_46px_-32px_rgba(110,40,20,0.5)] transition duration-300 hover:-translate-y-1 hover:border-brand-red/30 hover:shadow-[0_28px_56px_-30px_rgba(193,39,45,0.45)]">
                <span className="absolute -top-8 left-1/2 grid size-16 -translate-x-1/2 place-items-center rounded-full bg-gradient-to-br from-brand-red to-brand-crimson text-white shadow-[0_14px_28px_-12px_rgba(193,39,45,0.9)] ring-4 ring-canvas">
                  <Icon name={card.icon} className="size-7" strokeWidth={1.7} />
                </span>

                <h3 className="whitespace-pre-line font-display text-[0.94rem] font-bold uppercase leading-snug tracking-[0.05em] text-ink">
                  {card.title}
                </h3>

                {card.points.length > 0 ? (
                  <ul className="mt-5 space-y-2.5 text-left">
                    {card.points.map((point) => (
                      <li key={point} className="flex gap-2.5 text-[0.8rem] leading-snug text-ink-soft">
                        <span
                          aria-hidden="true"
                          className="mt-[0.42rem] size-1.5 shrink-0 rounded-full bg-brand-red"
                        />
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-5 text-left text-[0.8rem] leading-relaxed text-ink-soft">
                    {card.body}
                  </p>
                )}

                {/* The documentation card gets a small stacked-binders motif. */}
                {card.icon === "docs" && (
                  <span
                    aria-hidden="true"
                    className="mt-auto flex flex-col items-end gap-1 pt-6"
                  >
                    {[0, 1, 2].map((row) => (
                      <span
                        key={row}
                        className="flex h-4 w-24 items-center gap-1 rounded-sm bg-gradient-to-r from-surface-muted to-brand-beige/50 px-1 ring-1 ring-line"
                      >
                        <span className="h-2 w-1.5 rounded-[1px] bg-brand-crimson/70" />
                        <span className="h-2 w-1.5 rounded-[1px] bg-brand-gold/70" />
                        <span className="h-px flex-1 bg-ink-soft/25" />
                      </span>
                    ))}
                  </span>
                )}
              </article>
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  );
}
