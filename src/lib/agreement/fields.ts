/**
 * The fill-in blanks of the franchise agreement.
 *
 * The PDF this was transcribed from carries these as underscore rules that
 * somebody completes by hand before execution. Here each one is a named field
 * so it can be pre-filled from what the applicant already told us, corrected
 * by staff, and substituted into the clause text at render time.
 *
 * Sections mirror the document's own structure rather than the database's, so
 * the editor reads in the same order as the agreement it produces.
 */

export type FieldType = "text" | "textarea" | "date" | "money" | "percent" | "select";

export type FieldDef = {
  key: string;
  label: string;
  type: FieldType;
  /** Choices for `select`. */
  options?: readonly string[];
  /** Shown under the input — say where a value came from, or how to phrase it. */
  hint?: string;
  /** Blocks "mark as sent" while empty. Witness details are not required. */
  required?: boolean;
};

export type FieldSection = {
  id: string;
  title: string;
  /** Which clause this section fills, for the "jump to" link in the editor. */
  clauseId: string;
  fields: readonly FieldDef[];
};

export const AGREEMENT_SECTIONS: readonly FieldSection[] = [
  {
    id: "parties",
    title: "Parties and effective date",
    clauseId: "parties",
    fields: [
      {
        key: "agreement_date",
        label: "Agreement date",
        type: "date",
        required: true,
        hint: "The date written into clause 1 and the execution block.",
      },
      {
        key: "execution_place",
        label: "Place of execution",
        type: "text",
        required: true,
        hint: "City where the agreement is signed.",
      },
      { key: "franchisee_name", label: "Franchisee name", type: "text", required: true },
      {
        key: "franchisee_address",
        label: "Franchisee address",
        type: "textarea",
        required: true,
      },
      {
        key: "franchisee_pan_gst",
        label: "PAN / GST",
        type: "text",
        required: true,
        hint: "GSTIN comes from the application. Add the PAN if the applicant is not GST-registered.",
      },
      { key: "franchisee_phone", label: "Phone", type: "text", required: true },
      { key: "franchisee_email", label: "Email", type: "text", required: true },
    ],
  },
  {
    id: "commercials",
    title: "Commercial terms",
    clauseId: "schedule_a",
    fields: [
      {
        key: "effective_date",
        label: "Effective date",
        type: "date",
        required: true,
        hint: "The one-year initial term in clause 5 runs from this date.",
      },
      {
        key: "franchisee_legal_name",
        label: "Franchisee legal name",
        type: "text",
        required: true,
        hint: "The registered business name, if it differs from the personal name.",
      },
      {
        key: "selected_tier",
        label: "Selected tier",
        type: "select",
        required: true,
        options: [
          "Tier 1 — Small Events",
          "Tier 2 — Mid-Scale Events",
          "Tier 3 — Corporate Events",
          "Tier 4 — VIP Events",
        ],
      },
      {
        key: "approved_territory",
        label: "Approved territory",
        type: "text",
        required: true,
      },
      {
        key: "territory_status",
        label: "Territory status",
        type: "select",
        required: true,
        options: ["Protected", "Non-exclusive", "Other conditions as agreed"],
      },
      {
        key: "franchise_fee_amount",
        label: "Franchise fee",
        type: "money",
        required: true,
        hint: "Appears in clause 6 and in Schedule A.",
      },
      {
        key: "franchise_fee_words",
        label: "Franchise fee in words",
        type: "text",
        required: true,
        hint: "Filled in automatically from the amount — check it before sending.",
      },
      {
        key: "royalty_percent",
        label: "Applicable royalty",
        type: "percent",
        required: true,
        hint: "The model allows 8% to 10% of Gross Revenue.",
      },
      { key: "payment_cycle", label: "Payment cycle", type: "text", required: true },
      {
        key: "marketing_contribution",
        label: "Marketing contribution",
        type: "text",
        required: true,
        hint: "Either “Included” or “Separate: 2%”.",
      },
      {
        key: "security_deposit",
        label: "Security deposit",
        type: "text",
        required: true,
        hint: "An amount, or NIL.",
      },
      { key: "training_terms", label: "Training", type: "text", required: true },
      {
        key: "renewal_fee",
        label: "Renewal fee",
        type: "text",
        required: true,
        hint: "An amount, NIL, or “As agreed”.",
      },
      { key: "cure_period", label: "Cure period", type: "text", required: true },
      { key: "arbitration_seat", label: "Arbitration seat", type: "text", required: true },
      {
        key: "authorised_signatory",
        label: "Authorised franchisor signatory",
        type: "text",
        required: true,
      },
    ],
  },
  {
    id: "signatures",
    title: "Signatures and witnesses",
    clauseId: "signatures",
    fields: [
      {
        key: "franchisor_signatory_name",
        label: "Franchisor signatory name",
        type: "text",
        required: true,
      },
      {
        key: "franchisor_signatory_designation",
        label: "Franchisor designation",
        type: "text",
        required: true,
      },
      { key: "franchisor_sign_date", label: "Franchisor date", type: "date" },
      { key: "franchisor_sign_place", label: "Franchisor place", type: "text" },
      {
        key: "franchisee_signatory_name",
        label: "Franchisee signatory name",
        type: "text",
        required: true,
      },
      {
        key: "franchisee_signatory_designation",
        label: "Franchisee designation",
        type: "text",
        hint: "“Proprietor”, “Partner”, “Director” — or leave blank for an individual.",
      },
      { key: "franchisee_sign_date", label: "Franchisee date", type: "date" },
      { key: "franchisee_sign_place", label: "Franchisee place", type: "text" },
      { key: "witness1_name", label: "Witness 1 name", type: "text" },
      { key: "witness1_address", label: "Witness 1 address", type: "textarea" },
      { key: "witness1_contact", label: "Witness 1 contact", type: "text" },
      { key: "witness2_name", label: "Witness 2 name", type: "text" },
      { key: "witness2_address", label: "Witness 2 address", type: "textarea" },
      { key: "witness2_contact", label: "Witness 2 contact", type: "text" },
    ],
  },
];

export const AGREEMENT_FIELDS: readonly FieldDef[] = AGREEMENT_SECTIONS.flatMap(
  (section) => section.fields,
);

export const FIELD_BY_KEY = new Map(
  AGREEMENT_FIELDS.map((field) => [field.key, field] as const),
);

export type AgreementFieldValues = Record<string, string>;

/**
 * Fields that must carry a value before the agreement can go to the customer.
 * Witness details are deliberately not required — they are filled at signing.
 */
export function missingRequiredFields(
  values: AgreementFieldValues,
): FieldDef[] {
  return AGREEMENT_FIELDS.filter(
    (field) => field.required && !values[field.key]?.trim(),
  );
}

/** Drops unknown keys, so a stale saved blob cannot inject placeholders. */
export function pickKnownFields(
  input: Record<string, unknown>,
): AgreementFieldValues {
  const clean: AgreementFieldValues = {};
  for (const field of AGREEMENT_FIELDS) {
    const value = input[field.key];
    if (typeof value === "string") clean[field.key] = value.trim();
  }
  return clean;
}
