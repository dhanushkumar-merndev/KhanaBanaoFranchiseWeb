"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  BadgeIndianRupee,
  CalendarClock,
  ClipboardList,
  FileSignature,
  FileText,
  LayoutDashboard,
  Mail,
  Menu,
  ScrollText,
  Store,
  UserCog,
  Users,
  Wrench,
  X,
  type LucideIcon,
} from "lucide-react";
import { isActiveNav, navFor, type NavIcon } from "@/lib/nav";
import { images, site } from "@/lib/site";
import type { Role } from "@/lib/domain/enums";
import { cn } from "@/lib/utils";

const ICONS: Record<NavIcon, LucideIcon> = {
  dashboard: LayoutDashboard,
  members: UserCog,
  leads: Users,
  followups: CalendarClock,
  applications: ClipboardList,
  documents: FileText,
  agreements: FileSignature,
  payments: BadgeIndianRupee,
  franchises: Store,
  training: ScrollText,
  setup: Wrench,
  templates: Mail,
  logs: Mail,
  activity: Activity,
};

export function Sidebar({ role }: { role: Role }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [lastPathname, setLastPathname] = useState(pathname);
  const groups = navFor(role);

  // Any navigation closes the mobile drawer. Adjusted during render rather
  // than in an effect, so the drawer never paints over the new page first.
  if (pathname !== lastPathname) {
    setLastPathname(pathname);
    setOpen(false);
  }

  const nav = (
    <nav
      className="no-scrollbar flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto overscroll-y-contain px-3 py-5"
      aria-label="Dashboard"
    >
      {groups.map((group) => (
        <div key={group.title}>
          <p className="px-3 pb-2 text-[0.62rem] font-bold uppercase tracking-[0.14em] text-ink-soft/70">
            {group.title}
          </p>
          <ul className="space-y-0.5">
            {group.items.map((item) => {
              const Icon = ICONS[item.icon];
              const active = isActiveNav(pathname, item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2.5 text-[0.83rem] font-medium transition",
                      active
                        ? "bg-brand-crimson text-white shadow-sm"
                        : "text-ink hover:bg-surface-muted",
                    )}
                  >
                    <Icon className="size-4 shrink-0" strokeWidth={1.9} />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );

  return (
    <>
      {/* Mobile trigger lives in the topbar via this fixed button */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open navigation"
        aria-expanded={open}
        className="fixed bottom-5 right-5 z-40 grid size-12 place-items-center rounded-full bg-brand-crimson text-white shadow-lg lg:hidden"
      >
        <Menu className="size-5" />
      </button>

      {/* Desktop rail */}
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r border-line bg-surface lg:flex">
        <Link href="/" className="flex h-16 items-center border-b border-line px-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={images.logo}
            alt={site.name}
            width={images.logoWidth}
            height={images.logoHeight}
            decoding="async"
            className="h-8 w-auto"
          />
        </Link>
        {nav}
      </aside>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Close navigation"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-brand-maroon-dark/40 backdrop-blur-[2px]"
          />
          <aside className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col bg-surface shadow-2xl">
            <div className="flex h-16 items-center justify-between border-b border-line px-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={images.logo}
                alt={site.name}
                width={images.logoWidth}
                height={images.logoHeight}
                decoding="async"
                className="h-8 w-auto"
              />
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close navigation"
                className="grid size-9 place-items-center rounded-full text-ink-soft hover:bg-surface-muted"
              >
                <X className="size-5" />
              </button>
            </div>
            {nav}
          </aside>
        </div>
      )}
    </>
  );
}
