"use client";

import Link from "next/link";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { ChevronDown, ExternalLink, LogOut } from "lucide-react";
import { signOut } from "@/app/actions/auth";
import { Badge } from "@/components/ui/badge";
import type { SessionProfile } from "@/lib/auth/session";

export type Crumb = { label: string; href?: string };

export function Topbar({
  profile,
  crumbs = [],
  actions,
}: {
  profile: SessionProfile;
  crumbs?: Crumb[];
  actions?: React.ReactNode;
}) {
  const initials = profile.full_name
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  return (
    <header className="sticky top-0 z-30 flex min-h-16 flex-wrap items-center gap-3 border-b border-line bg-surface/95 px-4 py-2.5 backdrop-blur md:px-6">
      <nav aria-label="Breadcrumb" className="min-w-0 flex-1">
        <ol className="flex flex-wrap items-center gap-1.5 text-[0.8rem]">
          {crumbs.map((crumb, index) => {
            const last = index === crumbs.length - 1;
            return (
              <li key={`${crumb.label}-${index}`} className="flex items-center gap-1.5">
                {index > 0 && (
                  <span className="text-ink-soft/50" aria-hidden="true">
                    /
                  </span>
                )}
                {crumb.href && !last ? (
                  <Link
                    href={crumb.href}
                    className="text-ink-soft transition hover:text-brand-crimson"
                  >
                    {crumb.label}
                  </Link>
                ) : (
                  <span
                    className="font-display font-bold text-ink"
                    aria-current={last ? "page" : undefined}
                  >
                    {crumb.label}
                  </span>
                )}
              </li>
            );
          })}
        </ol>
      </nav>

      <div className="flex items-center gap-2">
        {actions}

        <DropdownMenu.Root>
          <DropdownMenu.Trigger className="flex items-center gap-2 rounded-full border border-line py-1 pl-1 pr-2.5 transition hover:bg-surface-muted">
            <span className="grid size-7 place-items-center rounded-full bg-brand-crimson text-[0.7rem] font-bold text-white">
              {initials || "?"}
            </span>
            <span className="hidden max-w-[9rem] truncate text-[0.8rem] font-medium text-ink sm:block">
              {profile.full_name}
            </span>
            <ChevronDown className="size-3.5 text-ink-soft" />
          </DropdownMenu.Trigger>

          <DropdownMenu.Portal>
            <DropdownMenu.Content
              align="end"
              sideOffset={8}
              className="z-50 w-60 rounded-xl border border-line bg-surface p-1.5 shadow-xl"
            >
              <div className="px-2.5 py-2">
                <p className="truncate text-[0.82rem] font-semibold text-ink">
                  {profile.full_name}
                </p>
                <p className="mt-0.5 truncate text-[0.72rem] text-ink-soft">
                  {profile.email}
                </p>
                <Badge
                  tone={profile.role === "ADMIN" ? "info" : "neutral"}
                  className="mt-2"
                >
                  {profile.role === "ADMIN" ? "Administrator" : "Member"}
                </Badge>
              </div>

              <DropdownMenu.Separator className="my-1.5 h-px bg-line" />

              <DropdownMenu.Item asChild>
                <Link
                  href="/"
                  className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-[0.82rem] text-ink outline-none data-[highlighted]:bg-surface-muted"
                >
                  <ExternalLink className="size-4" />
                  View website
                </Link>
              </DropdownMenu.Item>

              <DropdownMenu.Item asChild>
                <form action={signOut}>
                  <button
                    type="submit"
                    className="flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[0.82rem] text-danger outline-none data-[highlighted]:bg-danger/5"
                  >
                    <LogOut className="size-4" />
                    Sign out
                  </button>
                </form>
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      </div>
    </header>
  );
}
