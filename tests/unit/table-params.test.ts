import { describe, expect, it } from "vitest";
import {
  DEFAULT_PAGE_SIZE,
  buildTableQuery,
  pageCount,
  parseTableParams,
  pickEnum,
  toRange,
} from "@/lib/table/params";

describe("parsing table state from the URL", () => {
  it("falls back to sane defaults for an empty query string", () => {
    expect(parseTableParams({})).toEqual({
      page: 1,
      pageSize: DEFAULT_PAGE_SIZE,
      sort: null,
      dir: "desc",
      q: null,
      filters: {},
    });
  });

  it("honours the caller's defaults", () => {
    const params = parseTableParams({}, { sort: "full_name", dir: "asc" });
    expect(params.sort).toBe("full_name");
    expect(params.dir).toBe("asc");
  });

  it("rejects a page size that is not on the allowed list", () => {
    expect(parseTableParams({ pageSize: "37" }).pageSize).toBe(DEFAULT_PAGE_SIZE);
    expect(parseTableParams({ pageSize: "50" }).pageSize).toBe(50);
  });

  it("clamps a nonsensical page number to 1", () => {
    expect(parseTableParams({ page: "0" }).page).toBe(1);
    expect(parseTableParams({ page: "-3" }).page).toBe(1);
    expect(parseTableParams({ page: "abc" }).page).toBe(1);
    expect(parseTableParams({ page: "4" }).page).toBe(4);
  });

  it("ignores a direction that is neither asc nor desc", () => {
    expect(parseTableParams({ dir: "sideways" }).dir).toBe("desc");
    expect(parseTableParams({ dir: "asc" }).dir).toBe("asc");
  });

  it("collects unreserved keys as filters", () => {
    const params = parseTableParams({
      page: "2",
      sort: "created_at",
      q: "ramesh",
      status: "NEW",
      member: "abc-123",
    });
    expect(params.filters).toEqual({ status: "NEW", member: "abc-123" });
    expect(params.q).toBe("ramesh");
  });

  it("treats a whitespace-only search as no search", () => {
    expect(parseTableParams({ q: "   " }).q).toBeNull();
  });

  it("takes the first value when a key repeats", () => {
    expect(parseTableParams({ status: ["NEW", "ASSIGNED"] }).filters.status).toBe(
      "NEW",
    );
  });
});

describe("narrowing a filter to a known enum", () => {
  const allowed = ["NEW", "ASSIGNED"] as const;

  it("passes a recognised value through", () => {
    expect(pickEnum("NEW", allowed)).toBe("NEW");
  });

  it("drops anything else, so Postgres never sees a bad enum literal", () => {
    expect(pickEnum("DROP TABLE", allowed)).toBeUndefined();
    expect(pickEnum("", allowed)).toBeUndefined();
    expect(pickEnum(undefined, allowed)).toBeUndefined();
  });
});

describe("building the next query string", () => {
  const current = new URLSearchParams("page=7&q=ramesh&status=NEW");

  it("resets to page 1 whenever a filter changes", () => {
    // Filtering while on page 7 would otherwise show an empty table.
    const next = new URLSearchParams(buildTableQuery(current, { status: "ASSIGNED" }));
    expect(next.get("status")).toBe("ASSIGNED");
    expect(next.get("page")).toBeNull();
  });

  it("keeps the page when only the page changes", () => {
    const next = new URLSearchParams(buildTableQuery(current, { page: 3 }));
    expect(next.get("page")).toBe("3");
    expect(next.get("q")).toBe("ramesh");
  });

  it("removes a key set to null or empty", () => {
    const next = new URLSearchParams(buildTableQuery(current, { q: null }));
    expect(next.get("q")).toBeNull();
    expect(next.get("status")).toBe("NEW");
  });

  it("clears several filters at once", () => {
    const next = new URLSearchParams(
      buildTableQuery(current, { q: null, status: null }),
    );
    expect(next.get("q")).toBeNull();
    expect(next.get("status")).toBeNull();
  });
});

describe("paging arithmetic", () => {
  it("converts a page into a zero-based Postgres range", () => {
    expect(toRange({ page: 1, pageSize: 20 })).toEqual({ from: 0, to: 19 });
    expect(toRange({ page: 3, pageSize: 50 })).toEqual({ from: 100, to: 149 });
  });

  it("never reports fewer than one page", () => {
    expect(pageCount(0, 20)).toBe(1);
    expect(pageCount(1, 20)).toBe(1);
    expect(pageCount(21, 20)).toBe(2);
    expect(pageCount(200, 20)).toBe(10);
  });
});
