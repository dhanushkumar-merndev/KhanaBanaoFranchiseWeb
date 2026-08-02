import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Leaf } from "@/components/decor/leaf";
import { SectionHeading } from "@/components/landing/section-heading";
import { Reveal } from "@/components/motion/reveal";
import type { LegalDoc } from "@/lib/legal";

/**
 * Renders /privacy and /terms from the structured copy in lib/legal.ts, so the
 * two pages share one set of typography rules and cannot drift apart.
 */
export function LegalPage({ doc }: { doc: LegalDoc }) {
  return (
    <main id="main" className="relative flex-1 overflow-hidden pb-24 pt-12 md:pt-16">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-96 bg-[radial-gradient(70%_60%_at_50%_0%,rgba(232,201,138,0.28),transparent_70%)]"
      />
      <Leaf src="/decor/leaf-sprig.svg" className="-left-8 top-24 w-16 md:left-[2%] md:w-28" speed={0.08} rotate={-10} sway opacity={0.6} desktopOnly />
      <Leaf src="/decor/leaf-mint.svg" className="right-[3%] top-40 w-10 md:w-16" speed={-0.08} rotate={14} sway swayDelay={0.9} opacity={0.6} desktopOnly />

      <div className="shell relative max-w-3xl">
        <SectionHeading as="h2">{doc.title}</SectionHeading>

        <Reveal delay={80}>
          <p className="mx-auto mt-6 max-w-xl text-center text-[0.9rem] leading-relaxed text-ink-soft">
            {doc.intro}
          </p>
          <p className="mt-4 text-center text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-ink-soft/70">
            Last updated {doc.updated}
          </p>
        </Reveal>

        <div className="mt-12 space-y-9">
          {doc.sections.map((section, index) => (
            <Reveal as="section" key={section.heading} delay={Math.min(index, 4) * 60}>
              <h3 className="font-display text-lg font-bold text-ink sm:text-xl">
                {section.heading}
              </h3>
              <div className="mt-3 space-y-3.5">
                {section.blocks.map((block, blockIndex) =>
                  block.type === "p" ? (
                    <p
                      key={blockIndex}
                      className="text-[0.88rem] leading-relaxed text-ink-soft"
                    >
                      {block.text}
                    </p>
                  ) : (
                    <ul key={blockIndex} className="space-y-2.5">
                      {block.items.map((item) => (
                        <li
                          key={item}
                          className="flex gap-3 text-[0.88rem] leading-relaxed text-ink-soft"
                        >
                          <span
                            aria-hidden="true"
                            className="mt-2 size-1.5 shrink-0 rotate-45 bg-brand-gold"
                          />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  ),
                )}
              </div>
            </Reveal>
          ))}
        </div>

        <Reveal delay={120}>
          <div className="mt-14 border-t border-line pt-8 text-center">
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-full bg-brand-crimson px-6 py-3 text-[0.78rem] font-semibold text-white shadow-[0_10px_24px_-12px_rgba(193,39,45,0.9)] transition hover:-translate-y-0.5 hover:bg-brand-maroon"
            >
              <ArrowLeft className="size-4" strokeWidth={2.2} />
              Back to the website
            </Link>
          </div>
        </Reveal>
      </div>
    </main>
  );
}
