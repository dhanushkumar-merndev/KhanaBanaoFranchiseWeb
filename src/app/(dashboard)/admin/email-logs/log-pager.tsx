"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { DataTablePagination } from "@/components/data-table/pagination";
import { buildTableQuery } from "@/lib/table/params";

/**
 * Paging for the log list, which renders as cards rather than a table and so
 * cannot use DataTable's built-in pager.
 */
export function LogPager({
  page,
  pageSize,
  total,
}: {
  page: number;
  pageSize: number;
  total: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  return (
    <DataTablePagination
      page={page}
      pageSize={pageSize}
      total={total}
      pending={pending}
      onChange={(patch) => {
        const query = buildTableQuery(new URLSearchParams(searchParams), patch);
        startTransition(() =>
          router.push(`${pathname}?${query}`, { scroll: false }),
        );
      }}
    />
  );
}
