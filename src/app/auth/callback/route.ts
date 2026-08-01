import { NextResponse, type NextRequest } from "next/server";
import { normalizeEmail } from "@/lib/domain/normalize";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

/**
 * Google OAuth landing point.
 *
 * Access is invitation-only: a Google account gets in when it already has a
 * profile, or when there is a PENDING invitation for exactly that address.
 * Anything else is bounced to /unauthorized — signing in with Google is not
 * by itself permission to use the system.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next");

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=missing_code`);
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.user?.email) {
    return NextResponse.redirect(`${origin}/login?error=exchange_failed`);
  }

  const authUserId = data.user.id;
  const email = normalizeEmail(data.user.email);
  const admin = createAdminClient();

  // 1. Already-linked profile.
  const { data: linked } = await admin
    .from("profiles")
    .select("id, role, status")
    .eq("auth_user_id", authUserId)
    .maybeSingle();

  if (linked) {
    if (linked.status !== "ACTIVE") {
      await supabase.auth.signOut();
      return NextResponse.redirect(`${origin}/unauthorized?reason=inactive`);
    }
    return NextResponse.redirect(
      `${origin}${next ?? defaultHome(linked.role)}`,
    );
  }

  // 2. Profile created ahead of first sign-in (the bootstrap admin, or a
  //    member whose invitation was already converted) — link it now.
  const { data: byEmail } = await admin
    .from("profiles")
    .select("id, role, status, auth_user_id")
    .eq("email", email)
    .maybeSingle();

  if (byEmail) {
    if (byEmail.auth_user_id && byEmail.auth_user_id !== authUserId) {
      await supabase.auth.signOut();
      return NextResponse.redirect(`${origin}/unauthorized?reason=mismatch`);
    }
    if (byEmail.status !== "ACTIVE") {
      await supabase.auth.signOut();
      return NextResponse.redirect(`${origin}/unauthorized?reason=inactive`);
    }

    await admin
      .from("profiles")
      .update({ auth_user_id: authUserId })
      .eq("id", byEmail.id);

    return NextResponse.redirect(
      `${origin}${next ?? defaultHome(byEmail.role)}`,
    );
  }

  // 3. Pending invitation — create the member profile and close the invite.
  const { data: invitation } = await admin
    .from("member_invitations")
    .select("id, full_name, email, phone, status, expires_at, invited_by")
    .eq("email", email)
    .eq("status", "PENDING")
    .maybeSingle();

  if (!invitation) {
    await supabase.auth.signOut();
    return NextResponse.redirect(`${origin}/unauthorized?reason=not_invited`);
  }

  if (new Date(invitation.expires_at) < new Date()) {
    await admin
      .from("member_invitations")
      .update({ status: "EXPIRED" })
      .eq("id", invitation.id);
    await supabase.auth.signOut();
    return NextResponse.redirect(`${origin}/unauthorized?reason=expired`);
  }

  // The 20-active-member cap is enforced by a database trigger, so a race
  // between two invitees signing in at once still cannot exceed it.
  const { data: created, error: createError } = await admin
    .from("profiles")
    .insert({
      auth_user_id: authUserId,
      full_name: invitation.full_name,
      email,
      phone: invitation.phone,
      role: "MEMBER",
      status: "ACTIVE",
      created_by: invitation.invited_by,
    })
    .select("id, role")
    .single();

  if (createError || !created) {
    await supabase.auth.signOut();
    return NextResponse.redirect(`${origin}/unauthorized?reason=member_limit`);
  }

  await admin
    .from("member_invitations")
    .update({
      status: "ACCEPTED",
      accepted_at: new Date().toISOString(),
      accepted_by: created.id,
    })
    .eq("id", invitation.id);

  await admin.from("activity_logs").insert({
    actor_id: created.id,
    entity_type: "profile",
    entity_id: created.id,
    action: "MEMBER_JOINED",
    summary: `${invitation.full_name} accepted their invitation.`,
  });

  return NextResponse.redirect(`${origin}${next ?? "/member"}`);
}

function defaultHome(role: string) {
  return role === "ADMIN" ? "/admin" : "/member";
}
