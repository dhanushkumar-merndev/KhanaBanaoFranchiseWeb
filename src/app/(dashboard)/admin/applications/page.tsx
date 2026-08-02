import type { Metadata } from "next";
import { PageHeader } from "@/components/shell/page-header";
import { Topbar } from "@/components/shell/topbar";
import { requireAdmin } from "@/lib/auth/session";
import { listApplications } from "@/lib/data/queues";
import { parseTableParams, type RawSearchParams } from "@/lib/table/params";
import { ApplicationsQueueTable } from "../queue-tables";

export const metadata: Metadata = { title: "Applications · Khana Banao" };

export default async function AdminApplicationsPage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  const [profile, raw] = await Promise.all([requireAdmin(), searchParams]);
  const params = parseTableParams(raw, { sort: "submitted_at", dir: "desc" });
  const { rows, total } = await listApplications(params, { scopeMemberId: null });

  return (
    <>
      <Topbar profile={profile} crumbs={[{ label: "Applications" }]} />
      <main className="min-w-0 flex-1 px-4 py-6 md:px-6">
        <PageHeader
          title="Applications"
          description="Every franchise application, from the moment a link is issued to the approval decision."
        />
        <ApplicationsQueueTable
          rows={rows}
          total={total}
          page={params.page}
          pageSize={params.pageSize}
          sort={params.sort}
          dir={params.dir}
          basePath="/admin/leads"
        />
      </main>
    </>
  );
}
