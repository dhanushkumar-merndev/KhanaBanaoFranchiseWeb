import type { Metadata } from "next";
import { PageHeader } from "@/components/shell/page-header";
import { TabNav } from "@/components/shell/tab-nav";
import { Topbar } from "@/components/shell/topbar";
import { countActiveMembers } from "@/app/actions/members";
import { requireAdmin } from "@/lib/auth/session";
import {
  countPendingInvitations,
  listInvitations,
  listMembers,
} from "@/lib/data/members";
import { MAX_ACTIVE_MEMBERS } from "@/lib/domain/enums";
import { parseTableParams, type RawSearchParams } from "@/lib/table/params";
import { InviteMemberDialog } from "./invite-member-dialog";
import { InvitationsTable } from "./invitations-table";
import { MembersTable } from "./members-table";

export const metadata: Metadata = { title: "Members · Khana Banao" };

const TABS = ["members", "invitations"] as const;
type Tab = (typeof TABS)[number];

export default async function MembersPage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  const [profile, raw] = await Promise.all([requireAdmin(), searchParams]);

  const tabParam = Array.isArray(raw.tab) ? raw.tab[0] : raw.tab;
  const tab: Tab = TABS.includes(tabParam as Tab) ? (tabParam as Tab) : "members";

  const params = parseTableParams(raw, {
    sort: tab === "members" ? "full_name" : "created_at",
    dir: tab === "members" ? "asc" : "desc",
  });

  const [activeCount, pendingInvites] = await Promise.all([
    countActiveMembers(),
    countPendingInvitations(),
  ]);

  const inviteButton = <InviteMemberDialog activeCount={activeCount} />;

  const tabs = [
    { href: "/admin/members?tab=members", label: "Team", badge: activeCount },
    {
      href: "/admin/members?tab=invitations",
      label: "Invitations",
      badge: pendingInvites,
    },
  ];

  return (
    <>
      <Topbar profile={profile} crumbs={[{ label: "Members" }]} />

      <main className="min-w-0 flex-1 px-4 py-6 md:px-6">
        <PageHeader
          title="Team members"
          description={`Members receive leads through round-robin assignment. ${activeCount} of ${MAX_ACTIVE_MEMBERS} active slots are in use.`}
          actions={inviteButton}
        />

        <TabNav
          items={tabs}
          active={tabs[tab === "members" ? 0 : 1].href}
          className="mb-5"
        />

        {tab === "members" ? (
          <MembersSection
            params={params}
            currentProfile={profile}
            inviteButton={inviteButton}
          />
        ) : (
          <InvitationsSection params={params} inviteButton={inviteButton} />
        )}
      </main>
    </>
  );
}

type SectionProps = {
  params: ReturnType<typeof parseTableParams>;
  inviteButton: React.ReactNode;
};

async function MembersSection({
  params,
  currentProfile,
  inviteButton,
}: SectionProps & { currentProfile: import("@/lib/auth/session").SessionProfile }) {
  const { rows, total } = await listMembers(params);

  return (
    <MembersTable
      rows={rows.map((member) => ({
        ...member,
        isSelf: member.id === currentProfile.id,
        avatar_url: member.id === currentProfile.id ? currentProfile.avatar_url : null,
      }))}
      total={total}
      page={params.page}
      pageSize={params.pageSize}
      sort={params.sort}
      dir={params.dir}
      inviteButton={inviteButton}
    />
  );
}

async function InvitationsSection({ params, inviteButton }: SectionProps) {
  const { rows, total } = await listInvitations(params);

  return (
    <InvitationsTable
      rows={rows}
      total={total}
      page={params.page}
      pageSize={params.pageSize}
      sort={params.sort}
      dir={params.dir}
      inviteButton={inviteButton}
    />
  );
}
