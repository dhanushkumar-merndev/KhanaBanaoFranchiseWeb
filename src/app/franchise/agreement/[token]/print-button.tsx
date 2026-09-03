"use client";

import { Printer } from "lucide-react";

/**
 * The only interactive part of the customer's agreement page.
 *
 * Deliberately the browser's own print dialog rather than a generated file:
 * "Save as PDF" is available from it on every desktop and mobile browser, and
 * it keeps the agreement a server-rendered document with nothing to download.
 */
export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-[0.85rem] font-semibold text-[#8e1218] transition hover:bg-[#f7efe2] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
    >
      <Printer className="size-4" />
      Print or save as PDF
    </button>
  );
}
