import type { Metadata } from "next";
import Image from "next/image";
import { images, site } from "@/lib/site";

export const metadata: Metadata = {
  // Applicant links are private by nature; keep them out of search results.
  robots: { index: false, follow: false },
};

/** Chrome for the token-authenticated applicant pages. No navigation: the
 *  applicant has exactly one thing to do on this page. */
export default function FranchiseLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col bg-canvas">
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3.5">
          <Image
            src={images.logo}
            alt={site.name}
            width={images.logoWidth}
            height={images.logoHeight}
            className="h-9 w-auto"
            priority
          />
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">{children}</main>

      <footer className="border-t border-line bg-surface">
        <div className="mx-auto max-w-3xl px-4 py-5 text-[0.75rem] leading-relaxed text-ink-soft">
          <p>
            Need help? Call{" "}
            <a href={site.phoneHref} className="text-brand-crimson hover:underline">
              {site.phone}
            </a>{" "}
            or email{" "}
            <a href={`mailto:${site.email}`} className="text-brand-crimson hover:underline">
              {site.email}
            </a>
            .
          </p>
          <p className="mt-1.5">
            © {new Date().getFullYear()} {site.name}. This link is personal to
            you — please do not forward it.
          </p>
        </div>
      </footer>
    </div>
  );
}
