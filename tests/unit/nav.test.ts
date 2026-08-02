import { describe, expect, it } from "vitest";
import { isActiveNav } from "@/lib/nav";

describe("isActiveNav", () => {
  it("should match exact routes", () => {
    expect(isActiveNav("/admin", "/admin")).toBe(true);
    expect(isActiveNav("/admin/leads", "/admin/leads")).toBe(true);
  });

  it("should NOT mark root dashboard (/admin or /member) active on sub-routes", () => {
    expect(isActiveNav("/admin/leads", "/admin")).toBe(false);
    expect(isActiveNav("/admin/members", "/admin")).toBe(false);
    expect(isActiveNav("/member/leads", "/member")).toBe(false);
  });

  it("should mark section items active for nested detail routes", () => {
    expect(isActiveNav("/admin/leads/lead-123", "/admin/leads")).toBe(true);
    expect(isActiveNav("/member/leads/lead-123", "/member/leads")).toBe(true);
  });
});
