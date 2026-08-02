import type { Metadata } from "next";
import { LegalPage } from "@/components/legal/legal-page";
import { privacyDoc } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "How we collect, use and protect the information you share when you enquire about or apply for a Khana Banao franchise.",
};

export default function PrivacyPage() {
  return <LegalPage doc={privacyDoc} />;
}
