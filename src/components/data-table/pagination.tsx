"use client";

import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { Select } from "@/components/ui/field";
import { PAGE_SIZES, pageCount } from "@/lib/table/params";
import { formatNumber } from "@/lib/utils";

export function DataTablePagination({
  page,
  pageSize,
  total,
  onChange,
  pending,
}: {
  page: number;
  pageSize: number;
  total: number;
  onChange: (patch: Record<string, string | number | null>) => void;
  pending?: boolean;
}) {
  const pages = pageCount(total, pageSize);
  const first = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const last = Math.min(page * pageSize, total);

  const step = (target: number) => onChange({ page: target });

  const button =
    "inline-flex size-8 items-center justify-center rounded-lg border border-line bg-surface text-ink transition hover:bg-surface-muted disabled:pointer-events-none disabled:opacity-40";

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p className="text-[0.75rem] text-ink-soft" aria-live="polite">
        {total === 0
          ? "No records"
          : `Showing ${formatNumber(first)}–${formatNumber(last)} of ${formatNumber(total)}`}
      </p>

      <div className="flex items-center gap-3">
        <label className="flex items-center gap-2 text-[0.75rem] text-ink-soft">
          <span className="hidden sm:inline">Rows</span>
          <Select
            value={pageSize}
            onChange={(event) =>
              onChange({ pageSize: Number(event.target.value), page: 1 })
            }
            className="h-8 w-auto py-0 text-[0.78rem]"
            aria-label="Rows per page"
          >
            {PAGE_SIZES.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </Select>
        </label>

        <div className="flex items-center gap-1">
          <button
            type="button"
            className={button}
            onClick={() => step(1)}
            disabled={page <= 1 || pending}
            aria-label="First page"
          >
            <ChevronsLeft className="size-4" />
          </button>
          <button
            type="button"
            className={button}
            onClick={() => step(page - 1)}
            disabled={page <= 1 || pending}
            aria-label="Previous page"
          >
            <ChevronLeft className="size-4" />
          </button>

          <span className="px-2 text-[0.75rem] font-medium text-ink">
            {page} / {pages}
          </span>

          <button
            type="button"
            className={button}
            onClick={() => step(page + 1)}
            disabled={page >= pages || pending}
            aria-label="Next page"
          >
            <ChevronRight className="size-4" />
          </button>
          <button
            type="button"
            className={button}
            onClick={() => step(pages)}
            disabled={page >= pages || pending}
            aria-label="Last page"
          >
            <ChevronsRight className="size-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
