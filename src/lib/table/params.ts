/**
 * Table state lives in the URL so a server component can do the querying and
 * a shared link reproduces exactly what the sender was looking at.
 */

export const PAGE_SIZES = [20, 50, 100] as const;
export type PageSize = (typeof PAGE_SIZES)[number];
export const DEFAULT_PAGE_SIZE: PageSize = 20;

export type SortDirection = "asc" | "desc";

export type TableParams = {
  page: number;
  pageSize: PageSize;
  sort: string | null;
  dir: SortDirection;
  q: string | null;
  /** Everything else, e.g. `status`, `source`, `member`. */
  filters: Record<string, string>;
};

export type RawSearchParams = Record<string, string | string[] | undefined>;

const RESERVED = new Set(["page", "pageSize", "sort", "dir", "q", "tab"]);

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export function parseTableParams(
  raw: RawSearchParams,
  defaults: { sort?: string; dir?: SortDirection } = {},
): TableParams {
  const rawPageSize = Number(first(raw.pageSize));
  const pageSize = (PAGE_SIZES as readonly number[]).includes(rawPageSize)
    ? (rawPageSize as PageSize)
    : DEFAULT_PAGE_SIZE;

  const page = Math.max(1, Number(first(raw.page)) || 1);
  const dirValue = first(raw.dir);
  const dir: SortDirection =
    dirValue === "asc" || dirValue === "desc" ? dirValue : (defaults.dir ?? "desc");

  const filters: Record<string, string> = {};
  for (const [key, value] of Object.entries(raw)) {
    if (RESERVED.has(key)) continue;
    const v = first(value);
    if (v) filters[key] = v;
  }

  return {
    page,
    pageSize,
    sort: first(raw.sort) ?? defaults.sort ?? null,
    dir,
    q: first(raw.q)?.trim() || null,
    filters,
  };
}

/**
 * Narrow a raw query-string value to a known enum member. Filters arrive as
 * arbitrary strings, and passing one straight into `.eq()` on an enum column
 * makes Postgres error out — so an unrecognised value becomes "no filter".
 */
export function pickEnum<T extends string>(
  value: string | undefined,
  allowed: readonly T[],
): T | undefined {
  return value && (allowed as readonly string[]).includes(value)
    ? (value as T)
    : undefined;
}

/** Zero-based Postgres range for `.range(from, to)`. */
export function toRange(params: Pick<TableParams, "page" | "pageSize">) {
  const from = (params.page - 1) * params.pageSize;
  return { from, to: from + params.pageSize - 1 };
}

export function pageCount(total: number, pageSize: number): number {
  return Math.max(1, Math.ceil(total / pageSize));
}

/**
 * Merge changes into the current query string. Any change other than paging
 * resets to page 1 — otherwise filtering while on page 7 shows an empty table.
 */
export function buildTableQuery(
  current: URLSearchParams,
  patch: Record<string, string | number | null | undefined>,
): string {
  const next = new URLSearchParams(current.toString());

  for (const [key, value] of Object.entries(patch)) {
    if (value === null || value === undefined || value === "") next.delete(key);
    else next.set(key, String(value));
  }

  const onlyPaging = Object.keys(patch).every((key) => key === "page");
  if (!onlyPaging) next.delete("page");

  return next.toString();
}
