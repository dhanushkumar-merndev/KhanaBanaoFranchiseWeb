import { Phone } from "lucide-react";
import { ContactAction } from "@/components/contact/contact-action";
import { Leaf } from "@/components/decor/leaf";
import { WhatsappIcon } from "@/components/landing/icons";
import { Reveal } from "@/components/motion/reveal";
import { site } from "@/lib/site";

export function CtaBanner() {
  return (
    <section id="contact" className="relative py-10 md:py-14">
      <div className="shell">
        <Reveal>
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-brand-maroon-dark via-brand-maroon to-brand-crimson px-6 py-8 shadow-[0_28px_64px_-32px_rgba(109,13,18,0.85)] sm:px-10">
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 opacity-[0.07] [background-image:repeating-linear-gradient(-45deg,#fff_0_1px,transparent_1px_10px)]"
            />
            <Leaf src="/decor/leaf-sprig.svg" className="-right-3 -top-1 w-16 md:w-24" speed={-0.1} rotate={20} flip sway opacity={0.7} />
            <Leaf src="/decor/leaf-single.svg" className="bottom-1 left-[44%] w-7 md:w-10" speed={0.13} rotate={-16} sway swayDelay={0.7} opacity={0.8} desktopOnly />

            <div className="relative flex flex-col items-center gap-7 text-center lg:flex-row lg:justify-between lg:text-left">
              <div className="flex items-center gap-5">
                {/* Phone mockup */}
                <span
                  aria-hidden="true"
                  className="animate-float-slow hidden h-[6.5rem] w-[3.4rem] shrink-0 rounded-[0.9rem] bg-gradient-to-b from-zinc-800 to-black p-[3px] shadow-[0_16px_30px_-14px_rgba(0,0,0,0.8)] sm:block"
                >
                  <span className="relative grid size-full place-items-center rounded-[0.75rem] bg-gradient-to-b from-[#f3f6f4] to-[#dfe7e2]">
                    <span className="absolute inset-x-0 top-1 mx-auto h-1 w-5 rounded-full bg-black/70" />
                    <WhatsappIcon className="size-7 text-[#25D366]" />
                  </span>
                </span>

                <div>
                  <h2 className="font-display text-xl font-bold leading-snug text-white sm:text-2xl md:text-[1.75rem]">
                    Ready to start your
                    <br className="hidden sm:block" /> {site.name} franchise?
                  </h2>
                  <p className="mt-2 text-[0.9rem] text-white/80">
                    Let&rsquo;s build success together.
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <ContactAction
                  kind="phone"
                  className="inline-flex items-center justify-center gap-2.5 rounded-full bg-white px-6 py-3.5 text-sm font-semibold text-brand-crimson shadow-[0_12px_26px_-14px_rgba(0,0,0,0.6)] transition hover:-translate-y-0.5 hover:bg-canvas"
                >
                  <Phone className="size-4" strokeWidth={2.3} />
                  {site.phone}
                </ContactAction>
                <a
                  href={site.whatsappHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2.5 rounded-full bg-[#25D366] px-6 py-3.5 text-sm font-semibold text-white shadow-[0_12px_26px_-14px_rgba(0,0,0,0.6)] transition hover:-translate-y-0.5 hover:bg-[#1eb857]"
                >
                  <WhatsappIcon className="size-[1.15rem]" />
                  WhatsApp Us
                </a>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
