import "server-only";

import { readFile } from "node:fs/promises";
import path from "node:path";
import {
  PDFDocument,
  PDFPage,
  StandardFonts,
  grayscale,
  rgb,
  type PDFFont,
} from "pdf-lib";
import { renderClauses } from "./render";
import type { AgreementDocument } from "@/lib/data/agreement-document";
import type { EmailAttachment } from "@/lib/email/attachments";

const TEMPLATE_PATH = "public/Khana-banao-Franchise-Master.pdf";
const PAGE_WIDTH = 612;
const PAGE_HEIGHT = 792;

function printable(value: string): string {
  return value
    .replaceAll("₹", "Rs. ")
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, "-")
    .replaceAll("•", "*")
    .replace(/[^\x20-\x7E\n]/g, " ")
    .replace(/[ \t]+/g, " ")
    .trim();
}

function presentDate(value: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return printable(value);
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return printable(value);
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

type Placement = {
  key: string;
  page: number;
  x: number;
  y: number;
  width: number;
  size?: number;
  bold?: boolean;
  date?: boolean;
  erase?: { x: number; y: number; width: number; height: number };
};

/** Coordinates are points in the approved 612 x 792 Letter master PDF. */
const FIELD_PLACEMENTS: readonly Placement[] = [
  { key: "$agreement_number", page: 0, x: 101, y: 554, width: 145, bold: true, erase: { x: 99, y: 551, width: 150, height: 12 } },
  { key: "$version", page: 0, x: 101, y: 544, width: 70, bold: true, erase: { x: 99, y: 541, width: 75, height: 12 } },
  { key: "franchisee_name", page: 0, x: 101, y: 533, width: 200, bold: true, erase: { x: 99, y: 530, width: 210, height: 12 } },
  { key: "agreement_date", page: 0, x: 289, y: 485, width: 105, date: true },
  { key: "execution_place", page: 0, x: 411, y: 485, width: 105 },
  { key: "franchisee_name", page: 0, x: 157, y: 329, width: 395, bold: true },
  { key: "franchisee_address", page: 0, x: 157, y: 311, width: 395, bold: true },
  { key: "franchisee_pan_gst", page: 0, x: 157, y: 292, width: 395, bold: true },
  { key: "franchisee_phone", page: 0, x: 157, y: 273, width: 395, bold: true },
  { key: "franchisee_email", page: 0, x: 157, y: 254, width: 395, bold: true },
  { key: "franchise_fee_amount", page: 2, x: 69, y: 329, width: 235, size: 12, bold: true },
  { key: "franchise_fee_words", page: 2, x: 96, y: 310, width: 300 },
  { key: "effective_date", page: 17, x: 315, y: 258, width: 230, date: true },
  { key: "franchisee_legal_name", page: 17, x: 315, y: 237, width: 230 },
  { key: "selected_tier", page: 17, x: 315, y: 216, width: 230 },
  { key: "approved_territory", page: 17, x: 315, y: 195, width: 230 },
  { key: "territory_status", page: 17, x: 315, y: 174, width: 230 },
  { key: "franchise_fee_amount", page: 17, x: 323, y: 153, width: 220 },
  { key: "royalty_percent", page: 17, x: 315, y: 132, width: 65 },
  { key: "payment_cycle", page: 18, x: 315, y: 604, width: 230 },
  { key: "marketing_contribution", page: 18, x: 315, y: 583, width: 230 },
  { key: "security_deposit", page: 18, x: 315, y: 562, width: 230 },
  { key: "training_terms", page: 18, x: 315, y: 541, width: 230 },
  { key: "renewal_fee", page: 18, x: 315, y: 520, width: 230 },
  { key: "cure_period", page: 18, x: 315, y: 499, width: 230 },
  { key: "arbitration_seat", page: 18, x: 315, y: 478, width: 230 },
  { key: "authorised_signatory", page: 18, x: 315, y: 457, width: 230 },
  { key: "franchisor_signatory_name", page: 20, x: 130, y: 597, width: 165 },
  { key: "franchisee_signatory_name", page: 20, x: 386, y: 597, width: 165 },
  { key: "franchisor_signatory_designation", page: 20, x: 130, y: 578, width: 165 },
  { key: "franchisee_signatory_designation", page: 20, x: 386, y: 578, width: 165 },
  { key: "franchisor_sign_date", page: 20, x: 130, y: 514, width: 165, date: true },
  { key: "franchisee_sign_date", page: 20, x: 386, y: 514, width: 165, date: true },
  { key: "franchisor_sign_place", page: 20, x: 130, y: 494, width: 165 },
  { key: "franchisee_sign_place", page: 20, x: 386, y: 494, width: 165 },
  { key: "witness1_name", page: 20, x: 130, y: 390, width: 165 },
  { key: "witness2_name", page: 20, x: 386, y: 390, width: 165 },
  { key: "witness1_address", page: 20, x: 130, y: 371, width: 165 },
  { key: "witness2_address", page: 20, x: 386, y: 371, width: 165 },
  { key: "witness1_contact", page: 20, x: 130, y: 351, width: 165 },
  { key: "witness2_contact", page: 20, x: 386, y: 351, width: 165 },
  { key: "execution_place", page: 20, x: 156, y: 271, width: 395 },
  { key: "agreement_date", page: 20, x: 156, y: 252, width: 395, date: true },
] as const;

function drawValue(page: PDFPage, value: string, placement: Placement, regular: PDFFont, bold: PDFFont) {
  const text = printable(placement.date ? presentDate(value) : value);
  if (!text) return;
  if (placement.erase) page.drawRectangle({ ...placement.erase, color: rgb(1, 1, 1) });
  const font = placement.bold ? bold : regular;
  let size = placement.size ?? 8.2;
  while (size > 5.5 && font.widthOfTextAtSize(text, size) > placement.width) size -= 0.25;
  page.drawText(text, { x: placement.x, y: placement.y, size, font, color: grayscale(0.08) });
}

function htmlToPlainText(html: string): string {
  return printable(
    html.replace(/<br\s*\/?>/gi, "\n").replace(/<\/p>/gi, "\n")
      .replace(/<\/li>/gi, "\n").replace(/<li[^>]*>/gi, "* ")
      .replace(/<[^>]+>/g, "").replaceAll("&amp;", "&")
      .replaceAll("&quot;", '"').replaceAll("&#39;", "'").replaceAll("&nbsp;", " "),
  );
}

function wrap(text: string, font: PDFFont, size: number, width: number): string[] {
  const lines: string[] = [];
  for (const paragraph of text.split("\n")) {
    const words = paragraph.split(/\s+/).filter(Boolean);
    let line = "";
    for (const word of words) {
      const candidate = line ? `${line} ${word}` : word;
      if (line && font.widthOfTextAtSize(candidate, size) > width) {
        lines.push(line);
        line = word;
      } else line = candidate;
    }
    if (line) lines.push(line);
  }
  return lines;
}

async function appendOverrides(pdf: PDFDocument, document: AgreementDocument, regular: PDFFont, bold: PDFFont) {
  const clauses = renderClauses(document.values, document.overrides).filter((clause) => clause.overridden);
  if (!clauses.length) return;
  const source = pdf.getPage(1);
  let page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);

  const beginPage = async (target: PDFPage) => {
    const embedded = await pdf.embedPage(source);
    target.drawPage(embedded, { x: 0, y: 0, width: PAGE_WIDTH, height: PAGE_HEIGHT });
    target.drawRectangle({ x: 45, y: 105, width: 522, height: 565, color: rgb(1, 1, 1) });
    target.drawText("NEGOTIATED CLAUSE REPLACEMENTS", { x: 56, y: 640, size: 11, font: bold, color: grayscale(0.08) });
    target.drawText("The wording below replaces the corresponding numbered clause in this agreement.", { x: 56, y: 622, size: 8, font: regular, color: grayscale(0.18) });
  };

  await beginPage(page);
  let y = 594;
  for (const clause of clauses) {
    const heading = `${clause.number ? `${clause.number}. ` : ""}${printable(clause.heading)}`;
    const lines = wrap(htmlToPlainText(clause.filledHtml), regular, 8, 500);
    if (y - (22 + lines.length * 11) < 125) {
      page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      await beginPage(page);
      y = 594;
    }
    page.drawText(heading, { x: 56, y, size: 9, font: bold, color: grayscale(0.08) });
    y -= 15;
    for (const line of lines) {
      page.drawText(line, { x: 56, y, size: 8, font: regular, color: grayscale(0.12) });
      y -= 11;
    }
    y -= 9;
  }
}

/** Fill the approved public PDF itself, preserving its exact branded pages. */
export async function generateAgreementPdf(
  document: AgreementDocument,
): Promise<Buffer> {
  const template = await readFile(path.join(process.cwd(), TEMPLATE_PATH));
  // Vitest/JSDOM and some serverless runtimes create Buffer in a different JS
  // realm. Copy to a plain Uint8Array so pdf-lib's strict type guard accepts it.
  const pdf = await PDFDocument.load(Uint8Array.from(template));
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const pages = pdf.getPages();
  const special: Record<string, string> = {
    $agreement_number: document.agreementNumber,
    $version: `v${document.version}`,
  };
  for (const placement of FIELD_PLACEMENTS) {
    const page = pages[placement.page];
    if (!page) throw new Error("The agreement master has an unexpected page count.");
    const value = placement.key.startsWith("$") ? special[placement.key] : document.values[placement.key];
    drawValue(page, value ?? "", placement, regular, bold);
  }
  await appendOverrides(pdf, document, regular, bold);
  return Buffer.from(await pdf.save());
}

export async function agreementPdfAttachment(
  document: AgreementDocument,
): Promise<EmailAttachment> {
  const pdf = await generateAgreementPdf(document);
  return {
    name: `${document.agreementNumber}.pdf`,
    content: pdf.toString("base64"),
  };
}
