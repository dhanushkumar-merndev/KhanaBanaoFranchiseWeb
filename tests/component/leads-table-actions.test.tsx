import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { LeadsTable, type LeadTableRow } from "@/app/(dashboard)/admin/leads/leads-table";

vi.mock("next/navigation", () => ({
  usePathname: () => "/admin/leads",
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

vi.mock("@/app/actions/lead-admin", () => ({
  prepareLeadExport: vi.fn(),
  deleteLeadPermanently: vi.fn(),
}));

const lead: LeadTableRow = {
  id: "3f70c745-2f77-4761-833b-0ad5faab64d4",
  lead_number: "KB-L01001",
  full_name: "Test Lead",
  phone: "+919876543210",
  email: "lead@example.com",
  city: "Bengaluru",
  source: "WEBSITE",
  current_status: "NEW",
  next_followup_at: null,
  created_at: "2026-08-02T10:00:00.000Z",
  assignedMemberName: "Team Member",
  followupOverdue: false,
};

function renderTable(adminActions: boolean) {
  return render(
    <LeadsTable
      rows={[lead]}
      total={1}
      page={1}
      pageSize={20}
      sort="created_at"
      dir="desc"
      basePath={adminActions ? "/admin/leads" : "/member/leads"}
      adminActions={adminActions}
    />,
  );
}

describe("lead row admin actions", () => {
  it("does not render export or delete controls on the member table", () => {
    renderTable(false);
    expect(
      screen.queryByRole("button", { name: "Actions for Test Lead" }),
    ).not.toBeInTheDocument();
  });

  it("shows download and permanent-delete options to an admin", async () => {
    renderTable(true);
    fireEvent.pointerDown(
      screen.getByRole("button", { name: "Actions for Test Lead" }),
      { button: 0, ctrlKey: false },
    );

    expect(await screen.findByText("Download complete record")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Delete permanently"));

    expect(
      await screen.findByRole("heading", {
        name: "Permanently delete Test Lead?",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("KB-L01001 · lead@example.com")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Delete everything" }),
    ).toBeInTheDocument();
  });
});

