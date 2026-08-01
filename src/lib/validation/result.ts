/**
 * The single shape every server action returns.
 *
 * Actions resolve rather than throw for expected failures — a validation
 * problem or a rule the user tripped over is information the form needs to
 * render, not an error boundary. Genuine faults still throw.
 */
export type ActionResult<T = undefined> =
  | ({ ok: true } & (T extends undefined ? { data?: never } : { data: T }))
  | { ok: false; message: string; fieldErrors?: Record<string, string> };

/** Flattens Zod issues into `{ fieldName: firstMessage }` for the form. */
export function fieldErrorsFrom(
  issues: readonly { path: readonly PropertyKey[]; message: string }[],
): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const issue of issues) {
    const key = issue.path.join(".");
    if (key && !errors[key]) errors[key] = issue.message;
  }
  return errors;
}

/** Shorthand for the "your input was wrong" branch. */
export function invalid(
  issues: readonly { path: readonly PropertyKey[]; message: string }[],
  message = "Please check the highlighted fields.",
): ActionResult<never> {
  return { ok: false, message, fieldErrors: fieldErrorsFrom(issues) };
}

/** Normalises an unknown thrown value into a user-facing message. */
export function failure(error: unknown, fallback: string): ActionResult<never> {
  if (error && typeof error === "object" && "message" in error) {
    const message = String((error as { message: unknown }).message);
    if (message) return { ok: false, message };
  }
  return { ok: false, message: fallback };
}
