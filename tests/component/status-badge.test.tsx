import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { LEAD_STATUSES, LEAD_STATUS_LABELS } from "@/lib/domain/enums";
import {
  leadPipelineLabel,
  leadPipelineTone,
  leadStatusTone,
} from "@/lib/domain/status";

describe("StatusBadge", () => {
  it("renders the label as text", () => {
    render(<StatusBadge label="Payment pending" tone="warn" />);
    expect(screen.getByText("Payment pending")).toBeInTheDocument();
  });

  it("never conveys status by colour alone", () => {
    // The dot is decorative; the label must always carry the meaning (spec §29).
    const { container } = render(<StatusBadge label="Rejected" tone="danger" />);
    const dot = container.querySelector('[aria-hidden="true"]');
    expect(dot).not.toBeNull();
    expect(dot?.textContent).toBe("");
    expect(screen.getByText("Rejected")).toBeInTheDocument();
  });

  it("gives every lead status a human label rather than the raw enum", () => {
    for (const status of LEAD_STATUSES) {
      const label = LEAD_STATUS_LABELS[status];
      expect(label, status).toBeTruthy();
      // Raw enum text is banned on screen.
      expect(label, status).not.toBe(status);
      expect(label, status).not.toMatch(/_/);
    }
  });

  it("gives every lead status a tone", () => {
    for (const status of LEAD_STATUSES) {
      expect(leadStatusTone(status), status).toMatch(
        /^(neutral|info|progress|warn|success|danger)$/,
      );
    }
  });

  it("shows action-oriented phases in the leads table", () => {
    expect(leadPipelineLabel("DOCUMENTS_APPROVED")).toBe(
      "Agreement in process",
    );
    expect(leadPipelineLabel("AGREEMENT_COMPLETED")).toBe(
      "Training pending",
    );
    expect(leadPipelineLabel("PAYMENT_APPROVED")).toBe(
      "Training in process",
    );
    expect(leadPipelineLabel("TRAINING_COMPLETED")).toBe("Franchise setup");
    expect(leadPipelineLabel("LIVE")).toBe("Franchise owner");
    expect(leadPipelineTone("PAYMENT_REJECTED")).toBe("danger");
  });

  it("renders a plain badge with its children", () => {
    render(<Badge tone="info">Administrator</Badge>);
    expect(screen.getByText("Administrator")).toBeInTheDocument();
  });
});
