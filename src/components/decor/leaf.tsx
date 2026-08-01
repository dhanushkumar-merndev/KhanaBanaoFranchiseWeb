"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------
   Shared scroll controller

   Every decorative leaf on the page shares ONE passive scroll listener and
   ONE rAF tick. Each tick writes a single CSS custom property per visible
   leaf, which the compositor turns into a transform — no layout, no paint.
------------------------------------------------------------------ */

type LeafEntry = {
  el: HTMLElement;
  speed: number;
  /** Centre of the element in document space, cached between resizes. */
  center: number;
};

const entries = new Set<LeafEntry>();
let listening = false;
let queued = false;
let viewportHeight = 0;
let amplitude = 1;

function measure(entry: LeafEntry) {
  const rect = entry.el.getBoundingClientRect();
  entry.center = rect.top + window.scrollY + rect.height / 2;
}

function measureAll() {
  viewportHeight = window.innerHeight;
  // Phones get a gentler offset: less travel, less chance of the decoration
  // drifting into the text column on a narrow canvas.
  amplitude = window.innerWidth < 768 ? 0.45 : 1;
  for (const entry of entries) measure(entry);
  update();
}

function update() {
  queued = false;
  const scrollY = window.scrollY;
  const midpoint = scrollY + viewportHeight / 2;
  const top = scrollY - viewportHeight * 0.5;
  const bottom = scrollY + viewportHeight * 1.5;

  for (const entry of entries) {
    // Off-screen leaves keep their last value; nothing to write.
    if (entry.center < top || entry.center > bottom) continue;
    const offset = (midpoint - entry.center) * entry.speed * amplitude;
    entry.el.style.setProperty("--leaf-y", `${offset.toFixed(2)}px`);
  }
}

function onScroll() {
  if (queued) return;
  queued = true;
  requestAnimationFrame(update);
}

function startListening() {
  if (listening) return;
  listening = true;
  viewportHeight = window.innerHeight;
  amplitude = window.innerWidth < 768 ? 0.45 : 1;
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", measureAll, { passive: true });
  // Fonts and images settling can shift positions; re-measure once things load.
  window.addEventListener("load", measureAll, { once: true });
}

function stopListening() {
  if (!listening || entries.size > 0) return;
  listening = false;
  window.removeEventListener("scroll", onScroll);
  window.removeEventListener("resize", measureAll);
}

function register(entry: LeafEntry) {
  entries.add(entry);
  startListening();
  measure(entry);
  onScroll();
}

function unregister(entry: LeafEntry) {
  entries.delete(entry);
  stopListening();
}

/* ------------------------------------------------------------------
   Component
------------------------------------------------------------------ */

export type LeafProps = {
  /** Path under /public/decor. */
  src: string;
  /** Absolute-positioning + width utilities. */
  className?: string;
  /**
   * Parallax factor. Positive drifts against the scroll (rises), negative
   * drifts with it. Keep within roughly -0.25..0.25 to stay subtle.
   */
  speed?: number;
  /** Static rotation, degrees. */
  rotate?: number;
  flip?: boolean;
  /** Gentle idle sway on top of the parallax. */
  sway?: boolean;
  swayDelay?: number;
  opacity?: number;
  /** Drop from the DOM below 768px to keep small screens uncluttered. */
  desktopOnly?: boolean;
};

export function Leaf({
  src,
  className,
  speed = 0.1,
  rotate = 0,
  flip = false,
  sway = false,
  swayDelay = 0,
  opacity = 1,
  desktopOnly = false,
}: LeafProps) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const entry: LeafEntry = { el, speed, center: 0 };
    register(entry);
    return () => unregister(entry);
  }, [speed]);

  return (
    <span
      ref={ref}
      aria-hidden="true"
      className={cn(
        "leaf",
        sway && "leaf-sway",
        desktopOnly && "hidden md:block",
        className,
      )}
      style={
        {
          "--leaf-rot": `${rotate}deg`,
          "--leaf-delay": `${swayDelay}s`,
          opacity,
          transform: flip ? undefined : undefined,
        } as React.CSSProperties
      }
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt=""
        loading="lazy"
        decoding="async"
        draggable={false}
        style={flip ? { transform: "scaleX(-1)" } : undefined}
      />
    </span>
  );
}
