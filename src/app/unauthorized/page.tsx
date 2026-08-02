import type { Metadata } from "next";
import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { ContactAction } from "@/components/contact/contact-action";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "No access",
  robots: { index: false, follow: false },
};

const REASONS: Record<string, { title: string; body: string }> = {
  not_invited: {
    title: "This account has not been invited",
    body: "Access is invitation-only. Ask an administrator to invite this exact Google address, then sign in again.",
  },
  inactive: {
    title: "This account is deactivated",
    body: "An administrator has turned off access for this account. Contact them if you think that is a mistake.",
  },
  expired: {
    title: "That invitation has expired",
    body: "Invitations are valid for 14 days. Ask an administrator to send a fresh one.",
  },
  mismatch: {
    title: "This email is linked to a different Google account",
    body: "Sign in with the original Google account, or ask an administrator to reset the link.",
  },
  member_limit: {
    title: "The team is full",
    body: "There are already 20 active members. An administrator needs to deactivate someone before you can join.",
  },
  role: {
    title: "Administrator access required",
    body: "That area is limited to administrators. Your member dashboard has everything assigned to you.",
  },
};

const FALLBACK = {
  title: "You do not have access to that page",
  body: "If you believe this is a mistake, contact your administrator.",
};

export default async function UnauthorizedPage({
  searchParams,
}: {
  searchParams: Promise<{ reason?: string }>;
}) {
  const { reason } = await searchParams;
  const detail = (reason && REASONS[reason]) || FALLBACK;

  return (
    <main className="flex flex-1 items-center justify-center bg-canvas px-5 py-16">
      <div className="w-full max-w-lg rounded-2xl border border-line bg-surface p-8 text-center shadow-[0_24px_60px_-40px_rgba(110,40,20,0.5)]">
        <span className="mx-auto grid size-14 place-items-center rounded-full bg-warn/10 text-warn">
          <ShieldAlert className="size-7" strokeWidth={1.8} />
        </span>

        <h1 className="mt-6 font-display text-2xl font-bold text-ink">
          {detail.title}
        </h1>
        <p className="mx-auto mt-3 max-w-sm text-[0.85rem] leading-relaxed text-ink-soft">
          {detail.body}
        </p>

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            href="/login"
            className="rounded-full bg-brand-crimson px-6 py-3 text-sm font-semibold text-white transition hover:bg-brand-maroon"
          >
            Try a different account
          </Link>
          <Link
            href="/"
            className="rounded-full border border-line px-6 py-3 text-sm font-semibold text-ink transition hover:bg-surface-muted"
          >
            Back to the website
          </Link>
        </div>

        <p className="mt-6 text-[0.72rem] text-ink-soft">
          Need help? Call{" "}
          <ContactAction kind="phone" className="font-semibold text-brand-crimson">
            {site.phone}
          </ContactAction>
        </p>
      </div>
    </main>
  );
}
