"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, RotateCcw, Save, Send } from "lucide-react";
import { toast } from "sonner";
import {
  previewEmailTemplate,
  resetEmailTemplate,
  sendTestEmail,
  setTemplateActive,
  updateEmailTemplate,
} from "@/app/actions/email-templates";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, Input, Textarea } from "@/components/ui/field";
import { TEMPLATE_VARIABLES } from "@/lib/email/render";
import { formatDateTime } from "@/lib/format";

export type TemplateRow = {
  id: string;
  template_key: string;
  name: string;
  subject: string;
  body_html: string;
  is_active: boolean;
  updated_at: string;
  updatedByName: string | null;
};

export function TemplateEditor({ template }: { template: TemplateRow }) {
  const router = useRouter();
  const [subject, setSubject] = useState(template.subject);
  const [body, setBody] = useState(template.body_html);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [previewOpen, setPreviewOpen] = useState(false);
  const [preview, setPreview] = useState<{
    subject: string;
    body: string;
    missing: string[];
  } | null>(null);
  const [testOpen, setTestOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [toggling, setToggling] = useState(false);

  const dirty =
    subject !== template.subject || body !== template.body_html;

  const save = async () => {
    setSaving(true);
    setErrors({});
    try {
      const result = await updateEmailTemplate(template.id, subject, body);
      if (!result.ok) {
        setErrors(result.fieldErrors ?? {});
        toast.error(result.message);
        return;
      }
      toast.success("Template saved.");
      router.refresh();
    } finally {
      setSaving(false);
    }
  };

  const openPreview = async () => {
    const result = await previewEmailTemplate(subject, body);
    if (!result.ok) {
      toast.error(result.message);
      return;
    }
    setPreview(result.data);
    setPreviewOpen(true);
  };

  const toggleActive = async () => {
    setToggling(true);
    try {
      const result = await setTemplateActive(template.id, !template.is_active);
      if (result.ok) {
        toast.success(
          template.is_active
            ? "Template deactivated. Sends will be skipped and logged."
            : "Template reactivated.",
        );
        router.refresh();
      } else {
        toast.error(result.message);
      }
    } finally {
      setToggling(false);
    }
  };

  /** Inserts a placeholder at the caret so it lands where the cursor is. */
  const insertVariable = (variable: string) => {
    const textarea = document.getElementById(
      `body-${template.id}`,
    ) as HTMLTextAreaElement | null;

    if (!textarea) {
      setBody((current) => `${current}{{${variable}}}`);
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const token = `{{${variable}}}`;
    setBody((current) => current.slice(0, start) + token + current.slice(end));

    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(start + token.length, start + token.length);
    });
  };

  return (
    <section className="rounded-xl border border-line bg-surface">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-4 py-3.5">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-display text-[0.95rem] font-bold text-ink">
              {template.name}
            </h2>
            <Badge tone={template.is_active ? "success" : "neutral"}>
              {template.is_active ? "Active" : "Deactivated"}
            </Badge>
            {dirty && <Badge tone="warn">Unsaved changes</Badge>}
          </div>
          <p className="mt-0.5 font-mono text-[0.68rem] uppercase text-ink-soft">
            {template.template_key}
          </p>
        </div>

        <div className="flex flex-wrap gap-1.5">
          <Button size="sm" variant="ghost" onClick={() => void openPreview()}>
            <Eye />
            Preview
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setTestOpen(true)}>
            <Send />
            Test
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setResetOpen(true)}>
            <RotateCcw />
            Reset
          </Button>
          <Button
            size="sm"
            variant="outline"
            loading={toggling}
            onClick={() => void toggleActive()}
          >
            {template.is_active ? "Deactivate" : "Activate"}
          </Button>
          <Button size="sm" loading={saving} disabled={!dirty} onClick={() => void save()}>
            <Save />
            Save
          </Button>
        </div>
      </header>

      <div className="space-y-4 px-4 py-4">
        <Field label="Subject" htmlFor={`subject-${template.id}`} required error={errors.subject}>
          <Input
            id={`subject-${template.id}`}
            value={subject}
            onChange={(event) => setSubject(event.target.value)}
            aria-invalid={Boolean(errors.subject)}
          />
        </Field>

        <Field
          label="Body"
          htmlFor={`body-${template.id}`}
          required
          error={errors.bodyHtml}
          hint="HTML is allowed. Variable values are escaped automatically before sending."
        >
          <Textarea
            id={`body-${template.id}`}
            rows={10}
            value={body}
            onChange={(event) => setBody(event.target.value)}
            className="font-mono text-[0.78rem]"
            aria-invalid={Boolean(errors.bodyHtml)}
          />
        </Field>

        <div>
          <p className="mb-1.5 text-[0.72rem] font-semibold uppercase tracking-wide text-ink-soft">
            Insert a variable
          </p>
          <div className="flex flex-wrap gap-1.5">
            {TEMPLATE_VARIABLES.map((variable) => (
              <button
                key={variable}
                type="button"
                onClick={() => insertVariable(variable)}
                className="rounded-lg border border-line bg-surface px-2 py-1 font-mono text-[0.68rem] text-ink transition hover:border-brand-red/40 hover:bg-brand-red/5"
              >
                {`{{${variable}}}`}
              </button>
            ))}
          </div>
        </div>

        <p className="text-[0.7rem] text-ink-soft">
          Last updated {formatDateTime(template.updated_at)}
          {template.updatedByName && ` by ${template.updatedByName}`}
        </p>
      </div>

      {preview && (
        <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Preview</DialogTitle>
              <DialogDescription>
                Rendered with sample values — this is not sent to anyone.
              </DialogDescription>
            </DialogHeader>
            <DialogBody className="space-y-3">
              {preview.missing.length > 0 && (
                <p className="rounded-lg border border-warn/30 bg-warn/8 px-3 py-2 text-[0.8rem] text-ink">
                  <span className="font-semibold">Unknown placeholders:</span>{" "}
                  {preview.missing.map((name) => `{{${name}}}`).join(", ")} — these
                  will appear literally in the sent email. Check for a typo.
                </p>
              )}
              <p className="text-[0.85rem] font-semibold text-ink">
                {preview.subject}
              </p>
              {/*
                Rendered in a sandboxed frame rather than injected into the
                page: it shows the real branded document (logo, header, footer)
                at its own widths, and admin-authored HTML cannot reach the
                dashboard's DOM or scripts.
              */}
              <iframe
                title="Email preview"
                srcDoc={preview.body}
                sandbox=""
                className="h-[26rem] w-full rounded-xl border border-line bg-white"
              />
            </DialogBody>
            <DialogFooter>
              <Button variant="outline" onClick={() => setPreviewOpen(false)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {testOpen && (
        <TestSendDialog
          templateKey={template.template_key}
          subject={subject}
          body={body}
          onClose={() => setTestOpen(false)}
        />
      )}

      <ConfirmDialog
        open={resetOpen}
        onOpenChange={setResetOpen}
        variant="danger"
        title={`Reset "${template.name}" to its default?`}
        confirmLabel="Reset"
        successMessage="Template reset to its default wording."
        onConfirm={async () => {
          const result = await resetEmailTemplate(template.id);
          if (result.ok) {
            // Seeded at mount, so a refresh alone would leave the edited text
            // on screen — take the restored wording from the action instead.
            setSubject(result.data.subject);
            setBody(result.data.bodyHtml);
            router.refresh();
          }
          return result;
        }}
      >
        <p className="text-[0.82rem] leading-relaxed text-ink-soft">
          Your edits to the subject and body are replaced by the wording this
          system shipped with. This cannot be undone.
        </p>
      </ConfirmDialog>
    </section>
  );
}

function TestSendDialog({
  templateKey,
  subject,
  body,
  onClose,
}: {
  templateKey: string;
  subject: string;
  body: string;
  onClose: () => void;
}) {
  const [email, setEmail] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const send = async () => {
    setPending(true);
    setError(undefined);
    try {
      const result = await sendTestEmail(templateKey, email, subject, body);
      if (!result.ok) {
        setError(result.fieldErrors?.testEmail);
        toast.error(result.message);
        return;
      }
      toast.success(`Test email sent to ${email}.`);
      onClose();
    } finally {
      setPending(false);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && !pending && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Send a test email</DialogTitle>
          <DialogDescription>
            Sends what is on screen right now, including unsaved edits, with
            sample values filled in.
          </DialogDescription>
        </DialogHeader>

        <DialogBody>
          <Field label="Send to" htmlFor="test-email" required error={error}>
            <Input
              id="test-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              aria-invalid={Boolean(error)}
            />
          </Field>
        </DialogBody>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <Button loading={pending} onClick={() => void send()}>
            <Send />
            Send test
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
