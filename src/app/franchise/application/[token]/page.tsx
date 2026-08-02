import type { Metadata } from "next";
import { resolveToken, touchToken } from "@/lib/data/tokens";
import { LinkInvalid } from "@/app/franchise/link-invalid";
import { ApplicationForm, SubmittedNotice } from "./application-form";

export const metadata: Metadata = {
  title: "Franchise application",
  robots: { index: false, follow: false },
};

/** Token-authenticated, so it must never be cached or prerendered. */
export const dynamic = "force-dynamic";

export default async function ApplicationPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const resolved = await resolveToken(token, "APPLICATION");

  if (!resolved.ok) return <LinkInvalid what="application link" />;

  const { lead, application, tokenId } = resolved.data;
  await touchToken(tokenId);

  // Re-opening a submitted application shows the receipt, never the form
  // (spec §13). The server action enforces this too — this is the polite half.
  if (application && application.status !== "IN_PROGRESS") {
    return (
      <SubmittedNotice
        applicationNumber={application.application_number}
        submittedAt={application.submitted_at}
      />
    );
  }

  return (
    <>
      <header className="mb-6">
        <p className="font-mono text-[0.7rem] uppercase tracking-wide text-ink-soft">
          {lead.lead_number}
        </p>
        <h1 className="mt-1 font-display text-2xl font-bold text-ink md:text-3xl">
          Franchise application
        </h1>
        <p className="mt-2 max-w-xl text-[0.85rem] leading-relaxed text-ink-soft">
          Hello {lead.full_name.split(" ")[0]} — a few details and you are done.
          Everything here is stored securely and used only to assess your
          franchise application. It takes about five minutes.
        </p>
      </header>

      <ApplicationForm
        token={token}
        prefill={{
          fullName: lead.full_name,
          mobile: lead.phone,
          whatsapp: lead.whatsapp ?? "",
          email: lead.email,
          city: lead.city,
          preferredCity: lead.city,
          preferredTerritory: lead.preferred_territory ?? "",
          investmentBudget: lead.investment_range ?? "",
          currentOccupation: lead.current_occupation ?? "",
        }}
      />
    </>
  );
}
