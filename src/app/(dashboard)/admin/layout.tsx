import { requireAdmin } from "@/lib/auth/session";

/** Admin-only guard on top of the shared dashboard shell. */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdmin();
  return <>{children}</>;
}
