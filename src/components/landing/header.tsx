"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Menu, Phone, X } from "lucide-react";
import { ContactAction } from "@/components/contact/contact-action";
import { images, nav, site } from "@/lib/site";
import { cn } from "@/lib/utils";

export function Header() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  // The nav is a set of in-page anchors. They only resolve on the landing
  // page — from /privacy or /terms they have to route home first, and no
  // section can be "current" because none of them are on the page.
  const onLanding = pathname === "/";
  const linkTo = (hash: string) => (onLanding ? hash : `/${hash}`);

  const [active, setActive] = useState<string>(onLanding ? "#home" : "");
  const [lastPathname, setLastPathname] = useState(pathname);

  if (pathname !== lastPathname) {
    setLastPathname(pathname);
    setActive(pathname === "/" ? "#home" : "");
    setOpen(false);
  }

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Scroll-spy: highlight whichever section owns the upper third of the screen.
  useEffect(() => {
    const sections = nav
      .map((item) => document.querySelector(item.href))
      .filter((el): el is Element => Boolean(el));
    if (!sections.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible?.target.id) setActive(`#${visible.target.id}`);
      },
      { rootMargin: "-20% 0px -65% 0px", threshold: [0, 0.25, 0.5] },
    );

    sections.forEach((s) => observer.observe(s));
    return () => observer.disconnect();
  }, []);

  // Lock the page while the mobile sheet is open.
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <header
      className={cn(
        "sticky top-0 z-50 w-full transition-all duration-300",
        scrolled
          ? "border-b border-line/80 bg-surface/95 shadow-[0_6px_28px_-18px_rgba(110,40,20,0.5)] backdrop-blur-md"
          : "bg-surface",
      )}
    >
      <div className="shell flex h-16 items-center justify-between gap-4 md:h-20">
        <a href={onLanding ? "#home" : "/"} className="relative z-10 flex shrink-0 items-center" aria-label={`${site.name} home`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={images.logo}
            alt={`${site.name} — ${site.tagline}`}
            width={images.logoWidth}
            height={images.logoHeight}
            loading="eager"
            fetchPriority="high"
            decoding="async"
            className="h-9 w-auto md:h-11"
          />
        </a>

        <nav className="hidden items-center gap-1 lg:flex" aria-label="Primary">
          {nav.map((item) => {
            const isActive = active === item.href;
            return (
              <a
                key={item.href}
                href={linkTo(item.href)}
                aria-current={isActive ? "true" : undefined}
                className={cn(
                  "relative rounded-full px-3 py-2 text-[0.92rem] font-medium transition-colors",
                  isActive
                    ? "text-brand-crimson"
                    : "text-ink-soft hover:text-brand-crimson",
                )}
              >
                {item.label}
                <span
                  className={cn(
                    "absolute inset-x-3 -bottom-0.5 h-0.5 origin-center rounded-full bg-brand-red transition-transform duration-300",
                    isActive ? "scale-x-100" : "scale-x-0",
                  )}
                />
              </a>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          <ContactAction
            kind="phone"
            className="hidden items-center gap-2 rounded-full bg-brand-crimson px-4 py-2.5 text-sm font-semibold text-white shadow-[0_8px_20px_-10px_rgba(193,39,45,0.9)] transition hover:bg-brand-maroon focus-visible:outline-offset-4 sm:inline-flex"
          >
            <Phone className="size-4" strokeWidth={2.2} />
            <span>{site.phone}</span>
          </ContactAction>

          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-controls="mobile-nav"
            aria-label={open ? "Close menu" : "Open menu"}
            className="inline-flex size-11 items-center justify-center rounded-full border border-line text-brand-crimson transition hover:bg-surface-muted lg:hidden"
          >
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>

      {/* Mobile sheet */}
      <div
        id="mobile-nav"
        hidden={!open}
        className="border-t border-line bg-surface lg:hidden"
      >
        <nav className="shell flex flex-col py-3" aria-label="Mobile">
          {nav.map((item) => (
            <a
              key={item.href}
              href={linkTo(item.href)}
              onClick={() => setOpen(false)}
              className={cn(
                "rounded-xl px-3 py-3.5 text-sm font-medium transition-colors",
                active === item.href
                  ? "bg-surface-muted text-brand-crimson"
                  : "text-ink hover:bg-surface-muted",
              )}
            >
              {item.label}
            </a>
          ))}
          <ContactAction
            kind="phone"
            onClick={() => setOpen(false)}
            className="mt-2 inline-flex items-center justify-center gap-2 rounded-full bg-brand-crimson px-4 py-3.5 text-sm font-semibold text-white"
          >
            <Phone className="size-4" strokeWidth={2.2} />
            {site.phone}
          </ContactAction>
        </nav>
      </div>
    </header>
  );
}
