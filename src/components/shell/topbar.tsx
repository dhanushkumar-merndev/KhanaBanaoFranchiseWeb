"use client";

import { useTransition } from "react";
import Link from "next/link";
import * as Avatar from "@radix-ui/react-avatar";
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
  const [signingOut, startSignOut] = useTransition();
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
            <Avatar.Root className="inline-flex size-7 select-none items-center justify-center overflow-hidden rounded-full align-middle bg-brand-crimson shrink-0">
              <Avatar.Image
                className="size-full object-cover"
                src={profile.avatar_url || undefined}
                alt={profile.full_name}
              />
              <Avatar.Fallback className="text-[0.7rem] font-bold text-white">
                {initials || "?"}
              </Avatar.Fallback>
            </Avatar.Root>
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
            <div className="flex items-center gap-3 px-2.5 py-2">
              <Avatar.Root className="inline-flex size-9 select-none items-center justify-center overflow-hidden rounded-full align-middle bg-brand-crimson shrink-0">
                <Avatar.Image
                  className="size-full object-cover"
                  src={profile.avatar_url || undefined}
                  alt={profile.full_name}
                />
                <Avatar.Fallback className="text-[0.8rem] font-bold text-white">
                  {initials || "?"}
                </Avatar.Fallback>
              </Avatar.Root>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[0.82rem] font-semibold text-ink">
                  {profile.full_name}
                </p>
                <p className="truncate text-[0.72rem] text-ink-soft">
                  {profile.email}
                </p>
                <Badge
                  tone={profile.role === "ADMIN" ? "info" : "neutral"}
                  className="mt-1"
                >
                  {profile.role === "ADMIN" ? "Administrator" : "Member"}
                </Badge>
              </div>
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

            {/* Calls the action directly instead of submitting a <form>.
                Selecting an item closes the menu, React flushes that unmount
                synchronously during the click, and anything inside Content is
                detached from the document before the browser reaches the
                submit — so a form here never fires, wherever it sits. */}
            <DropdownMenu.Item
              disabled={signingOut}
              onSelect={() => startSignOut(() => void signOut())}
              className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-[0.82rem] text-danger outline-none data-[disabled]:pointer-events-none data-[highlighted]:bg-danger/5 data-[disabled]:opacity-50"
            >
              <LogOut className="size-4" />
              {signingOut ? "Signing out…" : "Sign out"}
            </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      </div>
    </header>
  );
}
