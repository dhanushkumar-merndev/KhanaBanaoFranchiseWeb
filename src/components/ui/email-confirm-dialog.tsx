"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Mail, MailX } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
export type EmailConfirmProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  /** Fields the action needs, e.g. a mandatory reason. */
  children?: React.ReactNode;
  /** Preview of what would be emailed, so nobody sends blind. */
  preview?: { subject: string; body: string; to: string } | null;
  confirmLabel?: string;
  withoutEmailLabel?: string;
  variant?: "primary" | "danger" | "success";
  /**
   * Called with the admin's choice. Resolve `{ ok: false }` to stay open and
   * surface the message. Deliberately looser than `ActionResult<T>` so any
   * action can be passed regardless of what it returns on success.
   */
  onConfirm: (
    sendEmail: boolean,
  ) => Promise<{ ok: boolean; message?: string } | void>;
  successMessage?: string;
  /** Block confirmation until required fields are filled. */
  disabled?: boolean;
};

/**
 * The confirmation pattern spec §21 mandates for every approval and important
 * change: [Approve and Send Email] [Approve Without Email] [Cancel].
 *
 * The email is always a deliberate choice, never a side effect — and because
 * a send never rolls back the business action, the two buttons differ only in
 * whether an email goes out, not in what gets recorded.
 */
export function EmailConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  preview,
  confirmLabel = "Approve",
  withoutEmailLabel,
  variant = "primary",
  onConfirm,
  successMessage,
  disabled,
}: EmailConfirmProps) {
  const router = useRouter();
  const [pending, setPending] = useState<"email" | "silent" | null>(null);

  const run = async (sendEmail: boolean) => {
    setPending(sendEmail ? "email" : "silent");
    try {
      const result = await onConfirm(sendEmail);
      if (result && result.ok === false) {
        toast.error(result.message);
        return;
      }
      if (successMessage) toast.success(successMessage);
      router.refresh();
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "That did not work.");
    } finally {
      setPending(null);
    }
  };

  const busy = pending !== null;

  return (
    <Dialog open={open} onOpenChange={(next) => !busy && onOpenChange(next)}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>

        <DialogBody className="space-y-4">
          {children}

          {preview && (
            <section className="rounded-xl border border-line bg-surface-muted/50">
              <header className="border-b border-line px-3.5 py-2.5">
                <p className="text-[0.68rem] font-bold uppercase tracking-wide text-ink-soft">
                  Email preview
                </p>
                <p className="mt-1 text-[0.78rem] text-ink">
                  <span className="text-ink-soft">To:</span> {preview.to}
                </p>
                <p className="text-[0.78rem] font-semibold text-ink">
                  {preview.subject}
                </p>
              </header>
              <div
                className="max-h-52 overflow-y-auto px-3.5 py-3 text-[0.78rem] leading-relaxed text-ink [&_a]:text-brand-crimson [&_a]:underline"
                // Template bodies are authored by admins and their variables
                // are HTML-escaped at render time (see lib/email/render.ts).
                dangerouslySetInnerHTML={{ __html: preview.body }}
              />
            </section>
          )}
        </DialogBody>

        <DialogFooter className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <Button
            type="button"
            className="w-full"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={busy}
          >
            Cancel
          </Button>
          <Button
            type="button"
            className="w-full"
            variant="secondary"
            loading={pending === "silent"}
            disabled={busy || disabled}
            onClick={() => void run(false)}
          >
            <MailX />
            {withoutEmailLabel ?? `${confirmLabel} without email`}
          </Button>
          <Button
            type="button"
            className="w-full sm:col-span-2"
            variant={variant === "danger" ? "danger" : variant === "success" ? "success" : "primary"}
            loading={pending === "email"}
            disabled={busy || disabled}
            onClick={() => void run(true)}
          >
            <Mail />
            {confirmLabel} and send email
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
