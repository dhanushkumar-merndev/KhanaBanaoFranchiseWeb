import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { ProfileRow } from "@/lib/supabase/types";

export type SessionProfile = Pick<
  ProfileRow,
  "id" | "full_name" | "email" | "phone" | "role" | "status"
> & {
  avatar_url?: string | null;
};

/**
 * The signed-in staff profile, or null.
 *
 * `cache` dedupes this across a single render pass, so a layout, a page and
 * three server components all share one round trip.
 */
const getSessionProfile = cache(
  async (): Promise<SessionProfile | null> => {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return null;

    const { data: profile } = await supabase
      .from("profiles")
      .select("id, full_name, email, phone, role, status")
      .eq("auth_user_id", user.id)
      .maybeSingle();

    if (!profile || profile.status !== "ACTIVE") return null;

    const avatar_url =
      (user.user_metadata?.avatar_url as string | undefined) ??
      (user.user_metadata?.picture as string | undefined) ??
      null;

    return {
      ...profile,
      avatar_url,
    };
  },
);

/** Redirects to /login when there is no active staff profile. */
export async function requireProfile(): Promise<SessionProfile> {
  const profile = await getSessionProfile();
  if (!profile) redirect("/login");
  return profile;
}

/** Redirects members away from admin-only surfaces. */
export async function requireAdmin(): Promise<SessionProfile> {
  const profile = await requireProfile();
  if (profile.role !== "ADMIN") redirect("/unauthorized");
  return profile;
}
