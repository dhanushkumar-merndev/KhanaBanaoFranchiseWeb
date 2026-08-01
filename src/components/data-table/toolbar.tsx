"use client";

import { useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import type { Table } from "@tanstack/react-table";
import { Check, Search, SlidersHorizontal, X } from "lucide-react";
import { Select } from "@/components/ui/field";
import { cn } from "@/lib/utils";

export type FilterConfig = {
  /** Query-string key, e.g. `status`. */
  key: string;
  label: string;
  options: { value: string; label: string }[];
};

type Patch = Record<string, string | number | null>;

export function DataTableToolbar<T>({
  table,
  filters = [],
  searchPlaceholder = "Search…",
  searchable = true,
  onChange,
  actions,
}: {
  table: Table<T>;
  filters?: FilterConfig[];
  searchPlaceholder?: string;
  /** Hide the search box on views the server cannot text-search. */
  searchable?: boolean;
  onChange: (patch: Patch) => void;
  actions?: React.ReactNode;
}) {
  const searchParams = useSearchParams();
  const urlQuery = searchParams.get("q") ?? "";
  const [query, setQuery] = useState(urlQuery);
  const [lastUrlQuery, setLastUrlQuery] = useState(urlQuery);
  const debounce = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Keep in step when the URL changes from elsewhere (back button, Clear).
  // Adjusted during render rather than in an effect, so the input never
  // paints one frame with the stale value.
  if (urlQuery !== lastUrlQuery) {
    setLastUrlQuery(urlQuery);
    setQuery(urlQuery);
  }

  const onQueryChange = (value: string) => {
    setQuery(value);
    clearTimeout(debounce.current);
    debounce.current = setTimeout(() => onChange({ q: value || null }), 350);
  };

  const activeFilters = filters.filter((f) => searchParams.get(f.key));
  const hasActive = activeFilters.length > 0 || Boolean(searchParams.get("q"));

  const hideableColumns = table
    .getAllColumns()
    .filter(
      (column) =>
        column.getCanHide() &&
        !(column.columnDef.meta as { locked?: boolean } | undefined)?.locked,
    );

  return (
    <div className="flex flex-wrap items-center gap-2">
      {searchable && (
        <div className="relative min-w-[12rem] flex-1 sm:max-w-xs">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-soft"
            aria-hidden="true"
          />
          <input
            type="search"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder={searchPlaceholder}
            aria-label={searchPlaceholder}
            className="h-9 w-full rounded-lg border border-line bg-surface pl-9 pr-3 text-sm text-ink placeholder:text-ink-soft/60 focus:border-brand-red focus:outline-none focus:ring-2 focus:ring-brand-red/20"
          />
        </div>
      )}

      {filters.map((filter) => (
        <Select
          key={filter.key}
          aria-label={filter.label}
          value={searchParams.get(filter.key) ?? ""}
          onChange={(event) =>
            onChange({ [filter.key]: event.target.value || null })
          }
          className={cn(
            "h-9 w-auto min-w-[9rem] text-[0.8rem]",
            searchParams.get(filter.key) && "border-brand-red/50 bg-brand-red/5",
          )}
        >
          <option value="">{filter.label}: all</option>
          {filter.options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
      ))}

      {hasActive && (
        <button
          type="button"
          onClick={() =>
            onChange({
              q: null,
              ...Object.fromEntries(filters.map((f) => [f.key, null])),
            })
          }
          className="inline-flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-[0.78rem] font-medium text-ink-soft transition hover:bg-surface-muted hover:text-ink"
        >
          <X className="size-3.5" />
          Clear
        </button>
      )}

      <div className="ml-auto flex items-center gap-2">
        {actions}

        {hideableColumns.length > 0 && (
          <DropdownMenu.Root>
            <DropdownMenu.Trigger className="inline-flex h-9 items-center gap-2 rounded-lg border border-line bg-surface px-3 text-[0.78rem] font-medium text-ink transition hover:bg-surface-muted">
              <SlidersHorizontal className="size-3.5" />
              <span className="hidden sm:inline">Columns</span>
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content
                align="end"
                sideOffset={6}
                className="z-50 min-w-[12rem] rounded-xl border border-line bg-surface p-1.5 shadow-xl"
              >
                {hideableColumns.map((column) => {
                  const label =
                    typeof column.columnDef.header === "string"
                      ? column.columnDef.header
                      : column.id;
                  return (
                    <DropdownMenu.CheckboxItem
                      key={column.id}
                      checked={column.getIsVisible()}
                      onCheckedChange={(value) => column.toggleVisibility(!!value)}
                      className="flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 text-[0.8rem] text-ink outline-none data-[highlighted]:bg-surface-muted"
                    >
                      <span className="grid size-4 place-items-center rounded border border-line">
                        <DropdownMenu.ItemIndicator>
                          <Check className="size-3 text-brand-crimson" strokeWidth={3} />
                        </DropdownMenu.ItemIndicator>
                      </span>
                      {label}
                    </DropdownMenu.CheckboxItem>
                  );
                })}
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
        )}
      </div>
    </div>
  );
}
