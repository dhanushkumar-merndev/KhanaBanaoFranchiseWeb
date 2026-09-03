import type { Role } from "@/lib/domain/enums";

export type NavItem = {
  href: string;
  label: string;
  icon: NavIcon;
};

export type NavIcon =
  | "dashboard"
  | "members"
  | "leads"
  | "followups"
  | "applications"
  | "documents"
  | "agreements"
  | "payments"
  | "franchises"
  | "training"
  | "setup"
  | "templates"
  | "logs"
  | "activity"
  | "storage";

export type NavGroup = { title: string; items: NavItem[] };

const ADMIN_NAV: NavGroup[] = [
  {
    title: "Overview",
    items: [{ href: "/admin", label: "Dashboard", icon: "dashboard" }],
  },
  {
    title: "Pipeline",
    items: [
      { href: "/admin/leads", label: "Leads", icon: "leads" },
      { href: "/admin/follow-ups", label: "Follow-ups", icon: "followups" },
      { href: "/admin/applications", label: "Applications", icon: "applications" },
      { href: "/admin/documents", label: "Documents", icon: "documents" },
      { href: "/admin/agreements", label: "Agreements", icon: "agreements" },
      { href: "/admin/payments", label: "Payments", icon: "payments" },
    ],
  },
  {
    title: "Franchises",
    items: [
      { href: "/admin/franchises", label: "Franchises", icon: "franchises" },
      { href: "/admin/training", label: "Training", icon: "training" },
      { href: "/admin/setup", label: "Setup", icon: "setup" },
    ],
  },
  {
    title: "Administration",
    items: [
      { href: "/admin/members", label: "Members", icon: "members" },
      { href: "/admin/email-templates", label: "Email templates", icon: "templates" },
      { href: "/admin/email-logs", label: "Email logs", icon: "logs" },
      { href: "/admin/activity", label: "Activity", icon: "activity" },
      { href: "/admin/storage", label: "Storage", icon: "storage" },
    ],
  },
];

const MEMBER_NAV: NavGroup[] = [
  {
    title: "Overview",
    items: [{ href: "/member", label: "Dashboard", icon: "dashboard" }],
  },
  {
    title: "My work",
    items: [
      { href: "/member/leads", label: "My leads", icon: "leads" },
      { href: "/member/follow-ups", label: "Follow-ups", icon: "followups" },
      { href: "/member/applications", label: "Applications", icon: "applications" },
      { href: "/member/documents", label: "Documents", icon: "documents" },
      { href: "/member/payments", label: "Payments", icon: "payments" },
    ],
  },
];

export function navFor(role: Role): NavGroup[] {
  return role === "ADMIN" ? ADMIN_NAV : MEMBER_NAV;
}

/**
 * Longest-prefix match so `/admin/leads/abc` highlights `Leads` but
 * `/admin/leads` does not also highlight `Dashboard` (`/admin`).
 */
export function isActiveNav(pathname: string, href: string): boolean {
  if (pathname === href) return true;
  if (href === "/admin" || href === "/member" || href === "/") return false;
  return pathname.startsWith(`${href}/`);
}
