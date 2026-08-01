/**
 * Round-robin lead distribution.
 *
 * The database owns the authoritative cursor (`assignment_state.last_position`)
 * and the real assignment happens inside a Postgres function so concurrent
 * enquiries cannot both read the same cursor. This module holds the pure
 * arithmetic so it can be reasoned about and tested on its own.
 */

export type ActiveMember = { id: string };

export type RoundRobinResult = {
  /** `null` when there is no active member to assign to. */
  memberId: string | null;
  /** Cursor to persist for the next assignment. */
  nextPosition: number;
};

/**
 * Pick the next member given the previously stored position.
 *
 * `lastPosition` is the index that was used last time; the first call of a
 * fresh system passes -1 (or any negative number) and gets index 0.
 * Members must be supplied in a stable order — sort by `created_at, id`.
 */
export function nextAssignee(
  members: readonly ActiveMember[],
  lastPosition: number,
): RoundRobinResult {
  if (members.length === 0) {
    // Nothing to assign to: leave the lead unassigned and hold the cursor.
    return { memberId: null, nextPosition: lastPosition };
  }

  // Modulo keeps the cursor valid even after members are deactivated and the
  // list shrinks between assignments.
  const index = ((lastPosition + 1) % members.length + members.length) % members.length;

  return { memberId: members[index].id, nextPosition: index };
}

/**
 * Deal `count` leads in rotation. Used by tests and by the bulk reassignment
 * tool; the live path assigns one at a time through the database function.
 */
export function distribute(
  members: readonly ActiveMember[],
  count: number,
  lastPosition = -1,
): string[] {
  const assignments: string[] = [];
  let cursor = lastPosition;

  for (let i = 0; i < count; i++) {
    const result = nextAssignee(members, cursor);
    if (!result.memberId) break;
    assignments.push(result.memberId);
    cursor = result.nextPosition;
  }

  return assignments;
}
