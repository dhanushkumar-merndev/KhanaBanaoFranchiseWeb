import type { Metadata } from "next";
import { PageHeader } from "@/components/shell/page-header";
import { Topbar } from "@/components/shell/topbar";
import { requireProfile } from "@/lib/auth/session";
import { listDocuments } from "@/lib/data/queues";
import { parseTableParams, type RawSearchParams } from "@/lib/table/params";
import { DocumentsQueueTable } from "@/app/(dashboard)/admin/queue-tables";

export const metadata: Metadata = { title: "Documents · Khana Banao" };

export default async function MemberDocumentsPage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  const [profile, raw] = await Promise.all([requireProfile(), searchParams]);
  const params = parseTableParams(raw, { sort: "uploaded_at", dir: "desc" });

  const { rows, total } = await listDocuments(params, {
    scopeMemberId: profile.id,
  });

  return (
    <>
      <Topbar profile={profile} crumbs={[{ label: "Documents" }]} />
      <main className="min-w-0 flex-1 px-4 py-6 md:px-6">
        <PageHeader
          title="Documents"
          description="Documents your applicants have uploaded. Approval is an administrator's decision, but you can chase what is missing."
        />
        <DocumentsQueueTable
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
