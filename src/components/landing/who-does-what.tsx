import Image from "next/image";
import { Check } from "lucide-react";
import { Leaf } from "@/components/decor/leaf";
import { SectionHeading } from "@/components/landing/section-heading";
import { Reveal } from "@/components/motion/reveal";
import { site, whoDoesWhat } from "@/lib/site";
import { cn } from "@/lib/utils";

function ChecklistItem({
  children,
  tone,
}: {
  children: React.ReactNode;
  tone: "gold" | "red";
}) {
  return (
    <li className="flex items-center gap-3 text-[0.83rem] text-ink sm:text-sm">
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
            {/* Decoration inside the panel */}
            <Leaf src="/decor/curry-bowl.svg" className="-bottom-3 right-1 w-20 md:w-32" speed={0.08} sway opacity={0.9} />
            <Leaf src="/decor/leaf-sprig.svg" className="right-3 top-4 w-14 md:w-24" speed={-0.1} rotate={-12} flip sway swayDelay={0.5} opacity={0.85} desktopOnly />
            <Leaf src="/decor/garlic.svg" className="bottom-3 left-2 w-9 md:w-14" speed={0.11} rotate={-8} sway swayDelay={0.9} desktopOnly />

            <div className="relative grid gap-10 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] md:items-center md:gap-6">
              {/* You provide */}
              <div>
                <p className="inline-flex rounded-md bg-gradient-to-r from-brand-gold to-brand-beige px-4 py-1.5 text-[0.68rem] font-bold uppercase tracking-[0.14em] text-white shadow-sm">
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
                    <Image
                      src="/decor/handshake.svg"
                      alt=""
                      width={120}
                      height={90}
                      className="w-full"
                      aria-hidden="true"
                    />
                  </span>
                </span>
              </div>

              {/* We provide */}
              <div className="md:text-left">
                <p className="inline-flex rounded-md bg-gradient-to-r from-brand-red to-brand-crimson px-4 py-1.5 text-[0.68rem] font-bold uppercase tracking-[0.14em] text-white shadow-sm">
                  {site.name} Provides
                </p>
                <ul className="mt-6 space-y-3.5">
                  {whoDoesWhat.us.map((item) => (
                    <ChecklistItem key={item} tone="red">
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
