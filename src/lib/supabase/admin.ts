import "server-only";

import { createClient } from "@supabase/supabase-js";
import { supabaseServiceRoleKey, supabaseUrl } from "@/lib/env";
import type { Database } from "./types";

let adminClient: ReturnType<typeof createClient<Database>> | null = null;

/**
 * Service-role client. Bypasses RLS, so it is only for paths where there is
 * no authenticated user to act as:
 *
 *   - the public enquiry form creating a lead
 *   - token-authenticated applicant pages (application + document upload)
 *   - signing storage URLs
 *   - writing email logs when a send fails
 *
 * Every caller must do its own authorisation check first.
 */
export function createAdminClient() {
  if (!adminClient) {
    adminClient = createClient<Database>(supabaseUrl(), supabaseServiceRoleKey(), {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }
  return adminClient;
}
