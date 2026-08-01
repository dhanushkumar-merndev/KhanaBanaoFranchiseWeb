/** Input normalisation shared by the public form, manual entry and imports. */

/**
 * Reduce an Indian phone number to canonical `+91XXXXXXXXXX`.
 * Accepts `9876543210`, `09876543210`, `+91 98765 43210`, `91-9876543210`.
 * Anything that is not a recognisable 10-digit Indian mobile is returned
 * digit-only so the operator can still see what was typed.
 */
export function normalizePhone(input: string): string {
  const digits = input.replace(/\D/g, "");
  if (!digits) return "";

  let local = digits;
  if (local.length === 12 && local.startsWith("91")) local = local.slice(2);
  else if (local.length === 11 && local.startsWith("0")) local = local.slice(1);
  else if (local.length === 13 && local.startsWith("091")) local = local.slice(3);

  if (local.length === 10 && /^[6-9]/.test(local)) return `+91${local}`;
  return digits;
}

/** True for a canonical 10-digit Indian mobile in any of the accepted shapes. */
export function isValidIndianMobile(input: string): boolean {
  return /^\+91[6-9]\d{9}$/.test(normalizePhone(input));
}

/** Trim + lowercase. Gmail dots/plus tags are intentionally left alone. */
export function normalizeEmail(input: string): string {
  return input.trim().toLowerCase();
}

/** Collapse internal whitespace and trim — for names, cities, territories. */
export function normalizeText(input: string): string {
  return input.trim().replace(/\s+/g, " ");
}

/** Title Case for display, preserving already-uppercase tokens like GST. */
export function toTitleCase(input: string): string {
  return normalizeText(input)
    .split(" ")
    .map((word) =>
      word === word.toUpperCase() && word.length > 1
        ? word
        : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase(),
    )
    .join(" ");
}
