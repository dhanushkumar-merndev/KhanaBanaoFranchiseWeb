import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { PDFDocument } from "pdf-lib";
import { generateAgreementPdf } from "@/lib/agreement/pdf";
import type { AgreementDocument } from "@/lib/data/agreement-document";

const document: AgreementDocument = {
  agreementId: "sample",
  agreementNumber: "KB-AG01001",
  version: 1,
  status: "PENDING",
  leadId: "sample",
  leadNumber: "KB-L01001",
  franchiseeName: "Ansar - Testing",
  documentSentAt: null,
  franchisorSignaturePath: null,
  franchisorSignatureFileName: null,
  overrides: {},
  values: {
    agreement_date: "2026-09-03",
    execution_place: "Bengaluru",
    franchisee_name: "Ansar - Testing",
    franchisee_address: "Star Tech India, Bengaluru, Karnataka 560050",
    franchisee_pan_gst: "AFZPK7190K",
    franchisee_phone: "+91 9742606830",
    franchisee_email: "ansar272916@gmail.com",
    effective_date: "2026-09-03",
    franchisee_legal_name: "Ansar - Testing",
    selected_tier: "Tier 3 — Corporate Events",
    approved_territory: "Bengaluru South",
    territory_status: "Protected",
    franchise_fee_amount: "5,00,000",
    franchise_fee_words: "Five Lakh",
    royalty_percent: "8",
    payment_cycle: "Monthly",
    marketing_contribution: "Included",
    security_deposit: "NIL",
    training_terms: "Initial training included",
    renewal_fee: "As agreed",
    cure_period: "30 days",
    arbitration_seat: "Bengaluru",
    authorised_signatory: "Food Chain System",
    franchisor_signatory_name: "Food Chain System",
    franchisor_signatory_designation: "Authorised Signatory",
    franchisee_signatory_name: "Ansar - Testing",
    franchisee_signatory_designation: "Proprietor",
  },
};

describe("agreement PDF", () => {
  it("fills the approved 21-page Letter master", async () => {
    const bytes = await generateAgreementPdf(document);
    expect(bytes.subarray(0, 4).toString()).toBe("%PDF");
    expect(bytes.byteLength).toBeGreaterThan(500_000);

    const pdf = await PDFDocument.load(Uint8Array.from(bytes));
    expect(pdf.getPageCount()).toBe(21);
    expect(pdf.getPage(0).getSize()).toEqual({ width: 612, height: 792 });
  });

  it("appends negotiated wording without changing the master pages", async () => {
    const bytes = await generateAgreementPdf({
      ...document,
      overrides: { indemnity: "<p>Replacement for {{franchisee_name}}.</p>" },
    });
    const pdf = await PDFDocument.load(Uint8Array.from(bytes));
    expect(pdf.getPageCount()).toBe(22);
  });

  it("embeds the authorised company signature image before sending", async () => {
    const signature = await readFile(path.join(process.cwd(), "public/logo-mark.png"));
    const unsigned = await generateAgreementPdf(document);
    const signed = await generateAgreementPdf(
      {
        ...document,
        franchisorSignaturePath: "private/company-signature.png",
        franchisorSignatureFileName: "company-signature.png",
      },
      Uint8Array.from(signature),
    );

    expect(signed.byteLength).toBeGreaterThan(unsigned.byteLength);
    const pdf = await PDFDocument.load(Uint8Array.from(signed));
    expect(pdf.getPageCount()).toBe(21);
  });
});
