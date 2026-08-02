import type { Metadata } from "next";
import { PageHeader } from "@/components/shell/page-header";
import { Topbar } from "@/components/shell/topbar";
import { requireProfile } from "@/lib/auth/session";
import { listPayments } from "@/lib/data/queues";
import { parseTableParams, type RawSearchParams } from "@/lib/table/params";
import { PaymentsQueueTable } from "@/app/(dashboard)/admin/queue-tables";

export const metadata: Metadata = { title: "Payments · Khana Banao" };

export default async function MemberPaymentsPage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  const [profile, raw] = await Promise.all([requireProfile(), searchParams]);
  const params = parseTableParams(raw, { sort: "created_at", dir: "desc" });

  const { rows, total } = await listPayments(params, {
    scopeMemberId: profile.id,
  });

  return (
    <>
      <Topbar profile={profile} crumbs={[{ label: "Payments" }]} />
      <main className="min-w-0 flex-1 px-4 py-6 md:px-6">
        <PageHeader
          title="Payments"
          description="Franchise fees on your leads. A rejected proof shows its reason — record a corrected one from the lead's Payment tab."
        />
        <PaymentsQueueTable
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
