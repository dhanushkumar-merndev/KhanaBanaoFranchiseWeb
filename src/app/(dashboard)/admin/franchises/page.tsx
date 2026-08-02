import type { Metadata } from "next";
import { PageHeader } from "@/components/shell/page-header";
import { Topbar } from "@/components/shell/topbar";
import { requireAdmin } from "@/lib/auth/session";
import { listFranchises } from "@/lib/data/queues";
import { parseTableParams, type RawSearchParams } from "@/lib/table/params";
import { FranchisesQueueTable } from "../queue-tables";

export const metadata: Metadata = { title: "Franchises · Khana Banao" };

export default async function AdminFranchisesPage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  const [profile, raw] = await Promise.all([requireAdmin(), searchParams]);
  const params = parseTableParams(raw, { sort: "activation_date", dir: "desc" });
  const { rows, total } = await listFranchises(params);

  return (
    <>
      <Topbar profile={profile} crumbs={[{ label: "Franchises" }]} />
      <main className="min-w-0 flex-1 px-4 py-6 md:px-6">
        <PageHeader
          title="Franchises"
          description="Every activated partner, with their training and setup progress at a glance."
        />
        <FranchisesQueueTable
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
