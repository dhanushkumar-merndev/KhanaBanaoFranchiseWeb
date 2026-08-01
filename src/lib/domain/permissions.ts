import type { Role } from "./enums";

/**
 * Every privileged action in the product. Server actions call `can()` before
 * touching data; the UI calls it to decide what to render. RLS is the last
 * line of defence, not the first.
 */
export const ACTIONS = [
  "member.invite",
  "member.deactivate",
  "member.viewAll",
  "lead.viewAll",
  "lead.viewAssigned",
  "lead.create",
  "lead.assign",
  "lead.update",
  "lead.accept",
  "lead.reject",
  "activity.create",
  "followup.manage",
  "application.sendLink",
  "application.review",
  "document.request",
  "document.viewStatus",
  "document.approve",
  "agreement.manage",
  "payment.record",
  "payment.uploadProof",
  "payment.approve",
  "franchise.approve",
  "franchise.activate",
  "franchise.markLive",
  "training.manage",
  "setup.manage",
  "emailTemplate.manage",
  "emailLog.view",
  "analytics.viewAll",
  "settings.manage",
] as const;

export type Action = (typeof ACTIONS)[number];

/** Actions a MEMBER may perform. Admin may perform everything. */
const MEMBER_ACTIONS = new Set<Action>([
  "lead.viewAssigned",
  "lead.update",
  "lead.accept",
  "lead.reject",
  "activity.create",
  "followup.manage",
  "application.sendLink",
  "document.request",
  "document.viewStatus",
  "payment.record",
  "payment.uploadProof",
]);

export function can(role: Role | null | undefined, action: Action): boolean {
  if (role === "ADMIN") return true;
  if (role === "MEMBER") return MEMBER_ACTIONS.has(action);
  return false;
}

export function isAdmin(role: Role | null | undefined): role is "ADMIN" {
  return role === "ADMIN";
}

/**
 * Members only ever see their own leads. Returns the member id a query must
 * be scoped to, or `null` for an unrestricted (admin) query.
 */
export function leadScopeFor(
  role: Role,
  profileId: string,
): string | null {
  return role === "ADMIN" ? null : profileId;
}
