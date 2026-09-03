import { AGREEMENT_FIELDS, type AgreementFieldValues } from "./fields";

/**
 * Pre-fill the agreement from what the applicant already told us.
 *
 * Everything here is a *starting point*: staff can change any of it before the
 * agreement goes out. Where the application gives us nothing, the field is
 * left empty rather than guessed — a wrong PAN on a signed contract is worse
 * than a blank one somebody has to notice.
 */

/** The shapes read out of `applications`, all optional — forms get abandoned. */
export type AutofillSource = {
  lead: {
    full_name: string;
    phone: string;
    email: string;
    city: string;
    preferred_territory: string | null;
  };
  application: {
    // Typed loosely on purpose: these are jsonb columns whose shape is only a
    // convention, and a half-finished form leaves any of them as `{}`.
    personal_details: unknown;
    address_details: unknown;
    business_details: unknown;
    franchise_details: unknown;
    approved_territory: string | null;
    approved_investment: number | string | null;
  } | null;
};

/** Reads one string out of a jsonb blob, tolerating any other shape. */
function str(source: unknown, key: string): string {
  if (!source || typeof source !== "object" || Array.isArray(source)) return "";
  const value = (source as Record<string, unknown>)[key];
  return typeof value === "string" ? value.trim() : "";
}

const ONES = [
  "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
  "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
  "Seventeen", "Eighteen", "Nineteen",
];
const TENS = [
  "", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety",
];

function twoDigits(value: number): string {
  if (value < 20) return ONES[value];
  const tens = TENS[Math.floor(value / 10)];
  const ones = ONES[value % 10];
  return ones ? `${tens} ${ones}` : tens;
}

/**
 * Rupees in words, Indian numbering (crore / lakh / thousand / hundred).
 *
 * The agreement prints "(Rupees ... only)" under the franchise fee, and that
 * line is the one a court reads if the digits are ever disputed.
 */
export function rupeesInWords(amount: number): string {
  if (!Number.isFinite(amount) || amount < 0) return "";
  const whole = Math.floor(amount);
  if (whole === 0) return "Zero";

  const parts: string[] = [];
  const crore = Math.floor(whole / 10_000_000);
  const lakh = Math.floor((whole % 10_000_000) / 100_000);
  const thousand = Math.floor((whole % 100_000) / 1_000);
  const hundred = Math.floor((whole % 1_000) / 100);
  const rest = whole % 100;

  if (crore) parts.push(`${twoDigits(crore)} Crore`);
  if (lakh) parts.push(`${twoDigits(lakh)} Lakh`);
  if (thousand) parts.push(`${twoDigits(thousand)} Thousand`);
  if (hundred) parts.push(`${ONES[hundred]} Hundred`);
  if (rest) parts.push(twoDigits(rest));

  return parts.join(" ");
}

/** `50000` -> `50,000` in the Indian grouping the document uses. */
export function formatIndianNumber(amount: number): string {
  if (!Number.isFinite(amount)) return "";
  const whole = Math.floor(amount).toString();
  if (whole.length <= 3) return whole;
  const last3 = whole.slice(-3);
  const rest = whole.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ",");
  return `${rest},${last3}`;
}

/** Investment amount -> the tier label used in Schedule A. */
function tierFor(amount: number | null): string {
  if (amount === null) return "";
  if (amount >= 1_000_000) return "Tier 4 — VIP Events";
  if (amount >= 500_000) return "Tier 3 — Corporate Events";
  if (amount >= 200_000) return "Tier 2 — Mid-Scale Events";
  if (amount > 0) return "Tier 1 — Small Events";
  return "";
}

function toAmount(value: number | string | null | undefined): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value !== "string") return null;
  const digits = value.replace(/[^\d.]/g, "");
  if (!digits) return null;
  const parsed = Number(digits);
  return Number.isFinite(parsed) ? parsed : null;
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export function buildAutofill(source: AutofillSource): AgreementFieldValues {
  const { lead, application } = source;
  const personal = application?.personal_details;
  const address = application?.address_details;
  const business = application?.business_details;
  const franchise = application?.franchise_details;

  const fullName = str(personal, "full_name") || lead.full_name;
  const city = str(address, "city") || lead.city;
  const companyName = str(business, "company_name");
  const fee = toAmount(application?.approved_investment);

  const addressLine = [
    str(address, "current_address"),
    city,
    str(address, "state"),
    str(address, "pin_code"),
  ]
    .filter(Boolean)
    .join(", ");

  const values: AgreementFieldValues = {
    // Parties
    agreement_date: today(),
    execution_place: city,
    franchisee_name: fullName,
    franchisee_address: addressLine,
    franchisee_pan_gst: str(business, "gst_number"),
    franchisee_phone: str(personal, "mobile") || lead.phone,
    franchisee_email: str(personal, "email") || lead.email,

    // Commercials
    effective_date: today(),
    franchisee_legal_name: companyName || fullName,
    selected_tier: tierFor(fee),
    approved_territory:
      application?.approved_territory ||
      str(franchise, "preferred_territory") ||
      lead.preferred_territory ||
      "",
    territory_status: "Protected",
    franchise_fee_amount: fee === null ? "" : formatIndianNumber(fee),
    franchise_fee_words: fee === null ? "" : rupeesInWords(fee),
    royalty_percent: "8",
    payment_cycle: "Monthly",
    marketing_contribution: "Included",
    security_deposit: "NIL",
    training_terms: "Up to 7-day initial team training",
    renewal_fee: "As agreed",
    cure_period: "15 days unless serious/immediate termination event",
    arbitration_seat: "Bengaluru, Karnataka",
    authorised_signatory: "",

    // Signatures — the franchisor side and the witnesses are filled at signing.
    franchisor_signatory_name: "",
    franchisor_signatory_designation: "",
    franchisor_sign_date: "",
    franchisor_sign_place: "Bengaluru, Karnataka",
    franchisee_signatory_name: fullName,
    franchisee_signatory_designation: companyName ? "Proprietor" : "",
    franchisee_sign_date: "",
    franchisee_sign_place: city,
    witness1_name: "",
    witness1_address: "",
    witness1_contact: "",
    witness2_name: "",
    witness2_address: "",
    witness2_contact: "",
  };

  // Guarantee every declared field exists, so the editor never renders an
  // uncontrolled input and the renderer never meets an undefined.
  for (const field of AGREEMENT_FIELDS) {
    values[field.key] ??= "";
  }

  return values;
}

/**
 * Saved values win, including an intentionally cleared value. Only keys that
 * have never been saved are filled from the application. This distinction is
 * important in an editable legal document: removing an incorrect GST number
 * must not make the old application value silently reappear after refresh.
 */
export function mergeWithAutofill(
  saved: AgreementFieldValues,
  source: AutofillSource,
): AgreementFieldValues {
  const defaults = buildAutofill(source);
  const merged: AgreementFieldValues = { ...defaults };
  for (const [key, value] of Object.entries(saved)) {
    if (typeof value === "string") merged[key] = value;
  }
  return merged;
}
