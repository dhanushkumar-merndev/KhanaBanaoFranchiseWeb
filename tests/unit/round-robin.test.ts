import { describe, expect, it } from "vitest";
import { distribute, nextAssignee } from "@/lib/domain/round-robin";

const members = [{ id: "a" }, { id: "b" }, { id: "c" }];

describe("round-robin assignment", () => {
  it("starts at the first member on a fresh system", () => {
    expect(nextAssignee(members, -1)).toEqual({ memberId: "a", nextPosition: 0 });
  });

  it("rotates in order and wraps around", () => {
    expect(distribute(members, 4)).toEqual(["a", "b", "c", "a"]);
  });

  it("distributes evenly over a full number of rounds", () => {
    const dealt = distribute(members, 9);
    const counts = new Map<string, number>();
    for (const id of dealt) counts.set(id, (counts.get(id) ?? 0) + 1);
    expect([...counts.values()]).toEqual([3, 3, 3]);
  });

  it("leaves the lead unassigned when nobody is active", () => {
    expect(nextAssignee([], 4)).toEqual({ memberId: null, nextPosition: 4 });
    expect(distribute([], 3)).toEqual([]);
  });

  it("stays in range when the member list shrinks below the cursor", () => {
    // Cursor sat at index 5, then members were deactivated down to three.
    const result = nextAssignee(members, 5);
    expect(members.map((m) => m.id)).toContain(result.memberId);
    expect(result.nextPosition).toBeGreaterThanOrEqual(0);
    expect(result.nextPosition).toBeLessThan(members.length);
  });

  it("never returns a negative index for a negative cursor", () => {
    const result = nextAssignee(members, -7);
    expect(result.nextPosition).toBeGreaterThanOrEqual(0);
    expect(result.memberId).not.toBeNull();
  });

  it("keeps rotating from wherever the stored cursor left off", () => {
    expect(distribute(members, 3, 1)).toEqual(["c", "a", "b"]);
  });
});
