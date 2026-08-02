import { LinkIcon } from "lucide-react";
import { ContactAction } from "@/components/contact/contact-action";
import { site } from "@/lib/site";

/**
 * Shown for every token failure — invalid, expired, revoked, unknown.
 *
 * Deliberately identical in all four cases: telling a stranger that a token
 * "expired" confirms it once existed, which is more than they should learn.
 */
export function LinkInvalid({ what = "link" }: { what?: string }) {
  return (
    <div className="rounded-2xl border border-line bg-surface px-6 py-12 text-center">
      <span className="mx-auto grid size-12 place-items-center rounded-full bg-surface-muted text-ink-soft">
        <LinkIcon className="size-6" />
      </span>
      <h1 className="mt-4 font-display text-xl font-bold text-ink">
        This {what} is no longer valid
      </h1>
      <p className="mx-auto mt-2 max-w-md text-[0.85rem] leading-relaxed text-ink-soft">
        It may have expired, or a newer one may have been sent to you. Please
        check your email for the most recent message from us, or get in touch
        and we will send a fresh link.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <ContactAction
          kind="phone"
          className="inline-flex h-10 items-center rounded-lg bg-brand-red px-5 text-[0.85rem] font-semibold text-white transition hover:bg-brand-crimson"
        >
          Call {site.phone}
        </ContactAction>
        <ContactAction
          kind="email"
          className="inline-flex h-10 items-center rounded-lg border border-line px-5 text-[0.85rem] font-semibold text-ink transition hover:bg-surface-muted"
        >
          Email us
        </ContactAction>
      </div>
    </div>
  );
}
