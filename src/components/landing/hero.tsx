import { ArrowRight, Crown, Play } from "lucide-react";
import { Leaf } from "@/components/decor/leaf";
import { HeroHeading } from "@/components/landing/hero-heading";
import { Reveal } from "@/components/motion/reveal";
import { Icon } from "@/components/landing/icons";
import { heroBadges, images, site } from "@/lib/site";

export function Hero() {
  return (
    <section id="home" className="relative overflow-hidden pt-8 pb-28 md:pt-12 md:pb-40">
      {/* Warm ambient wash */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(120%_90%_at_78%_18%,rgba(232,201,138,0.28),transparent_58%),radial-gradient(80%_70%_at_8%_84%,rgba(229,72,63,0.08),transparent_60%)]"
      />

      {/* Decorative leaves — parallax on scroll.
          Kept clear of the headline column on narrow screens, and off the
          right entirely: the image frame carries its own sprig, and anything
          floating beside it competes with the silhouette. */}
      <Leaf src="/decor/leaf-sprig.svg" className="-left-8 top-[26rem] w-14 md:left-[-4%] md:top-28 md:w-28" speed={0.14} rotate={-8} sway opacity={0.8} />
      <Leaf src="/decor/leaf-mint.svg" className="bottom-28 left-[6%] w-10 md:w-14" speed={-0.1} rotate={12} sway swayDelay={1.2} desktopOnly />

      <div className="shell grid items-center gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.06fr)] lg:gap-8">
        {/* ---------------- Copy ---------------- */}
        <div className="relative z-10 max-w-xl">
          <Reveal>
            <p className="text-[0.8rem] font-semibold uppercase tracking-[0.24em] text-ink-soft">
              Join a brand. Build success.
            </p>
          </Reveal>

          <HeroHeading />

          <Reveal delay={160}>
            <span aria-hidden="true" className="mt-6 flex items-center gap-2">
              <span className="h-px w-24 bg-gradient-to-r from-brand-gold to-transparent" />
              <span className="size-1.5 rotate-45 bg-brand-gold" />
              <span className="size-1 rotate-45 bg-brand-gold/60" />
            </span>
          </Reveal>

          <Reveal delay={200}>
            <p className="mt-5 max-w-md text-[0.95rem] leading-relaxed text-ink-soft sm:text-base">
              Premium Event <span className="text-brand-gold">•</span> Wedding{" "}
              <span className="text-brand-gold">•</span> Corporate Catering — built
              on a proven, fully-supported system.
            </p>
          </Reveal>

          <Reveal delay={260}>
            <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-4">
              <a
                href="#enquiry"
                className="group inline-flex items-center gap-3 rounded-full bg-brand-crimson px-7 py-4 text-[0.9rem] font-semibold uppercase tracking-[0.1em] text-white shadow-[0_16px_34px_-16px_rgba(193,39,45,0.95)] transition hover:-translate-y-0.5 hover:bg-brand-maroon hover:shadow-[0_20px_40px_-16px_rgba(142,18,24,0.95)]"
              >
                Start Your Journey
                <span className="grid size-6 place-items-center rounded-full bg-white/20 transition group-hover:translate-x-0.5">
                  <ArrowRight className="size-3.5" strokeWidth={2.5} />
                </span>
              </a>

              <a
                href="#how-it-works"
                className="group inline-flex items-center gap-3 text-ink-soft transition hover:text-brand-crimson"
              >
                <span className="relative grid size-12 place-items-center rounded-full border border-brand-red/30 bg-surface text-brand-crimson shadow-sm transition group-hover:border-brand-red">
                  <span className="absolute inset-0 rounded-full ring-1 ring-brand-red/20 transition group-hover:animate-ping" />
                  <Play className="size-4 translate-x-px fill-current" strokeWidth={0} />
                </span>
                <span className="text-[0.8rem] font-semibold uppercase tracking-[0.16em]">
                  Watch how it works
                </span>
              </a>
            </div>
          </Reveal>

          {/* Trust badges */}
          <Reveal delay={320}>
            <ul className="mt-10 grid grid-cols-2 gap-x-4 gap-y-5 sm:grid-cols-4 sm:gap-x-2">
              {heroBadges.map((badge) => (
                <li key={badge.label} className="flex items-center gap-2.5">
                  <span className="grid size-9 shrink-0 place-items-center rounded-full border border-brand-red/25 bg-surface text-brand-crimson shadow-[0_4px_12px_-8px_rgba(193,39,45,0.8)]">
                    <Icon name={badge.icon} className="size-4" />
                  </span>
                  <span className="whitespace-pre-line text-[0.8rem] font-medium leading-tight text-ink-soft">
                    {badge.label}
                  </span>
                </li>
              ))}
            </ul>
          </Reveal>
        </div>

        {/* ---------------- Image + seal ---------------- */}
        <Reveal variant="zoom" delay={120} className="relative">
          <div className="relative mx-auto aspect-[7/6] w-full max-w-[42rem]">
            {/* Warm glow bleeding out from behind the arch */}
            <div
              aria-hidden="true"
              className="hero-frame pointer-events-none absolute -inset-6 -z-10 bg-[radial-gradient(70%_70%_at_58%_45%,rgba(232,201,138,0.4),transparent_72%)]"
            />

            {/* Dashed outline tracing the silhouette a few pixels out */}
            <div
              aria-hidden="true"
              className="hero-frame pointer-events-none absolute -inset-3 border border-dashed border-brand-gold/60 sm:-inset-5"
            />

            <div className="hero-frame relative size-full overflow-hidden shadow-[0_40px_80px_-40px_rgba(110,40,20,0.55)] ring-1 ring-brand-gold/25">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={images.heroFeast}
                alt="A Khana Banao catering spread — handis of biryani, curries and rice served at an event"
                loading="eager"
                fetchPriority="high"
                decoding="async"
                className="absolute inset-0 size-full object-cover"
              />
              <div
                aria-hidden="true"
                className="absolute inset-0 bg-gradient-to-tr from-brand-maroon-dark/30 via-transparent to-transparent"
              />
            </div>

            {/* Leaves balance the open corners outside the photo silhouette. */}
            <div className="pointer-events-none absolute inset-0 z-10">
              <Leaf src="/decor/leaf-sprig.svg" className="-top-5 left-[7%] w-14 md:-top-7 md:left-[9%] md:w-20" speed={-0.05} rotate={-14} sway swayDelay={0.4} opacity={0.9} />
              <Leaf src="/decor/leaf-basil.svg" className="right-[-4.5rem] top-[14%] w-16 md:-right-24 md:w-24" speed={0.06} rotate={28} sway swayDelay={0.8} opacity={0.85} />
            </div>

            {/* "Stronger Together" seal */}
            {/* z-20 keeps the seal above the decor layer, which is z-10. */}
            <div className="absolute bottom-3 left-3 z-20 sm:bottom-auto sm:left-0 sm:top-1/2 sm:-translate-x-[58%] sm:-translate-y-1/2">
              <div className="grid size-[8.5rem] place-items-center rounded-full bg-gradient-to-br from-brand-maroon to-brand-maroon-dark p-1.5 text-center shadow-[0_22px_44px_-18px_rgba(109,13,18,0.9)] sm:size-[10.5rem]">
                <div className="grid size-full place-items-center rounded-full border border-dashed border-brand-gold-light/60 px-3">
                  <div>
                    <Crown
                      className="mx-auto size-4 text-brand-gold-light sm:size-5"
                      strokeWidth={1.8}
                      aria-hidden="true"
                    />
                    <p className="mt-1.5 font-display text-[0.8rem] font-semibold uppercase leading-snug tracking-[0.1em] text-white">
                      Your Success.
                      <br />
                      Our System.
                    </p>
                    {/* Great Vibes has tall ascenders/descenders — it needs
                        more than `leading-none` or the two lines collide. */}
                    <p className="mt-1 font-script text-lg leading-[1.35] text-brand-gold-light sm:text-[1.4rem]">
                      Stronger
                      <br />
                      Together
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Reveal>
      </div>

      <span className="sr-only">
        Call {site.name} on {site.phone} to discuss a franchise.
      </span>
    </section>
  );
}
