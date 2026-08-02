"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";

/**
 * GSAP character-stagger animation for the hero heading.
 * Desktop only (≥ 1024px) — on mobile the text renders immediately.
 *
 * Each word is wrapped in a `<span>` for line control, and each character
 * in a `<span>` so GSAP can animate them individually. The "Khana Banao"
 * brand name gets the crimson colour treatment.
 */

type Line = {
  text: string;
  className?: string;
};

const lines: Line[] = [
  { text: "Become a" },
  { text: "Khana Banao", className: "text-brand-crimson" },
  { text: "Franchise Partner" },
];

export function HeroHeading() {
  const containerRef = useRef<HTMLHeadingElement>(null);
  const hasAnimated = useRef(false);

  useEffect(() => {
    if (hasAnimated.current) return;

    const el = containerRef.current;
    if (!el) return;

    // Only run on desktop (≥ 1024px)
    const isDesktop = window.matchMedia("(min-width: 1024px)").matches;
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    if (!isDesktop || prefersReducedMotion) {
      // Show immediately on mobile or reduced-motion
      const chars = el.querySelectorAll<HTMLElement>(".hero-char");
      chars.forEach((c) => {
        c.style.opacity = "1";
        c.style.transform = "none";
      });
      return;
    }

    hasAnimated.current = true;

    const chars = el.querySelectorAll<HTMLElement>(".hero-char");

    // Set initial state
    gsap.set(chars, {
      opacity: 0,
      y: 40,
      rotateX: -60,
      scale: 0.85,
    });

    // Stagger animation
    gsap.to(chars, {
      opacity: 1,
      y: 0,
      rotateX: 0,
      scale: 1,
      duration: 0.55,
      ease: "back.out(1.4)",
      stagger: {
        each: 0.035,
        from: "start",
      },
      delay: 0.3,
    });
  }, []);

  return (
    <>
      {/* The characters start hidden in CSS so a hard reload never flashes the
          finished headline before GSAP takes over. Without scripting the
          stagger never runs, so that has to be undone or the h1 stays blank. */}
      <noscript
        dangerouslySetInnerHTML={{
          __html: "<style>.hero-char{opacity:1}</style>",
        }}
      />
      <h1
        ref={containerRef}
        className="mt-4 font-display text-[2.6rem] leading-[1.06] font-bold tracking-tight text-ink sm:text-6xl lg:text-[4.15rem]"
        style={{ perspective: "600px" }}
      >
        {lines.map((line, lineIdx) => (
          <span
            key={lineIdx}
            className={`${lineIdx > 0 ? "mt-1 " : ""}block ${line.className ?? ""}`}
          >
            {line.text.split("").map((char, charIdx) => (
              <span
                key={`${lineIdx}-${charIdx}`}
                className="hero-char inline-block"
                style={{
                  /* Spaces need a minimum width or they collapse as inline-block */
                  ...(char === " " ? { width: "0.3em" } : {}),
                }}
              >
                {char === " " ? "\u00A0" : char}
              </span>
            ))}
          </span>
        ))}
      </h1>
    </>
  );
}
