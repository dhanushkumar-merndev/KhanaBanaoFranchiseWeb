import type { Metadata } from "next";
import { LegalPage } from "@/components/legal/legal-page";
import { termsDoc } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Terms & Conditions",
  description:
    "The terms on which we make this website and the Khana Banao franchise enquiry process available to you.",
};

export default function TermsPage() {
  return <LegalPage doc={termsDoc} />;
}
