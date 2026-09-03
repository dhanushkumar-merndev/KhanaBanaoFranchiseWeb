import { Download } from "lucide-react";

import { Leaf } from "@/components/decor/leaf";
import { Icon } from "@/components/landing/icons";
import { SectionHeading } from "@/components/landing/section-heading";
import { Reveal } from "@/components/motion/reveal";
import { eligibility, investment } from "@/lib/site";

export function EligibilityInvestment() {
  return (
    <section id="investment" className="relative overflow-hidden py-20 md:py-24">
      <Leaf src="/decor/leaf-basil.svg" className="left-[2%] top-12 w-10 md:w-16" speed={-0.11} rotate={-18} sway opacity={0.8} desktopOnly />
      <Leaf src="/decor/cashews.svg" className="bottom-8 right-[2%] w-14 md:w-24" speed={0.1} rotate={10} sway swayDelay={0.5} desktopOnly />

      <div className="shell relative">
        <SectionHeading>Who Can Apply &amp; What It Costs</SectionHeading>

        <div className="mt-14 grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:gap-10">
          {/* Eligibility */}
          <div>
            <Reveal>
              <h3 className="font-display text-lg font-bold uppercase tracking-[0.1em] text-ink">
                Eligibility
              </h3>
              <p className="mt-2 max-w-md text-[0.92rem] leading-relaxed text-ink-soft">
                We keep the bar practical. If these four things are true for you,
                you are a fit — prior catering experience is not required.
              </p>
            </Reveal>

            <ul className="mt-7 grid gap-4 sm:grid-cols-2">
              {eligibility.map((item, index) => (
                <Reveal as="li" key={item.title} delay={index * 80}>
                  <div className="flex h-full gap-3.5 rounded-2xl border border-line/70 bg-surface p-5 shadow-[0_16px_38px_-30px_rgba(110,40,20,0.5)]">
                    <span className="grid size-10 shrink-0 place-items-center rounded-full bg-surface-muted text-brand-crimson ring-1 ring-brand-red/15">
                      <Icon name={item.icon} className="size-5" />
                    </span>
                    <div>
                      <h4 className="font-display text-base font-bold text-ink">
                        {item.title}
                      </h4>
                      <p className="mt-1.5 text-[0.86rem] leading-relaxed text-ink-soft">
                        {item.body}
                      </p>
                    </div>
                  </div>
                </Reveal>
              ))}
            </ul>
          </div>

          {/* Investment overview */}
          <Reveal variant="right" delay={140}>
            <div className="h-full rounded-2xl border border-line bg-surface-muted p-6 shadow-[0_20px_46px_-34px_rgba(110,40,20,0.5)] sm:p-8">
              <div className="flex items-start justify-between gap-4">
                <h3 className="font-display text-lg font-bold uppercase tracking-[0.1em] text-ink">
                  Investment Overview
                </h3>
                {/* Full franchise brochure — served straight from /public. */}
                <a
                  href="/Khana-banao-Franchise-Master.pdf"
                  download="Khana-Banao-Franchise-Master.pdf"
                  aria-label="Download the franchise brochure (PDF)"
                  className="group relative grid size-10 shrink-0 place-items-center rounded-full bg-gradient-to-br from-brand-red to-brand-crimson text-white shadow-[0_10px_22px_-12px_rgba(193,39,45,0.95)] transition hover:-translate-y-0.5 hover:from-brand-crimson hover:to-brand-maroon"
                >
                  <Download className="size-[1.15rem]" />
                  {/* Desktop-only hover tooltip, right-anchored so it stays
                      inside the card instead of running off the viewport. */}
                  <span
                    aria-hidden
                    className="pointer-events-none absolute right-0 top-[calc(100%+0.6rem)] z-20 hidden whitespace-nowrap rounded-lg bg-ink px-3 py-1.5 text-[0.75rem] font-medium text-white opacity-0 shadow-[0_10px_24px_-14px_rgba(0,0,0,0.8)] transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100 md:block"
                  >
                    <span className="absolute -top-1 right-3.5 size-2 rotate-45 rounded-[2px] bg-ink" />
                    Download brochure
                  </span>
                </a>
              </div>
              <p className="mt-2 text-[0.92rem] leading-relaxed text-ink-soft">
                Choose a franchise tier that matches your event ambition. Setup,
                premises, licences and operating costs are discussed separately.
              </p>

              <dl className="mt-6 divide-y divide-line">
                {investment.map((row) => (
                  <div
                    key={row.label}
                    className="flex items-start justify-between gap-4 py-3.5"
                  >
                    <dt className="text-[0.92rem] font-medium text-ink">
                      {row.label}
                      <span className="mt-0.5 block text-[0.8rem] font-normal text-ink-soft">
                        {row.note}
                      </span>
                    </dt>
                    <dd className="kpi-number shrink-0 text-[0.95rem] text-brand-crimson">
                      {row.value}
                    </dd>
                  </div>
                ))}
              </dl>

              <p className="mt-5 rounded-xl bg-surface px-4 py-3 text-[0.84rem] leading-relaxed text-ink-soft ring-1 ring-line">
                Monthly royalty is 8%–10% of gross revenue for marketing and app
                lead allocation. Your applicable rate is confirmed in the agreement.
              </p>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
