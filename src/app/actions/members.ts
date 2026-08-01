"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/session";
import { MAX_ACTIVE_MEMBERS } from "@/lib/domain/enums";
import { normalizeEmail, normalizePhone, normalizeText } from "@/lib/domain/normalize";
import { sendTemplateEmail } from "@/lib/email/send";
import { appUrl } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  inviteMemberSchema,
  type ActionResult,
  type InviteMemberInput,
} from "@/lib/validation/member";

function fieldErrorsFrom(issues: { path: PropertyKey[]; message: string }[]) {
  const errors: Record<string, string> = {};
  for (const issue of issues) {
    const key = issue.path.join(".");
    if (key && !errors[key]) errors[key] = issue.message;
  }
  return errors;
}

/** Active MEMBER count — the 20 cap ignores admins and inactive members. */
export async function countActiveMembers(): Promise<number> {
  const { count } = await createAdminClient()
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("role", "MEMBER")
    .eq("status", "ACTIVE");
  return count ?? 0;
}

export async function inviteMember(
  input: InviteMemberInput,
): Promise<ActionResult<{ email: string; emailSent: boolean }>> {
  const admin = await requireAdmin();

  const parsed = inviteMemberSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      message: "Please check the highlighted fields.",
      fieldErrors: fieldErrorsFrom(parsed.error.issues),
    };
  }

  const supabase = createAdminClient();
  const email = normalizeEmail(parsed.data.email);
  const fullName = normalizeText(parsed.data.fullName);
  const phone = normalizePhone(parsed.data.phone);

  // The database trigger is the real guard; this check produces a friendly
  // message before we bother creating an invitation.
  const active = await countActiveMembers();
  if (active >= MAX_ACTIVE_MEMBERS) {
    return {
      ok: false,
      message: `There are already ${MAX_ACTIVE_MEMBERS} active members. Deactivate someone before inviting another.`,
    };
  }

  const { data: existingProfile } = await supabase
    .from("profiles")
    .select("id, status")
    .eq("email", email)
    .maybeSingle();

  if (existingProfile) {
    return {
      ok: false,
      message:
        existingProfile.status === "ACTIVE"
          ? "That email already belongs to an active team member."
          : "That email belongs to a deactivated member. Reactivate them instead of inviting again.",
      fieldErrors: { email: "Already in use" },
    };
  }

  const { data: pending } = await supabase
    .from("member_invitations")
    .select("id")
    .eq("email", email)
    .eq("status", "PENDING")
    .maybeSingle();

  if (pending) {
    return {
      ok: false,
      message: "An invitation is already pending for that email.",
      fieldErrors: { email: "Invitation already sent" },
    };
  }

  const token = randomBytes(24).toString("base64url");

  const { data: invitation, error } = await supabase
    .from("member_invitations")
    .insert({
      full_name: fullName,
      email,
      phone,
      token,
      status: "PENDING",
      invited_by: admin.id,
    })
    .select("id, email, full_name")
    .single();

  if (error || !invitation) {
    return {
      ok: false,
      message: error?.message ?? "Could not create the invitation.",
    };
  }

  const result = await sendTemplateEmail({
    templateKey: "MEMBER_INVITATION",
    to: { email: invitation.email, name: invitation.full_name },
    vars: {
      applicant_name: invitation.full_name,
      application_link: `${appUrl}/login`,
    },
    triggeredBy: admin.id,
  });

  await supabase.from("activity_logs").insert({
    actor_id: admin.id,
    entity_type: "member_invitation",
    entity_id: invitation.id,
    action: "MEMBER_INVITED",
    summary: `Invited ${fullName} (${email}).`,
  });

  revalidatePath("/admin/members");

  return {
    ok: true,
    data: { email: invitation.email, emailSent: result.status === "SENT" },
  };
}

export async function setMemberStatus(
  profileId: string,
  status: "ACTIVE" | "INACTIVE",
): Promise<ActionResult> {
  const admin = await requireAdmin();
  const supabase = createAdminClient();

  const { data: target } = await supabase
    .from("profiles")
    .select("id, full_name, role, status")
    .eq("id", profileId)
    .maybeSingle();

  if (!target) return { ok: false, message: "That member no longer exists." };

  if (target.role === "ADMIN" && target.id === admin.id && status === "INACTIVE") {
    return { ok: false, message: "You cannot deactivate your own admin account." };
  }

  if (status === "ACTIVE" && target.role === "MEMBER") {
    const active = await countActiveMembers();
    if (active >= MAX_ACTIVE_MEMBERS) {
      return {
        ok: false,
        message: `There are already ${MAX_ACTIVE_MEMBERS} active members. Deactivate someone else first.`,
      };
    }
  }

  const { error } = await supabase
    .from("profiles")
    .update({ status })
    .eq("id", profileId);

  if (error) return { ok: false, message: error.message };

  await supabase.from("activity_logs").insert({
    actor_id: admin.id,
    entity_type: "profile",
    entity_id: profileId,
    action: status === "ACTIVE" ? "MEMBER_ACTIVATED" : "MEMBER_DEACTIVATED",
    summary: `${target.full_name} was ${status === "ACTIVE" ? "activated" : "deactivated"}.`,
  });

  revalidatePath("/admin/members");
  return { ok: true };
}

export async function revokeInvitation(
  invitationId: string,
): Promise<ActionResult> {
  const admin = await requireAdmin();
  const supabase = createAdminClient();

  const { error } = await supabase
    .from("member_invitations")
    .update({ status: "REVOKED" })
    .eq("id", invitationId)
    .eq("status", "PENDING");

  if (error) return { ok: false, message: error.message };

  await supabase.from("activity_logs").insert({
    actor_id: admin.id,
    entity_type: "member_invitation",
    entity_id: invitationId,
    action: "INVITATION_REVOKED",
    summary: "Invitation revoked.",
  });

  revalidatePath("/admin/members");
  return { ok: true };
}

export async function resendInvitation(
  invitationId: string,
): Promise<ActionResult<{ emailSent: boolean }>> {
  const admin = await requireAdmin();
  const supabase = createAdminClient();

  const { data: invitation } = await supabase
    .from("member_invitations")
    .select("id, full_name, email, status")
    .eq("id", invitationId)
    .maybeSingle();

  if (!invitation || invitation.status !== "PENDING") {
    return { ok: false, message: "That invitation is no longer pending." };
  }

  // Sending again also extends the window.
  await supabase
    .from("member_invitations")
    .update({
      expires_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
    })
    .eq("id", invitationId);

  const result = await sendTemplateEmail({
    templateKey: "MEMBER_INVITATION",
    to: { email: invitation.email, name: invitation.full_name },
    vars: {
      applicant_name: invitation.full_name,
      application_link: `${appUrl}/login`,
    },
    triggeredBy: admin.id,
  });

  revalidatePath("/admin/members");
  return { ok: true, data: { emailSent: result.status === "SENT" } };
}
