import type { Metadata } from "next";
import { PageHeader } from "@/components/shell/page-header";
import { Topbar } from "@/components/shell/topbar";
import { requireProfile } from "@/lib/auth/session";
import { listLeads } from "@/lib/data/leads";
import { parseTableParams, type RawSearchParams } from "@/lib/table/params";
import { CreateLeadDialog } from "@/app/(dashboard)/admin/leads/create-lead-dialog";
import { LeadsTable } from "@/app/(dashboard)/admin/leads/leads-table";

export const metadata: Metadata = { title: "My leads · Khana Banao" };

export default async function MemberLeadsPage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  const [profile, raw] = await Promise.all([requireProfile(), searchParams]);
  const params = parseTableParams(raw, { sort: "created_at", dir: "desc" });

  // Scoped by profile id, so the query itself cannot return anyone else's
  // leads regardless of what the URL asks for.
  const { rows, total } = await listLeads(params, profile.id);
  const createDialog = (
    <CreateLeadDialog
      canAssign={false}
      members={[]}
      leadBasePath="/member/leads"
    />
  );

  return (
    <>
      <Topbar profile={profile} crumbs={[{ label: "My leads" }]} />

      <main className="min-w-0 flex-1 px-4 py-6 md:px-6">
        <PageHeader
          title="My leads"
          description="Every enquiry assigned to you, including leads you add directly."
          actions={createDialog}
        />

        <LeadsTable
          rows={rows}
          total={total}
          page={params.page}
          pageSize={params.pageSize}
          sort={params.sort}
          dir={params.dir}
          basePath="/member/leads"
          emptyAction={createDialog}
        />
      </main>
    </>
  );
}
