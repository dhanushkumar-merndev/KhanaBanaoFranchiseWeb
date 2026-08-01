/**
 * Seed the first ADMIN profile(s).
 *
 * There is no sign-up: /auth/callback only admits a Google account that
 * already matches a profile row or a pending invitation. So the very first
 * administrator has to be inserted out of band — this script is that step.
 *
 * The row is created with auth_user_id = null. The first Google sign-in with
 * a matching email links the two together.
 *
 *   node scripts/bootstrap-admin.mjs "you@gmail.com" "Your Name" [phone]
 *
 * Safe to re-run: an existing profile is reported and left alone.
 */
import { readFileSync } from "node:fs";

const env = readFileSync(".env", "utf8");
const get = (key) => {
  const match = new RegExp(`^\\s*${key}\\s*=\\s*(.+)$`, "m").exec(env);
  return match ? match[1].trim().replace(/^["']|["']$/g, "") : null;
};

const url = get("NEXT_PUBLIC_SUPABASE_URL");
const serviceKey = get("SUPABASE_SERVICE_ROLE_KEY");

if (!url || !serviceKey) {
  console.error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env");
  process.exit(1);
}

const [email, fullName, phone] = process.argv.slice(2);

if (!email || !fullName) {
  console.error('Usage: node scripts/bootstrap-admin.mjs "you@gmail.com" "Your Name" [phone]');
  process.exit(1);
}

const headers = {
  apikey: serviceKey,
  Authorization: `Bearer ${serviceKey}`,
  "content-type": "application/json",
};

const normalizedEmail = email.trim().toLowerCase();

const existing = await fetch(
  `${url}/rest/v1/profiles?select=id,email,role,status&email=eq.${encodeURIComponent(normalizedEmail)}`,
  { headers },
).then((r) => r.json());

if (Array.isArray(existing) && existing.length > 0) {
  const profile = existing[0];
  console.log(
    `Already present: ${profile.email} (${profile.role}, ${profile.status}) — left unchanged.`,
  );
  process.exit(0);
}

const res = await fetch(`${url}/rest/v1/profiles`, {
  method: "POST",
  headers: { ...headers, Prefer: "return=representation" },
  body: JSON.stringify({
    full_name: fullName.trim().replace(/\s+/g, " "),
    email: normalizedEmail,
    phone: phone ? phone.trim() : null,
    role: "ADMIN",
    status: "ACTIVE",
  }),
});

if (!res.ok) {
  console.error(`Failed (${res.status}):`, (await res.text()).slice(0, 400));
  process.exit(1);
}

const [created] = await res.json();
console.log(`Created ADMIN profile for ${created.email}.`);
console.log("Sign in at /login with that exact Google account to link it.");
