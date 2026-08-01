import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** `1234` -> `1,234` (Indian grouping). */
export function formatNumber(value: number) {
  return new Intl.NumberFormat("en-IN").format(value);
}

/** `50000` -> `₹50,000`. */
export function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}
