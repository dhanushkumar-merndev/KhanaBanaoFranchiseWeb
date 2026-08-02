import { Leaf } from "@/components/decor/leaf";
import { Icon } from "@/components/landing/icons";
import { Reveal } from "@/components/motion/reveal";
import { feeHighlights, franchiseFee } from "@/lib/site";

export function FeeBanner() {
  return (
    <section id="fee" className="relative py-6 md:py-10">
      <div className="shell">
        <Reveal>
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand-maroon via-brand-maroon to-brand-maroon-dark px-6 py-9 shadow-[0_28px_64px_-32px_rgba(109,13,18,0.85)] sm:px-10">
            {/* Subtle woven texture */}
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 opacity-[0.07] [background-image:repeating-linear-gradient(45deg,#fff_0_1px,transparent_1px_9px)]"
            />
            <Leaf src="/decor/leaf-basil.svg" className="-right-1 bottom-0 w-14 md:w-24" speed={0.1} rotate={12} sway opacity={0.9} />
            <Leaf src="/decor/leaf-single.svg" className="-left-2 top-2 w-8 md:w-12" speed={-0.12} rotate={-28} sway swayDelay={0.6} desktopOnly />

            <div className="relative grid gap-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,2.4fr)] lg:items-center lg:gap-10">
              {/* Amount */}
              <div className="relative text-center">
                <span
                  aria-hidden="true"
                  className="absolute left-0 top-1/2 hidden h-24 w-px -translate-y-1/2 bg-gradient-to-b from-transparent via-brand-gold-light/40 to-transparent sm:block lg:hidden"
                />
                <p className="font-display text-[0.88rem] font-bold uppercase leading-snug tracking-[0.16em] text-brand-gold-light">
                  One-Time
                  <br />
                  Franchise Fee
                </p>
                <p className="kpi-number mt-2 text-5xl text-white sm:text-[3.4rem]">
                  <span className="align-top text-3xl sm:text-4xl">₹</span>
                  {franchiseFee.display}
                </p>
                <p className="mt-3 inline-flex rounded-full bg-gradient-to-r from-brand-gold-light to-brand-gold px-6 py-1.5 text-[0.8rem] font-bold uppercase tracking-[0.2em] text-brand-maroon-dark shadow-sm">
                  Only
                </p>
              </div>

              {/* Highlights */}
              <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4 lg:gap-0">
                {feeHighlights.map((item, index) => (
                  <li
                    key={item.body}
                    className={[
                      "flex flex-col items-center gap-3 px-2 text-center",
                      index > 0 ? "lg:border-l lg:border-brand-gold-light/25" : "",
                    ].join(" ")}
                  >
                    <Icon
                      name={item.icon}
                      className="size-9 text-brand-gold-light"
                      strokeWidth={1.4}
                    />
                    <p className="max-w-[15rem] text-[0.86rem] leading-snug text-white/90">
                      {item.body}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
