import { describe, expect, it } from "vitest";
import { ACTIONS, can, isAdmin, leadScopeFor } from "@/lib/domain/permissions";

describe("role permissions", () => {
  it("lets an admin do everything", () => {
    for (const action of ACTIONS) {
      expect(can("ADMIN", action)).toBe(true);
    }
  });

  it("lets a member work their own pipeline", () => {
    expect(can("MEMBER", "lead.viewAssigned")).toBe(true);
    expect(can("MEMBER", "activity.create")).toBe(true);
    expect(can("MEMBER", "followup.manage")).toBe(true);
    expect(can("MEMBER", "application.sendLink")).toBe(true);
    expect(can("MEMBER", "payment.uploadProof")).toBe(true);
  });

  it("keeps approval and administration away from members", () => {
    expect(can("MEMBER", "member.invite")).toBe(false);
    expect(can("MEMBER", "lead.viewAll")).toBe(false);
    expect(can("MEMBER", "lead.assign")).toBe(false);
    expect(can("MEMBER", "document.approve")).toBe(false);
    expect(can("MEMBER", "payment.approve")).toBe(false);
    expect(can("MEMBER", "franchise.approve")).toBe(false);
    expect(can("MEMBER", "emailTemplate.manage")).toBe(false);
    expect(can("MEMBER", "analytics.viewAll")).toBe(false);
  });

  it("denies everything when there is no role", () => {
    expect(can(null, "lead.viewAssigned")).toBe(false);
    expect(can(undefined, "lead.viewAll")).toBe(false);
  });

  it("narrows the role with isAdmin", () => {
    expect(isAdmin("ADMIN")).toBe(true);
    expect(isAdmin("MEMBER")).toBe(false);
    expect(isAdmin(null)).toBe(false);
  });

  it("scopes lead queries to the member, and not at all for an admin", () => {
    expect(leadScopeFor("MEMBER", "profile-1")).toBe("profile-1");
    expect(leadScopeFor("ADMIN", "profile-1")).toBeNull();
  });
});
