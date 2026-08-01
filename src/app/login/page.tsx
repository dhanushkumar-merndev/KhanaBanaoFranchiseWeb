import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { GoogleButton } from "@/components/auth/google-button";
import { images, site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Sign in",
  robots: { index: false, follow: false },
};

const ERRORS: Record<string, string> = {
  missing_code: "The sign-in link was incomplete. Please try again.",
  exchange_failed: "We could not complete sign-in with Google. Please try again.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const params = await searchParams;
  const message = params.error ? ERRORS[params.error] : undefined;

  return (
    <main className="flex flex-1 items-center justify-center bg-canvas px-5 py-16">
      <div className="w-full max-w-md">
        <Link
          href="/"
          className="mb-8 inline-flex items-center gap-2 text-[0.78rem] font-medium text-ink-soft transition hover:text-brand-crimson"
        >
          <ArrowLeft className="size-4" />
          Back to the website
        </Link>

        <div className="rounded-2xl border border-line bg-surface p-8 shadow-[0_24px_60px_-40px_rgba(110,40,20,0.5)]">
          <Image
            src={images.logo}
            alt={site.name}
            width={images.logoWidth}
            height={images.logoHeight}
            priority
            className="h-11 w-auto"
          />

          <h1 className="mt-7 font-display text-2xl font-bold text-ink">
            Partner dashboard
          </h1>
          <p className="mt-2 text-[0.83rem] leading-relaxed text-ink-soft">
            Sign in with the Google account you were invited on. Access is
            invitation-only.
          </p>

          {message && (
            <p
              role="alert"
              className="mt-5 rounded-xl border border-danger/25 bg-danger/5 px-4 py-3 text-[0.78rem] text-danger"
            >
              {message}
            </p>
          )}

          <div className="mt-7">
            <GoogleButton next={params.next} />
          </div>

          <p className="mt-6 text-center text-[0.72rem] leading-relaxed text-ink-soft">
            Trouble signing in? Contact your administrator or call{" "}
            <a
              href={site.phoneHref}
              className="font-semibold text-brand-crimson underline underline-offset-2"
            >
              {site.phone}
            </a>
            .
          </p>
        </div>
      </div>
    </main>
  );
}
