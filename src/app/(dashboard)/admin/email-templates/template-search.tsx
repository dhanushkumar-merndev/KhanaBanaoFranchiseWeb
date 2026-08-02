"use client";

import { useRef, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";

/** Search across template names, keys, subjects and bodies. */
export function TemplateSearch() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const urlQuery = searchParams.get("q") ?? "";
  const [query, setQuery] = useState(urlQuery);
  const [lastUrlQuery, setLastUrlQuery] = useState(urlQuery);
  const debounce = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Adjusted during render rather than in an effect, so the input never paints
  // one frame with the stale value.
  if (urlQuery !== lastUrlQuery) {
    setLastUrlQuery(urlQuery);
    setQuery(urlQuery);
  }

  const push = (value: string) => {
    const next = new URLSearchParams(searchParams.toString());
    if (value) next.set("q", value);
    else next.delete("q");
    startTransition(() =>
      router.replace(`${pathname}?${next.toString()}`, { scroll: false }),
    );
  };

  const onChange = (value: string) => {
    setQuery(value);
    clearTimeout(debounce.current);
    debounce.current = setTimeout(() => push(value), 300);
  };

  return (
    <div className="flex items-center gap-2">
      <div className="relative min-w-[12rem] flex-1 sm:max-w-sm">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-soft"
          aria-hidden="true"
        />
        <input
          type="search"
          value={query}
          onChange={(event) => onChange(event.target.value)}
          placeholder="Search templates…"
          aria-label="Search templates"
          className="h-9 w-full rounded-lg border border-line bg-surface pl-9 pr-3 text-sm text-ink placeholder:text-ink-soft/60 focus:border-brand-red focus:outline-none focus:ring-2 focus:ring-brand-red/20"
        />
      </div>

      {query && (
        <button
          type="button"
          onClick={() => {
            setQuery("");
            push("");
          }}
          className="inline-flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-[0.78rem] font-medium text-ink-soft transition hover:bg-surface-muted hover:text-ink"
        >
          <X className="size-3.5" />
          Clear
        </button>
      )}
    </div>
  );
}
