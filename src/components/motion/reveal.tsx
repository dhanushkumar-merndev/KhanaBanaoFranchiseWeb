"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

/**
 * One IntersectionObserver for the whole page rather than one per element.
 * Elements are unobserved as soon as they reveal, so the set stays small.
 */
let sharedObserver: IntersectionObserver | null = null;

function getObserver() {
  if (typeof window === "undefined") return null;
  if (!sharedObserver) {
    sharedObserver = new IntersectionObserver(
      (entries, obs) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          (entry.target as HTMLElement).dataset.revealed = "true";
          obs.unobserve(entry.target);
        }
      },
      // Fire slightly before the element is fully in view so the motion
      // finishes about when the user's eye arrives.
      { rootMargin: "0px 0px -8% 0px", threshold: 0.06 },
    );
  }
  return sharedObserver;
}

type RevealVariant = "up" | "left" | "right" | "zoom";

export type RevealProps = {
  children: React.ReactNode;
  className?: string;
  /** Stagger in milliseconds. */
  delay?: number;
  variant?: RevealVariant;
  as?: "div" | "section" | "li" | "article" | "header" | "footer" | "span";
};

const variantClass: Record<RevealVariant, string> = {
  up: "",
  left: "reveal-left",
  right: "reveal-right",
  zoom: "reveal-zoom",
};

export function Reveal({
  children,
  className,
  delay = 0,
  variant = "up",
  as: Tag = "div",
}: RevealProps) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Respect the OS setting: show everything immediately, observe nothing.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      el.dataset.revealed = "true";
      return;
    }

    const obs = getObserver();
    obs?.observe(el);
    return () => obs?.unobserve(el);
  }, []);

  return (
    <Tag
      ref={ref as never}
      className={cn("reveal", variantClass[variant], className)}
      style={delay ? ({ "--reveal-delay": `${delay}ms` } as React.CSSProperties) : undefined}
    >
      {children}
    </Tag>
  );
}
