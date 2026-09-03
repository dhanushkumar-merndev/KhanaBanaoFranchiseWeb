/**
 * Environment access.
 *
 * Reads are lazy on purpose: the public landing page must render on a machine
 * with no Supabase or Brevo credentials configured yet. Anything that actually
 * needs a secret calls the matching getter and fails loudly at that point.
 */

function required(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(
      `Missing environment variable ${name}. Add it to .env.local — see .env.example.`,
    );
  }
  return value;
}

export const appUrl =
  process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "http://localhost:3000";

/**
 * Absolute origin for images embedded in outgoing email.
 *
 * Mail clients fetch these long after the send, from outside our network, so a
 * localhost `appUrl` would render a broken logo in every dev-sent email. Fall
 * back to the public site in that case.
 */
export const emailAssetBaseUrl = appUrl.startsWith("http://localhost")
  ? "https://www.khanabanaopartner.com"
  : appUrl;

export function supabaseUrl() {
  return required("NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL);
}

export function supabasePublishableKey() {
  return required(
    "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  );
}

export function supabaseServiceRoleKey() {
  return required(
    "SUPABASE_SERVICE_ROLE_KEY",
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  );
}

export function brevoApiKey() {
  return required("BREVO_API_KEY", process.env.BREVO_API_KEY);
}

export function brevoSender() {
  return {
    email: required("BREVO_SENDER_EMAIL", process.env.BREVO_SENDER_EMAIL),
    name: process.env.BREVO_SENDER_NAME ?? "KHANA BANAO Franchise Team",
  };
}

export function applicationTokenSecret() {
  return required(
    "APPLICATION_TOKEN_SECRET",
    process.env.APPLICATION_TOKEN_SECRET,
  );
}

export function documentTokenSecret() {
  return required("DOCUMENT_TOKEN_SECRET", process.env.DOCUMENT_TOKEN_SECRET);
}

/** True when Supabase is wired up — used to degrade gracefully in dev. */
export const isSupabaseConfigured = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
);

export const isBrevoConfigured = Boolean(
  process.env.BREVO_API_KEY && process.env.BREVO_SENDER_EMAIL,
);
