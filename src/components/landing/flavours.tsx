"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Reveal } from "@/components/motion/reveal";
import { images } from "@/lib/site";
import { cn } from "@/lib/utils";

export function Flavours() {
  const trackRef = useRef<HTMLUListElement>(null);
  const [isScrollable, setIsScrollable] = useState(false);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const syncEdges = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;
    const { scrollLeft, scrollWidth, clientWidth } = track;
    const canScroll = scrollWidth - clientWidth > 4;
    setIsScrollable(canScroll);
    setAtStart(scrollLeft <= 4);
    setAtEnd(scrollLeft + clientWidth >= scrollWidth - 4);

    const slide = track.firstElementChild as HTMLElement | null;
    if (slide) {
      const step = slide.offsetWidth + 16;
      setActiveIndex(Math.round(scrollLeft / step));
    }
  }, []);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    syncEdges();
    track.addEventListener("scroll", syncEdges, { passive: true });
    window.addEventListener("resize", syncEdges, { passive: true });
    return () => {
      track.removeEventListener("scroll", syncEdges);
      window.removeEventListener("resize", syncEdges);
    };
  }, [syncEdges]);

  const scrollByCard = (direction: 1 | -1) => {
    const track = trackRef.current;
    if (!track) return;
    const slide = track.firstElementChild as HTMLElement | null;
    const step = slide ? slide.offsetWidth + 16 : track.clientWidth * 0.8;
    track.scrollBy({ left: step * direction, behavior: "smooth" });
  };

  const goTo = (index: number) => {
    const track = trackRef.current;
    if (!track) return;
    const slide = track.firstElementChild as HTMLElement | null;
    const step = slide ? slide.offsetWidth + 16 : track.clientWidth;
    track.scrollTo({ left: step * index, behavior: "smooth" });
  };

  return (
    <section className="relative overflow-hidden py-16 md:py-20">
      <div className="shell">
        <Reveal className="text-center">
          <h2 className="font-display text-2xl font-bold uppercase tracking-[0.1em] text-ink sm:text-3xl md:text-[2.1rem]">
            Our <span className="text-brand-crimson">Flavours.</span> Your Success.
          </h2>
        </Reveal>

        <Reveal delay={100} className="relative mt-10">
          {/* Arrow navigation — only visible when the gallery is scrollable */}
          {isScrollable && (
            <>
              <button
                type="button"
                onClick={() => scrollByCard(-1)}
                disabled={atStart}
                aria-label="Previous images"
                className={cn(
                  "absolute -left-2 top-1/2 z-20 grid size-9 -translate-y-1/2 place-items-center rounded-full bg-brand-crimson text-white shadow-[0_10px_22px_-10px_rgba(193,39,45,0.95)] transition duration-200 hover:bg-brand-maroon md:-left-4 md:size-11",
                  atStart ? "pointer-events-none invisible opacity-0" : "opacity-100"
                )}
              >
                <ChevronLeft className="size-5" strokeWidth={2.4} />
              </button>
              <button
                type="button"
                onClick={() => scrollByCard(1)}
                disabled={atEnd}
                aria-label="Next images"
                className={cn(
                  "absolute -right-2 top-1/2 z-20 grid size-9 -translate-y-1/2 place-items-center rounded-full bg-brand-crimson text-white shadow-[0_10px_22px_-10px_rgba(193,39,45,0.95)] transition duration-200 hover:bg-brand-maroon md:-right-4 md:size-11",
                  atEnd ? "pointer-events-none invisible opacity-0" : "opacity-100"
                )}
              >
                <ChevronRight className="size-5" strokeWidth={2.4} />
              </button>
            </>
          )}

          <ul
            ref={trackRef}
            tabIndex={0}
            aria-label="Khana Banao event gallery"
            className="no-scrollbar flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth px-1 py-2"
          >
            {images.flavours.map((image) => (
              <li
                key={image.src}
                className="w-[78%] shrink-0 snap-center sm:w-[46%] lg:w-[calc((100%-4rem)/5)]"
              >
                <div className="group relative aspect-[4/3] overflow-hidden rounded-xl ring-1 ring-line shadow-[0_16px_36px_-26px_rgba(110,40,20,0.6)]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={image.src}
                    alt={image.alt}
                    loading="lazy"
                    decoding="async"
                    className="absolute inset-0 size-full object-cover transition duration-500 group-hover:scale-[1.06]"
                  />
                  <span
                    aria-hidden="true"
                    className="absolute inset-0 bg-gradient-to-t from-brand-maroon-dark/35 to-transparent opacity-0 transition duration-300 group-hover:opacity-100"
                  />
                </div>
              </li>
            ))}
          </ul>

          {/* Dots — only visible when scrollable */}
          {isScrollable && (
            <div className="mt-5 flex justify-center gap-2 lg:hidden">
              {images.flavours.map((image, index) => (
                <button
                  key={image.src}
                  type="button"
                  onClick={() => goTo(index)}
                  aria-label={`Go to image ${index + 1}`}
                  aria-current={activeIndex === index}
                  className={cn(
                    "h-2 rounded-full transition-all",
                    activeIndex === index
                      ? "w-6 bg-brand-crimson"
                      : "w-2 bg-brand-red/30",
                  )}
                />
              ))}
            </div>
          )}
        </Reveal>
      </div>
    </section>
  );
}
