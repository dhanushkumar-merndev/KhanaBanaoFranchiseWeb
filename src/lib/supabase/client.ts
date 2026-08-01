"use client";

import { createBrowserClient } from "@supabase/ssr";
import { supabasePublishableKey, supabaseUrl } from "@/lib/env";
import type { Database } from "./types";

let browserClient: ReturnType<typeof createBrowserClient<Database>> | null = null;

/** Singleton browser client — used for Google sign-in and realtime. */
export function createClient() {
  if (!browserClient) {
    browserClient = createBrowserClient<Database>(
      supabaseUrl(),
      supabasePublishableKey(),
    );
  }
  return browserClient;
}
