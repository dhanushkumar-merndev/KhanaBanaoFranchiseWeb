import { Quote, Star, User } from "lucide-react";
import { Leaf } from "@/components/decor/leaf";
import { SectionHeading } from "@/components/landing/section-heading";
import { Reveal } from "@/components/motion/reveal";
import { testimonials } from "@/lib/site";

export function Testimonials() {
  return (
    <section className="relative overflow-hidden py-20 md:py-24">
      {/* Faint floral line-art framing the section */}
      <Leaf
        src="/decor/floral-corner.svg"
        className="-left-10 top-8 w-40 md:w-64"
        speed={0.07}
        opacity={0.55}
      />
      {/* Mirrored, so the two branches lean away from the cards rather than
          both leaning the same way. `flip` alone — adding flipY and rotate
          180 as well would compose back to the identity and render a plain
          copy of the left one. */}
      <Leaf
        src="/decor/floral-corner.svg"
        className="-right-10 top-8 w-40 md:w-64"
        speed={-0.07}
        opacity={0.55}
        flip
      />

      <div className="shell relative">
        <SectionHeading>What Our Partners Say</SectionHeading>

        <ul className="mt-14 grid gap-6 md:grid-cols-3">
          {testimonials.map((item, index) => (
            <Reveal as="li" key={item.name} delay={index * 110} className="relative">
              <figure className="relative flex h-full flex-col rounded-2xl border border-line/70 bg-surface px-6 py-7 text-center shadow-[0_20px_46px_-32px_rgba(110,40,20,0.5)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_28px_56px_-30px_rgba(193,39,45,0.4)]">
                <div
                  className="flex justify-center gap-1"
                  role="img"
                  aria-label="Rated 5 out of 5"
                >
                  {Array.from({ length: 5 }).map((_, star) => (
                    <Star
                      key={star}
                      className="size-4 fill-brand-gold text-brand-gold"
                      strokeWidth={0}
                      aria-hidden="true"
                    />
                  ))}
                </div>

                <blockquote className="mt-4 flex-1 text-[0.83rem] font-medium leading-relaxed text-ink">
                  {item.quote}
                </blockquote>

                <figcaption className="mt-6 flex items-center justify-center gap-3">
                  <span className="grid size-9 place-items-center rounded-full bg-surface-muted text-ink-soft ring-1 ring-line">
                    <User className="size-4" strokeWidth={1.8} aria-hidden="true" />
                  </span>
                  <span className="text-left">
                    <span className="block text-[0.8rem] font-semibold text-ink">
                      – {item.name}
                    </span>
                    <span className="block text-[0.7rem] text-ink-soft">
                      {item.city}
                    </span>
                  </span>
                </figcaption>

                {/* Connector medallion between cards, as in the reference layout */}
                {index < testimonials.length - 1 && (
                  <span
                    aria-hidden="true"
                    className="absolute -right-3 bottom-8 z-10 hidden size-6 place-items-center rounded-full bg-brand-crimson text-white shadow-md md:grid"
                  >
                    <Quote className="size-3 fill-current" strokeWidth={0} />
                  </span>
                )}
              </figure>
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  );
}
