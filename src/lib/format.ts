/**
 * Date and phone presentation.
 *
 * Everything is pinned to Asia/Kolkata: the team is in one place, and a
 * follow-up that reads "due today" must mean the same thing on the server
 * and in the browser, otherwise a server-rendered table and a client
 * re-render can disagree about the date.
 */

const TIME_ZONE = "Asia/Kolkata";

const dateFmt = new Intl.DateTimeFormat("en-IN", {
  timeZone: TIME_ZONE,
  day: "2-digit",
  month: "short",
  year: "numeric",
});

const dateTimeFmt = new Intl.DateTimeFormat("en-IN", {
  timeZone: TIME_ZONE,
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
});

const timeFmt = new Intl.DateTimeFormat("en-IN", {
  timeZone: TIME_ZONE,
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
});

function toDate(value: string | Date | null | undefined): Date | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** `2026-08-01T…` -> `01 Aug 2026`. Returns `—` for empty values. */
export function formatDate(value: string | Date | null | undefined): string {
  const date = toDate(value);
  return date ? dateFmt.format(date) : "—";
}

/** `01 Aug 2026, 4:30 pm`. */
export function formatDateTime(value: string | Date | null | undefined): string {
  const date = toDate(value);
  return date ? dateTimeFmt.format(date) : "—";
}

/** `4:30 pm`. */
export function formatTime(value: string | Date | null | undefined): string {
  const date = toDate(value);
  return date ? timeFmt.format(date) : "—";
}

/** `+919876543210` -> `+91 98765 43210`. Anything else is passed through. */
export function formatPhone(value: string | null | undefined): string {
  if (!value) return "—";
  const match = /^\+91(\d{5})(\d{5})$/.exec(value);
  return match ? `+91 ${match[1]} ${match[2]}` : value;
}

const RELATIVE_UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 365 * 24 * 60 * 60_000],
  ["month", 30 * 24 * 60 * 60_000],
  ["day", 24 * 60 * 60_000],
  ["hour", 60 * 60_000],
  ["minute", 60_000],
];

const relativeFmt = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

/** `2 days ago`, `in 3 hours`, `just now`. */
export function formatRelative(
  value: string | Date | null | undefined,
  now: Date = new Date(),
): string {
  const date = toDate(value);
  if (!date) return "—";

  const diff = date.getTime() - now.getTime();
  for (const [unit, ms] of RELATIVE_UNITS) {
    if (Math.abs(diff) >= ms) {
      return relativeFmt.format(Math.round(diff / ms), unit);
    }
  }
  return "just now";
}

/**
 * `<input type="datetime-local">` bridging.
 *
 * The control has no time zone: the browser reads and writes wall-clock time
 * in the viewer's zone, while the server would parse the same string in its
 * own (UTC on Vercel) — a silent 5.5-hour shift for this team. So the value is
 * always converted to a real instant in the browser before it is sent, and
 * back to wall-clock time when it is loaded into a form.
 */
export function localInputToIso(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString();
}

function isoToLocalInput(value: string | Date | null | undefined): string {
  const date = toDate(value);
  if (!date) return "";
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

/** `datetime-local` value for "now", used as a sensible default. */
export function nowLocalInput(): string {
  return isoToLocalInput(new Date());
}

/**
 * `1536000` -> `1.5 MB`.
 *
 * Lives here rather than beside the upload helpers because those are
 * `server-only`, and file sizes are rendered in client components.
 */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/** Initials for an avatar chip: `Priya Menon` -> `PM`. */
export function initialsOf(name: string): string {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("") || "?"
  );
}
