import type { Metadata } from "next";
import { Sidebar } from "@/components/shell/sidebar";
import { requireProfile } from "@/lib/auth/session";
import type { Role } from "@/lib/domain/enums";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

/**
 * Shared shell for both dashboards. Middleware has already established that
 * *someone* is signed in; this resolves who, and the /admin layout adds the
 * role check on top.
 */
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await requireProfile();

  return (
    <div className="flex min-h-dvh bg-canvas">
      <Sidebar role={profile.role as Role} />
      <div className="flex min-w-0 flex-1 flex-col">{children}</div>
    </div>
  );
}
