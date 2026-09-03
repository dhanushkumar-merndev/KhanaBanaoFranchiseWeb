import { describe, expect, it } from "vitest";
import {
  buildAutofill,
  formatIndianNumber,
  mergeWithAutofill,
  rupeesInWords,
  type AutofillSource,
} from "@/lib/agreement/autofill";
import { AGREEMENT_CLAUSES } from "@/lib/agreement/clauses";
import { missingRequiredFields, pickKnownFields } from "@/lib/agreement/fields";
import { renderClauses, renderFullDocument } from "@/lib/agreement/render";

const source: AutofillSource = {
  lead: {
    full_name: "Ramesh Iyer",
    phone: "+919876543210",
    email: "ramesh@example.com",
    city: "Coimbatore",
    preferred_territory: "Coimbatore South",
  },
  application: {
    personal_details: { full_name: "R. Iyer", mobile: "+919000000000" },
    address_details: {
      current_address: "14 Race Course Road",
      city: "Coimbatore",
      state: "Tamil Nadu",
      pin_code: "641018",
    },
    business_details: { company_name: "Iyer Catering", gst_number: "33AAECI1234F1Z5" },
    franchise_details: {},
    approved_territory: "Coimbatore South",
    approved_investment: 500000,
  },
};

describe("rupeesInWords", () => {
  it("uses Indian place names", () => {
    expect(rupeesInWords(50_000)).toBe("Fifty Thousand");
    expect(rupeesInWords(200_000)).toBe("Two Lakh");
    expect(rupeesInWords(1_000_000)).toBe("Ten Lakh");
    expect(rupeesInWords(10_000_000)).toBe("One Crore");
  });

  it("joins the parts of an awkward amount", () => {
    expect(rupeesInWords(1_23_456)).toBe(
      "One Lakh Twenty Three Thousand Four Hundred Fifty Six",
    );
  });

  it("refuses nonsense rather than printing it on a contract", () => {
    expect(rupeesInWords(-1)).toBe("");
    expect(rupeesInWords(Number.NaN)).toBe("");
    expect(rupeesInWords(0)).toBe("Zero");
  });
});

describe("formatIndianNumber", () => {
  it("groups by two after the first three digits", () => {
    expect(formatIndianNumber(500)).toBe("500");
    expect(formatIndianNumber(50_000)).toBe("50,000");
    expect(formatIndianNumber(500_000)).toBe("5,00,000");
    expect(formatIndianNumber(10_000_000)).toBe("1,00,00,000");
  });
});

describe("buildAutofill", () => {
  it("prefers the application's answers over the lead's", () => {
    const values = buildAutofill(source);
    expect(values.franchisee_name).toBe("R. Iyer");
    expect(values.franchisee_phone).toBe("+919000000000");
  });

  it("falls back to the lead where the application is silent", () => {
    const values = buildAutofill(source);
    expect(values.franchisee_email).toBe("ramesh@example.com");
  });

  it("assembles one address line from the four parts", () => {
    expect(buildAutofill(source).franchisee_address).toBe(
      "14 Race Course Road, Coimbatore, Tamil Nadu, 641018",
    );
  });

  it("derives the tier from the approved investment", () => {
    expect(buildAutofill(source).selected_tier).toBe("Tier 3 — Corporate Events");
    expect(
      buildAutofill({
        ...source,
        application: { ...source.application!, approved_investment: 50_000 },
      }).selected_tier,
    ).toBe("Tier 1 — Small Events");
  });

  it("leaves the fee blank rather than guessing when nothing was approved", () => {
    const values = buildAutofill({
      ...source,
      application: { ...source.application!, approved_investment: null },
    });
    expect(values.franchise_fee_amount).toBe("");
    expect(values.franchise_fee_words).toBe("");
  });

  it("survives an application that was never filled in", () => {
    const values = buildAutofill({ lead: source.lead, application: null });
    expect(values.franchisee_name).toBe("Ramesh Iyer");
    expect(values.franchisee_pan_gst).toBe("");
  });

  it("tolerates a jsonb column holding something other than an object", () => {
    const values = buildAutofill({
      ...source,
      application: { ...source.application!, personal_details: "corrupt" },
    });
    expect(values.franchisee_name).toBe("Ramesh Iyer");
  });
});

describe("mergeWithAutofill", () => {
  it("keeps a staff correction over the autofilled value", () => {
    const merged = mergeWithAutofill({ franchisee_name: "Ramesh S. Iyer" }, source);
    expect(merged.franchisee_name).toBe("Ramesh S. Iyer");
  });

  it("keeps intentionally cleared values blank", () => {
    const merged = mergeWithAutofill({ franchisee_name: "" }, source);
    expect(merged.franchisee_name).toBe("");
    expect(merged.approved_territory).toBe("Coimbatore South");
  });
});

describe("renderClauses", () => {
  const values = buildAutofill(source);

  it("substitutes values into the clause text", () => {
    const parties = renderClauses(values).find((c) => c.id === "parties")!;
    expect(parties.filledHtml).toContain("R. Iyer");
    expect(parties.filledHtml).not.toContain("{{franchisee_name}}");
  });

  it("formats a date field as the document writes dates", () => {
    const parties = renderClauses({ ...values, agreement_date: "2026-08-12" }).find(
      (c) => c.id === "parties",
    )!;
    expect(parties.filledHtml).toContain("12 August 2026");
  });

  it("escapes values so an applicant cannot inject markup", () => {
    const rendered = renderClauses({
      ...values,
      franchisee_name: '<img src=x onerror="alert(1)">',
    }).find((c) => c.id === "parties")!;
    expect(rendered.filledHtml).not.toContain("<img");
    expect(rendered.filledHtml).toContain("&lt;img");
  });

  it("marks a blank rather than leaving the placeholder visible", () => {
    const rendered = renderClauses({ ...values, franchisee_pan_gst: "" }).find(
      (c) => c.id === "parties",
    )!;
    expect(rendered.filledHtml).toContain('class="blank"');
    expect(rendered.filledHtml).not.toContain("{{franchisee_pan_gst}}");
  });

  it("applies an override to the body but keeps the heading and number", () => {
    const rendered = renderClauses(values, {
      indemnity: "<p>Negotiated wording for {{franchisee_name}}.</p>",
    }).find((c) => c.id === "indemnity")!;

    expect(rendered.overridden).toBe(true);
    expect(rendered.heading).toBe("INDEMNITY");
    expect(rendered.number).toBe("24");
    expect(rendered.filledHtml).toContain("Negotiated wording for R. Iyer.");
  });

  it("renders every clause the document declares", () => {
    expect(renderClauses(values)).toHaveLength(AGREEMENT_CLAUSES.length);
  });

  it("uses the current logo in the header and both document watermarks", () => {
    const html = renderFullDocument(values, {}, {
      agreementNumber: "KB-AG01001",
      version: 1,
      documentVersion: "2026-08-30",
      franchiseeName: values.franchisee_name,
    });

    expect(html.match(/src="\/logo\.png"/g)).toHaveLength(2);
    expect(html).toContain("agreement/fcs-watermark.png");
    expect(html).toContain("document-watermarks");
    expect(html).toContain("@page { size: Letter portrait;");
    expect(html).toContain("agreement/header-source.jpg");
    expect(html).toContain("agreement/footer.jpg");
  });
});

describe("field validation", () => {
  it("reports the required fields still blank", () => {
    const missing = missingRequiredFields({});
    expect(missing.length).toBeGreaterThan(0);
    expect(missing.map((f) => f.key)).toContain("franchisee_name");
    // Witness details are filled at signing, not before sending.
    expect(missing.map((f) => f.key)).not.toContain("witness1_name");
  });

  it("passes once a full autofill is in place", () => {
    const values = buildAutofill(source);
    values.authorised_signatory = "S. Ranganathan";
    values.franchisor_signatory_name = "S. Ranganathan";
    values.franchisor_signatory_designation = "Managing Partner";
    expect(missingRequiredFields(values)).toEqual([]);
  });

  it("drops keys that are not declared fields", () => {
    const clean = pickKnownFields({
      franchisee_name: " Ramesh ",
      not_a_field: "x",
    });
    expect(clean.franchisee_name).toBe("Ramesh");
    expect(clean).not.toHaveProperty("not_a_field");
  });
});
