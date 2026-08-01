"use client";

import * as Accordion from "@radix-ui/react-accordion";
import { Plus } from "lucide-react";
import { Leaf } from "@/components/decor/leaf";
import { SectionHeading } from "@/components/landing/section-heading";
import { Reveal } from "@/components/motion/reveal";
import { faqs, site } from "@/lib/site";

export function Faq() {
  return (
    <section id="faq" className="relative overflow-hidden py-20 md:py-24">
      <Leaf src="/decor/leaf-single.svg" className="right-[4%] top-14 w-8 md:w-12" speed={0.13} rotate={24} sway opacity={0.8} desktopOnly />
      <Leaf src="/decor/leaf-mint.svg" className="bottom-10 left-[3%] w-10 md:w-16" speed={-0.1} rotate={-12} sway swayDelay={0.6} desktopOnly />

      <div className="shell relative max-w-3xl">
        <SectionHeading>Frequently Asked Questions</SectionHeading>

        <Reveal delay={100} className="mt-12">
          <Accordion.Root
            type="single"
            collapsible
            defaultValue="faq-0"
            className="space-y-3"
          >
            {faqs.map((faq, index) => (
              <Accordion.Item
                key={faq.q}
                value={`faq-${index}`}
                className="overflow-hidden rounded-2xl border border-line/80 bg-surface shadow-[0_14px_36px_-30px_rgba(110,40,20,0.5)] transition data-[state=open]:border-brand-red/30"
              >
                <Accordion.Header>
                  <Accordion.Trigger className="group flex w-full items-center justify-between gap-4 px-5 py-4 text-left sm:px-6">
                    <span className="font-display text-[0.92rem] font-bold text-ink sm:text-base">
                      {faq.q}
                    </span>
                    <span className="grid size-7 shrink-0 place-items-center rounded-full bg-surface-muted text-brand-crimson transition duration-300 group-data-[state=open]:rotate-45 group-data-[state=open]:bg-brand-crimson group-data-[state=open]:text-white">
                      <Plus className="size-4" strokeWidth={2.4} aria-hidden="true" />
                    </span>
                  </Accordion.Trigger>
                </Accordion.Header>
                <Accordion.Content className="overflow-hidden data-[state=closed]:animate-[accordion-up_220ms_ease-out] data-[state=open]:animate-[accordion-down_220ms_ease-out]">
                  <p className="px-5 pb-5 text-[0.82rem] leading-relaxed text-ink-soft sm:px-6">
                    {faq.a}
                  </p>
                </Accordion.Content>
              </Accordion.Item>
            ))}
          </Accordion.Root>
        </Reveal>

        <Reveal delay={160}>
          <p className="mt-8 text-center text-[0.8rem] text-ink-soft">
            Still have a question?{" "}
            <a
              href={site.phoneHref}
              className="font-semibold text-brand-crimson underline underline-offset-4 hover:text-brand-maroon"
            >
              Call {site.phone}
            </a>{" "}
            or{" "}
            <a
              href="#enquiry"
              className="font-semibold text-brand-crimson underline underline-offset-4 hover:text-brand-maroon"
            >
              send an enquiry
            </a>
            .
          </p>
        </Reveal>
      </div>
    </section>
  );
}
