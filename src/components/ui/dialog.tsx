"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;

export function DialogContent({
  className,
  children,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content>) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-brand-maroon-dark/35 backdrop-blur-[2px] data-[state=closed]:animate-out data-[state=closed]:fade-out data-[state=open]:animate-in data-[state=open]:fade-in" />
      <DialogPrimitive.Content
        className={cn(
          "fixed left-1/2 top-1/2 z-50 grid max-h-[92dvh] w-[calc(100vw-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 grid-cols-[minmax(0,1fr)] grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden rounded-2xl border border-line bg-surface shadow-2xl focus:outline-none [&>form]:contents",
          className,
        )}
        {...props}
      >
        {children}
        <DialogPrimitive.Close
          aria-label="Close"
          className="absolute right-4 top-4 grid size-8 place-items-center rounded-full text-ink-soft transition hover:bg-surface-muted hover:text-ink"
        >
          <X className="size-4" />
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

export function DialogHeader({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("min-w-0 border-b border-line px-6 py-4 pr-14", className)}
      {...props}
    />
  );
}

export function DialogTitle({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      className={cn("font-display text-lg font-bold text-ink", className)}
      {...props}
    />
  );
}

export function DialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      className={cn("mt-1 text-[0.8rem] leading-relaxed text-ink-soft", className)}
      {...props}
    />
  );
}

export function DialogBody({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "min-h-0 min-w-0 overflow-y-auto overscroll-contain px-6 py-5",
        className,
      )}
      {...props}
    />
  );
}

export function DialogFooter({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "flex min-w-0 flex-col-reverse gap-2 border-t border-line bg-surface-muted/50 px-6 py-4 sm:flex-row sm:flex-wrap sm:justify-end [&>*]:h-auto [&>*]:min-h-10 [&>*]:min-w-0 [&>*]:max-w-full [&>*]:whitespace-normal [&>*]:py-2",
        className,
      )}
      {...props}
    />
  );
}
