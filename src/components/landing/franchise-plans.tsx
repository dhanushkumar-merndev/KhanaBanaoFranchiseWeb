import { SectionHeading } from "@/components/landing/section-heading";
import { Reveal } from "@/components/motion/reveal";
import { franchiseTiers } from "@/lib/site";

export function FranchisePlans() {
  return (
    <section id="plans" className="relative overflow-hidden bg-surface-muted py-20 md:py-24">
      <div className="shell">
        <SectionHeading>Choose Your Franchise Tier</SectionHeading>
        <p className="mx-auto mt-4 max-w-3xl text-center text-[0.95rem] leading-relaxed text-ink-soft">
          Four catering models, matched to the event scale you want to serve.
          ROI targets use a standard 25% net-profit planning margin after
          ingredients, direct labour, logistics, packaging and central royalties.
        </p>

        <div className="mt-12 grid gap-5 md:grid-cols-2">
          {franchiseTiers.map((plan, index) => (
            <Reveal as="article" key={plan.tier} delay={index * 80}>
              <div className="h-full rounded-2xl border border-line bg-surface p-6 shadow-[0_18px_44px_-34px_rgba(110,40,20,0.6)] sm:p-7">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[0.76rem] font-bold uppercase tracking-[0.16em] text-brand-crimson">
                      {plan.tier}
                    </p>
                    <h3 className="mt-1 font-display text-xl font-bold text-ink">
                      {plan.name}
                    </h3>
                  </div>
                  <span className="rounded-full bg-brand-maroon px-3 py-1.5 text-[0.72rem] font-bold uppercase tracking-wide text-brand-gold-light">
                    {plan.roi}
                  </span>
                </div>

                <p className="mt-4 min-h-12 text-[0.9rem] leading-relaxed text-ink-soft">
                  {plan.scope}
                </p>

                <dl className="mt-5 grid grid-cols-2 gap-x-5 gap-y-4 border-t border-line pt-5">
                  <div>
                    <dt className="text-[0.76rem] font-medium text-ink-soft">Investment</dt>
                    <dd className="kpi-number mt-0.5 text-lg text-brand-crimson">{plan.investment}</dd>
                  </div>
                  <div>
                    <dt className="text-[0.76rem] font-medium text-ink-soft">Average order value</dt>
                    <dd className="kpi-number mt-0.5 text-lg text-ink">{plan.aov}</dd>
                  </div>
                  <div>
                    <dt className="text-[0.76rem] font-medium text-ink-soft">Net profit per order</dt>
                    <dd className="kpi-number mt-0.5 text-lg text-ink">{plan.profit}</dd>
                  </div>
                  <div>
                    <dt className="text-[0.76rem] font-medium text-ink-soft">Orders to recover capital</dt>
                    <dd className="mt-0.5 text-lg font-bold text-ink">{plan.orders}</dd>
                  </div>
                </dl>

                <p className="mt-5 rounded-xl bg-surface-muted px-4 py-3 text-[0.84rem] leading-relaxed text-ink-soft">
                  <strong className="font-semibold text-ink">Target: {plan.monthlyTarget}.</strong>{" "}
                  {plan.cadence}.
                </p>
              </div>
            </Reveal>
          ))}
        </div>

        <p className="mx-auto mt-7 max-w-4xl text-center text-[0.78rem] leading-relaxed text-ink-soft">
          ROI timelines are planning targets, not a guarantee of income or payback.
          Actual results depend on bookings, pricing, local demand, costs and execution.
        </p>
      </div>
    </section>
  );
}
