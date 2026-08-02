import type { Metadata } from "next";
import { PageHeader } from "@/components/shell/page-header";
import { Topbar } from "@/components/shell/topbar";
import { requireProfile } from "@/lib/auth/session";
import { listApplications } from "@/lib/data/queues";
import { parseTableParams, type RawSearchParams } from "@/lib/table/params";
import { ApplicationsQueueTable } from "@/app/(dashboard)/admin/queue-tables";

export const metadata: Metadata = { title: "Applications · Khana Banao" };

export default async function MemberApplicationsPage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  const [profile, raw] = await Promise.all([requireProfile(), searchParams]);
  const params = parseTableParams(raw, { sort: "submitted_at", dir: "desc" });

  // Scoped, so this can only ever return applications on this member's leads.
  const { rows, total } = await listApplications(params, {
    scopeMemberId: profile.id,
  });

  return (
    <>
      <Topbar profile={profile} crumbs={[{ label: "Applications" }]} />
      <main className="min-w-0 flex-1 px-4 py-6 md:px-6">
        <PageHeader
          title="Applications"
          description="Applications from the leads assigned to you."
        />
        <ApplicationsQueueTable
          rows={rows}
          total={total}
          page={params.page}
          pageSize={params.pageSize}
          sort={params.sort}
          dir={params.dir}
          basePath="/member/leads"
        />
      </main>
    </>
  );
}
