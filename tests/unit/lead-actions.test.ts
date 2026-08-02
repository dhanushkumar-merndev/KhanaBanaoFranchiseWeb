import { describe, expect, it } from "vitest";
import { availableActions } from "@/app/(dashboard)/admin/leads/[id]/lead-actions";

describe("lead action progression", () => {
  it("shows business discussion after an accepted lead still needs one", () => {
    const actions = availableActions("ACCEPTED", false);
    expect(actions.discussion).toBe(true);
    expect(actions.acceptedAwaitingDiscussion).toBe(true);
    expect(actions.decide).toBe(false);
  });

  it("removes the discussion prompt once the accepted lead has one", () => {
    const actions = availableActions("ACCEPTED", true);
    expect(actions.discussion).toBe(false);
    expect(actions.acceptedAwaitingDiscussion).toBe(false);
  });

  it("offers accept or reject after contact", () => {
    const actions = availableActions("CONTACTED", false);
    expect(actions.decide).toBe(true);
  });
});

