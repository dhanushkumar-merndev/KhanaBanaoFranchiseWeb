"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
  type VisibilityState,
} from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { EmptyState, TableSkeleton } from "@/components/ui/feedback";
import { buildTableQuery } from "@/lib/table/params";
import { cn } from "@/lib/utils";
import { DataTablePagination } from "./pagination";
import { DataTableToolbar, type FilterConfig } from "./toolbar";

/** Extra per-column metadata this table understands. */
export type ColumnMetaConfig = {
  /** Server sort key. Omit to make the column unsortable. */
  sortKey?: string;
  /** Hide below `md` — keeps phone layouts readable. */
  hideOnMobile?: boolean;
  align?: "left" | "right" | "center";
  /** Excluded from the column-visibility menu (e.g. row actions). */
  locked?: boolean;
};

export type DataTableProps<T> = {
  data: T[];
  columns: ColumnDef<T, unknown>[];
  total: number;
  page: number;
  pageSize: number;
  sort: string | null;
  dir: "asc" | "desc";
  searchPlaceholder?: string;
  filters?: FilterConfig[];
  emptyTitle?: string;
  emptyBody?: string;
  emptyAction?: React.ReactNode;
  toolbarActions?: React.ReactNode;
  /** Row click target, e.g. `(row) => /admin/leads/${row.id}`. */
  rowHref?: (row: T) => string;
};

/** Above this many rows the body is virtualised. */
const VIRTUALIZE_FROM = 40;
const ROW_HEIGHT = 52;

export function DataTable<T extends { id: string }>({
  data,
  columns,
  total,
  page,
  pageSize,
  sort,
  dir,
  searchPlaceholder,
  filters,
  emptyTitle = "Nothing here yet",
  emptyBody,
  emptyAction,
  toolbarActions,
  rowHref,
}: DataTableProps<T>) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const scrollRef = useRef<HTMLDivElement>(null);

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    manualSorting: true,
    manualFiltering: true,
    state: { columnVisibility },
    onColumnVisibilityChange: setColumnVisibility,
  });

  const push = (patch: Record<string, string | number | null>) => {
    const query = buildTableQuery(new URLSearchParams(searchParams), patch);
    startTransition(() => router.push(`${pathname}?${query}`, { scroll: false }));
  };

  const toggleSort = (sortKey: string) => {
    const nextDir = sort === sortKey && dir === "asc" ? "desc" : "asc";
    push({ sort: sortKey, dir: nextDir });
  };

  const rows = table.getRowModel().rows;
  const shouldVirtualize = rows.length > VIRTUALIZE_FROM;

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 8,
    enabled: shouldVirtualize,
  });

  const virtualRows = virtualizer.getVirtualItems();
  const paddingTop = shouldVirtualize && virtualRows.length ? virtualRows[0].start : 0;
  const paddingBottom =
    shouldVirtualize && virtualRows.length
      ? virtualizer.getTotalSize() - virtualRows[virtualRows.length - 1].end
      : 0;

  const visibleRows = useMemo(
    () => (shouldVirtualize ? virtualRows.map((v) => rows[v.index]) : rows),
    [shouldVirtualize, virtualRows, rows],
  );

  const columnCount = table.getVisibleLeafColumns().length;

  return (
    <div className="flex flex-col gap-3">
      <DataTableToolbar
        table={table}
        filters={filters}
        searchPlaceholder={searchPlaceholder}
        onChange={push}
        actions={toolbarActions}
      />

      <div className="overflow-hidden rounded-xl border border-line bg-surface">
        <div
          ref={scrollRef}
          className={cn(
            "relative overflow-auto",
            shouldVirtualize ? "max-h-[68vh]" : "max-h-[74vh]",
          )}
        >
          {pending && data.length === 0 ? (
            <TableSkeleton cols={columnCount} />
          ) : rows.length === 0 ? (
            <EmptyState title={emptyTitle} body={emptyBody} action={emptyAction} />
          ) : (
            <table className="w-full border-collapse text-sm">
              <thead className="sticky top-0 z-10 bg-surface-muted/95 backdrop-blur">
                {table.getHeaderGroups().map((headerGroup) => (
                  <tr key={headerGroup.id}>
                    {headerGroup.headers.map((header) => {
                      const meta = header.column.columnDef.meta as
                        | ColumnMetaConfig
                        | undefined;
                      const sortKey = meta?.sortKey;
                      const active = sortKey && sort === sortKey;

                      return (
                        <th
                          key={header.id}
                          scope="col"
                          aria-sort={
                            active
                              ? dir === "asc"
                                ? "ascending"
                                : "descending"
                              : undefined
                          }
                          className={cn(
                            "whitespace-nowrap border-b border-line px-3 py-2.5 text-left text-[0.7rem] font-bold uppercase tracking-wider text-ink-soft",
                            meta?.align === "right" && "text-right",
                            meta?.align === "center" && "text-center",
                            meta?.hideOnMobile && "hidden md:table-cell",
                          )}
                        >
                          {header.isPlaceholder ? null : sortKey ? (
                            <button
                              type="button"
                              onClick={() => toggleSort(sortKey)}
                              className="inline-flex items-center gap-1.5 transition hover:text-brand-crimson"
                            >
                              {flexRender(
                                header.column.columnDef.header,
                                header.getContext(),
                              )}
                              {active ? (
                                dir === "asc" ? (
                                  <ArrowUp className="size-3" />
                                ) : (
                                  <ArrowDown className="size-3" />
                                )
                              ) : (
                                <ArrowUpDown className="size-3 opacity-40" />
                              )}
                            </button>
                          ) : (
                            flexRender(
                              header.column.columnDef.header,
                              header.getContext(),
                            )
                          )}
                        </th>
                      );
                    })}
                  </tr>
                ))}
              </thead>

              <tbody className={cn(pending && "opacity-60 transition-opacity")}>
                {paddingTop > 0 && (
                  <tr aria-hidden="true">
                    <td colSpan={columnCount} style={{ height: paddingTop }} />
                  </tr>
                )}

                {visibleRows.map((row) => (
                  <tr
                    key={row.id}
                    className={cn(
                      "border-b border-line/70 transition-colors last:border-0 hover:bg-surface-muted/60",
                      rowHref && "cursor-pointer",
                    )}
                    onClick={
                      rowHref
                        ? (event) => {
                            // Let buttons and links inside the row win.
                            if (
                              (event.target as HTMLElement).closest(
                                "a,button,input,[role=menu]",
                              )
                            )
                              return;
                            router.push(rowHref(row.original));
                          }
                        : undefined
                    }
                  >
                    {row.getVisibleCells().map((cell) => {
                      const meta = cell.column.columnDef.meta as
                        | ColumnMetaConfig
                        | undefined;
                      return (
                        <td
                          key={cell.id}
                          className={cn(
                            "px-3 py-2.5 align-middle text-ink",
                            meta?.align === "right" && "text-right",
                            meta?.align === "center" && "text-center",
                            meta?.hideOnMobile && "hidden md:table-cell",
                          )}
                        >
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      );
                    })}
                  </tr>
                ))}

                {paddingBottom > 0 && (
                  <tr aria-hidden="true">
                    <td colSpan={columnCount} style={{ height: paddingBottom }} />
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <DataTablePagination
        page={page}
        pageSize={pageSize}
        total={total}
        onChange={push}
        pending={pending}
      />
    </div>
  );
}
