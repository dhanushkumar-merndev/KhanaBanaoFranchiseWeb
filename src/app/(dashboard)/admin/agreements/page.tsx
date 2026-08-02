import type { Metadata } from "next";
import { PageHeader } from "@/components/shell/page-header";
import { Topbar } from "@/components/shell/topbar";
import { requireAdmin } from "@/lib/auth/session";
import { listAgreements } from "@/lib/data/queues";
import { parseTableParams, type RawSearchParams } from "@/lib/table/params";
import { AgreementsQueueTable } from "../queue-tables";

export const metadata: Metadata = { title: "Agreements · Khana Banao" };

export default async function AdminAgreementsPage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  const [profile, raw] = await Promise.all([requireAdmin(), searchParams]);
  const params = parseTableParams(raw, { sort: "created_at", dir: "desc" });
  const { rows, total } = await listAgreements(params);

  return (
    <>
      <Topbar profile={profile} crumbs={[{ label: "Agreements" }]} />
      <main className="min-w-0 flex-1 px-4 py-6 md:px-6">
        <PageHeader
          title="Agreements"
          description="Franchise agreements at every stage of signing. Open one to upload, send or record a signature."
        />
        <AgreementsQueueTable
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
