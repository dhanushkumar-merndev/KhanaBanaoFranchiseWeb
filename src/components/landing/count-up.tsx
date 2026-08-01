"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Counts from 0 to `value` the first time it scrolls into view.
 * Falls back to the final value immediately for reduced-motion users.
 */
export function CountUp({
  value,
  suffix = "",
  duration = 1400,
  className,
}: {
  value: number;
  suffix?: string;
  duration?: number;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let frame = 0;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      // Jump straight to the final value, but from a frame callback rather
      // than the effect body so it does not cascade an extra render pass.
      frame = requestAnimationFrame(() => setDisplay(value));
      return () => cancelAnimationFrame(frame);
    }

    const observer = new IntersectionObserver(
      ([entry], obs) => {
        if (!entry.isIntersecting) return;
        obs.disconnect();

        const start = performance.now();
        const tick = (now: number) => {
          const t = Math.min(1, (now - start) / duration);
          // easeOutCubic
          const eased = 1 - Math.pow(1 - t, 3);
          setDisplay(Math.round(value * eased));
          if (t < 1) frame = requestAnimationFrame(tick);
        };
        frame = requestAnimationFrame(tick);
      },
      { threshold: 0.4 },
    );

    observer.observe(el);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [value, duration]);

  return (
    <span ref={ref} className={className}>
      {/* Reserve the final width so the card never reflows mid-count. */}
      <span aria-hidden="true">{display.toLocaleString("en-IN")}</span>
      <span aria-hidden="true">{suffix}</span>
      <span className="sr-only">
        {value.toLocaleString("en-IN")}
        {suffix}
      </span>
    </span>
  );
}
