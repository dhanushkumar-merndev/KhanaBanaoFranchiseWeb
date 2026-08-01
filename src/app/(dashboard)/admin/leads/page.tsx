import type { Metadata } from "next";
import { PageHeader } from "@/components/shell/page-header";
import { Topbar } from "@/components/shell/topbar";
import { requireAdmin } from "@/lib/auth/session";
import { listActiveMembers, listLeads } from "@/lib/data/leads";
import { parseTableParams, type RawSearchParams } from "@/lib/table/params";
import { CreateLeadDialog } from "./create-lead-dialog";
import { LeadsTable } from "./leads-table";

export const metadata: Metadata = { title: "Leads · Khana Banao" };

export default async function AdminLeadsPage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  const [profile, raw] = await Promise.all([requireAdmin(), searchParams]);

  const params = parseTableParams(raw, { sort: "created_at", dir: "desc" });

  const [{ rows, total }, members] = await Promise.all([
    listLeads(params, null),
    listActiveMembers(),
  ]);

  const createDialog = (
    <CreateLeadDialog
      canAssign
      members={members.map((m) => ({ id: m.id, full_name: m.full_name }))}
    />
  );

  return (
    <>
      <Topbar profile={profile} crumbs={[{ label: "Leads" }]} />

      <main className="min-w-0 flex-1 px-4 py-6 md:px-6">
        <PageHeader
          title="Leads"
          description="Every enquiry in the pipeline. Website enquiries are assigned automatically by round-robin; anything else can be added here."
          actions={createDialog}
        />

        <LeadsTable
          rows={rows}
          total={total}
          page={params.page}
          pageSize={params.pageSize}
          sort={params.sort}
          dir={params.dir}
          basePath="/admin/leads"
          memberOptions={members.map((member) => ({
            value: member.id,
            label: member.full_name,
          }))}
          emptyAction={createDialog}
        />
      </main>
    </>
  );
}
