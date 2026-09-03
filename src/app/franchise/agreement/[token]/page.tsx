import type { Metadata } from "next";
import { AGREEMENT_DOCUMENT_VERSION } from "@/lib/agreement/clauses";
import { AGREEMENT_STYLES, renderDocumentBody } from "@/lib/agreement/render";
import { resolveAgreementToken } from "@/lib/data/agreement-document";
import { site } from "@/lib/site";
import { PrintButton } from "./print-button";

/**
 * The customer's copy of their franchise agreement.
 *
 * Rendered server-side from the same clauses and values the staff editor
 * shows, and styled for A4 so the browser's own "Save as PDF" produces the
 * document they sign. Nothing here is interactive beyond printing — the
 * signed copy comes back to us as a scan.
 */

export const metadata: Metadata = {
  title: "Your franchise agreement",
  robots: { index: false, follow: false },
};

/** Every failure looks identical, so a token cannot be probed for its state. */
function Unavailable() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-3 px-6 text-center">
      <h1 className="font-display text-2xl font-bold text-ink">
        This link is not available
      </h1>
      <p className="text-[0.9rem] leading-relaxed text-ink-soft">
        It may have expired, or been replaced by a newer version of your
        agreement. Call us on {site.phone} and we will send you a fresh link.
      </p>
    </main>
  );
}

export default async function AgreementPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const resolved = await resolveAgreementToken(token);

  if (!resolved.ok) return <Unavailable />;

  const document = resolved.data;
  const body = renderDocumentBody(document.values, document.overrides, {
    agreementNumber: document.agreementNumber,
    version: document.version,
    documentVersion: AGREEMENT_DOCUMENT_VERSION,
    franchiseeName: document.franchiseeName,
  });

  return (
    <>
      <style>{AGREEMENT_STYLES}</style>
      <div className="no-print sticky top-0 z-10 flex flex-wrap items-center justify-between gap-3 border-b border-[#d8cec1] bg-[#8e1218] px-5 py-3 text-white">
        <div>
          <p className="text-[0.95rem] font-semibold">
            Agreement {document.agreementNumber}
          </p>
          <p className="text-[0.78rem] opacity-80">
            Prepared for {document.franchiseeName}
          </p>
        </div>
        <PrintButton />
      </div>

      <article className="sheet" dangerouslySetInnerHTML={{ __html: body }} />

      <p className="no-print mx-auto max-w-[210mm] px-5 py-8 text-center text-[0.78rem] leading-relaxed text-[#55504b]">
        Use <strong>Print</strong> and choose “Save as PDF” to keep a copy.
        Questions before you sign? Call {site.phone}.
      </p>
    </>
  );
}
