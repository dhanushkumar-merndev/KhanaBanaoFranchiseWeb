import { Check } from "lucide-react";
import { Leaf } from "@/components/decor/leaf";
import { SectionHeading } from "@/components/landing/section-heading";
import { Reveal } from "@/components/motion/reveal";
import { site, whoDoesWhat } from "@/lib/site";
import { cn } from "@/lib/utils";

function ChecklistItem({
  children,
  tone,
  reversed = false,
}: {
  children: React.ReactNode;
  tone: "gold" | "red";
  reversed?: boolean;
}) {
  return (
    <li
      className={cn(
        "flex items-center gap-3 text-[0.9rem] text-ink sm:text-base",
        reversed && "md:flex-row-reverse",
      )}
    >
      <span
        className={cn(
          "grid size-5 shrink-0 place-items-center rounded-full text-white",
          tone === "gold" ? "bg-brand-gold" : "bg-brand-red",
        )}
      >
        <Check className="size-3" strokeWidth={3.2} aria-hidden="true" />
      </span>
      <span>{children}</span>
    </li>
  );
}

export function WhoDoesWhat() {
  return (
    <section id="what-we-provide" className="relative overflow-hidden py-20 md:py-24">
      <div className="shell relative">
        <SectionHeading>Who Does What?</SectionHeading>

        <Reveal delay={100}>
          <div className="relative mt-12 overflow-hidden rounded-3xl border border-line bg-surface-muted px-5 py-10 shadow-[0_24px_60px_-40px_rgba(110,40,20,0.5)] sm:px-10 md:py-12">
            {/* Leaf decorations — left & right behind content columns */}
            <Leaf src="/decor/leaf-sprig.svg" className="-left-2 top-4 w-16 md:w-28" speed={-0.08} rotate={15} sway swayDelay={0.3} opacity={0.7} desktopOnly />
            <Leaf src="/decor/leaf-basil.svg" className="-left-1 bottom-6 w-12 md:w-20" speed={0.1} rotate={-20} flip sway swayDelay={0.7} opacity={0.6} desktopOnly />
            <Leaf src="/decor/leaf-sprig.svg" className="-right-2 top-3 w-16 md:w-28" speed={-0.1} rotate={-12} flip sway swayDelay={0.5} opacity={0.7} desktopOnly />
            <Leaf src="/decor/leaf-single.svg" className="-right-1 bottom-8 w-10 md:w-18" speed={0.09} rotate={25} sway swayDelay={1} opacity={0.6} desktopOnly />

            {/* Food decorations — clustered around centre */}
            <Leaf src="/decor/curry-bowl.svg" className="left-1/2 bottom-2 w-14 -translate-x-[120%] md:w-20" speed={0.06} sway opacity={0.8} />
            <Leaf src="/decor/garlic.svg" className="left-1/2 top-3 w-8 translate-x-[80%] md:w-12" speed={0.11} rotate={-8} sway swayDelay={0.9} opacity={0.75} />
            <Leaf src="/decor/chilli.svg" className="left-1/2 top-1/2 w-7 -translate-x-[200%] -translate-y-1/2 md:w-10" speed={-0.07} rotate={30} sway swayDelay={0.4} opacity={0.65} desktopOnly />

            <div className="relative mx-auto grid max-w-6xl gap-10 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] md:items-center md:gap-6">
              {/* You provide */}
              <div className="md:pl-16">
                <p className="inline-flex rounded-md bg-gradient-to-r from-brand-gold to-brand-beige px-4 py-1.5 text-[0.8rem] font-bold uppercase tracking-[0.14em] text-white shadow-sm">
                  You Provide
                </p>
                <ul className="mt-6 space-y-3.5">
                  {whoDoesWhat.you.map((item) => (
                    <ChecklistItem key={item} tone="gold">
                      {item}
                    </ChecklistItem>
                  ))}
                </ul>
              </div>

              {/* Centre seal */}
              <div className="flex justify-center md:px-2">
                <span className="grid size-28 place-items-center rounded-full border-2 border-dashed border-brand-gold/50 bg-surface p-3 shadow-[0_16px_36px_-24px_rgba(110,40,20,0.7)] md:size-36">
                  <span className="grid size-full place-items-center rounded-full bg-surface-muted/60 p-5">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src="/decor/handshake.svg"
                      alt=""
                      width={120}
                      height={90}
                      loading="lazy"
                      decoding="async"
                      className="w-full"
                      aria-hidden="true"
                    />
                  </span>
                </span>
              </div>

              {/* We provide */}
              <div className="md:pr-16 md:text-right">
                <p className="inline-flex rounded-md bg-gradient-to-r from-brand-red to-brand-crimson px-4 py-1.5 text-[0.8rem] font-bold uppercase tracking-[0.14em] text-white shadow-sm">
                  {site.name} Provides
                </p>
                <ul className="mt-6 space-y-3.5 md:text-left">
                  {whoDoesWhat.us.map((item) => (
                    <ChecklistItem key={item} tone="red" reversed>
                      {item}
                    </ChecklistItem>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
