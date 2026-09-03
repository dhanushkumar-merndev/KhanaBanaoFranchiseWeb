"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  ChevronDown,
  Copy,
  Eye,
  RotateCcw,
  Save,
  Send,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import {
  previewAgreementDocument,
  saveAgreementDocument,
  sendAgreementDocument,
} from "@/app/actions/agreements";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { AGREEMENT_CLAUSES } from "@/lib/agreement/clauses";
import {
  AGREEMENT_SECTIONS,
  type FieldDef,
} from "@/lib/agreement/fields";
import { formatDateTime } from "@/lib/format";

/**
 * Prepare the franchise agreement for one lead.
 *
 * Values arrive pre-filled from the applicant's own answers; everything stays
 * editable because the person on the phone often knows better than the form
 * did. Clause wording is separate and collapsed by default — rewriting a
 * clause is a deliberate act, not something to trip over while typing a PIN
 * code.
 */

export type AgreementDocumentState = {
  agreementId: string;
  agreementNumber: string;
  values: Record<string, string>;
  overrides: Record<string, string>;
  documentSentAt: string | null;
  canSend: boolean;
};

export function AgreementDocumentEditor({
  state,
}: {
  state: AgreementDocumentState;
}) {
  const router = useRouter();
  const [values, setValues] = useState(state.values);
  const [overrides, setOverrides] = useState(state.overrides);
  const [saving, setSaving] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [preview, setPreview] = useState<{ html: string; missing: string[] } | null>(
    null,
  );
  const [sendOpen, setSendOpen] = useState(false);
  const [sentUrl, setSentUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const dirty =
    JSON.stringify(values) !== JSON.stringify(state.values) ||
    JSON.stringify(overrides) !== JSON.stringify(state.overrides);

  const missing = useMemo(
    () =>
      AGREEMENT_SECTIONS.flatMap((section) => section.fields).filter(
        (field) => field.required && !values[field.key]?.trim(),
      ),
    [values],
  );

  const set = (key: string, value: string) =>
    setValues((current) => ({ ...current, [key]: value }));

  const save = async () => {
    setSaving(true);
    try {
      const result = await saveAgreementDocument(
        state.agreementId,
        values,
        overrides,
      );
      if (!result.ok) {
        toast.error(result.message);
        return false;
      }
      toast.success("Agreement saved.");
      router.refresh();
      return true;
    } finally {
      setSaving(false);
    }
  };

  const openPreview = async () => {
    setPreviewing(true);
    try {
      const result = await previewAgreementDocument(
        state.agreementId,
        values,
        overrides,
      );
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      setPreview(result.data);
    } finally {
      setPreviewing(false);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <CardTitle>Agreement document</CardTitle>
          <p className="mt-0.5 text-[0.78rem] text-ink-soft">
            {state.documentSentAt
              ? `Sent to the applicant ${formatDateTime(state.documentSentAt)}.`
              : "Filled in from the application. Check every value before sending."}
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Button
            size="sm"
            variant="ghost"
            loading={previewing}
            onClick={() => void openPreview()}
          >
            <Eye />
            Preview
          </Button>
          <Button
            size="sm"
            variant="outline"
            loading={saving}
            disabled={!dirty}
            onClick={() => void save()}
          >
            <Save />
            Save
          </Button>
          <Button
            size="sm"
            disabled={!state.canSend || missing.length > 0}
            onClick={() => setSendOpen(true)}
          >
            <Send />
            {state.documentSentAt ? "Resend" : "Send to applicant"}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {missing.length > 0 && (
          <p className="rounded-lg border border-warn/30 bg-warn/8 px-3 py-2 text-[0.8rem] leading-relaxed text-ink">
            <span className="font-semibold">
              {missing.length} {missing.length === 1 ? "field" : "fields"} still
              needed
            </span>{" "}
            before this can go to the applicant:{" "}
            {missing.map((field) => field.label).join(", ")}.
          </p>
        )}

        {AGREEMENT_SECTIONS.map((section) => (
          <section key={section.id} className="space-y-3">
            <h4 className="font-display text-[0.9rem] font-bold text-ink">
              {section.title}
            </h4>
            <div className="grid gap-3 sm:grid-cols-2">
              {section.fields.map((field) => (
                <FieldInput
                  key={field.key}
                  field={field}
                  value={values[field.key] ?? ""}
                  onChange={(value) => set(field.key, value)}
                />
              ))}
            </div>
          </section>
        ))}

        <ClauseOverrides overrides={overrides} onChange={setOverrides} />
      </CardContent>

      {preview && (
        <Dialog
          open={Boolean(preview)}
          onOpenChange={(open) => !open && setPreview(null)}
        >
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>Agreement preview</DialogTitle>
              <DialogDescription>
                Exactly what the applicant will see at their link.
              </DialogDescription>
            </DialogHeader>
            <DialogBody className="space-y-3">
              {preview.missing.length > 0 && (
                <p className="rounded-lg border border-warn/30 bg-warn/8 px-3 py-2 text-[0.8rem] text-ink">
                  Still blank: {preview.missing.join(", ")}.
                </p>
              )}
              {/* Sandboxed: clause overrides are admin-authored HTML. */}
              <iframe
                title="Agreement preview"
                srcDoc={preview.html}
                sandbox=""
                className="h-[34rem] w-full rounded-xl border border-line bg-white"
              />
            </DialogBody>
            <DialogFooter>
              <Button variant="outline" onClick={() => setPreview(null)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      <ConfirmDialog
        open={sendOpen}
        onOpenChange={setSendOpen}
        title={`Send ${state.agreementNumber} to the applicant?`}
        confirmLabel="Save and send"
        successMessage="Agreement sent."
        onConfirm={async () => {
          // Sending what is on screen, not what was last saved.
          if (dirty && !(await save())) {
            return { ok: false, message: "Could not save your changes." };
          }
          const result = await sendAgreementDocument(state.agreementId);
          if (result.ok) {
            setSentUrl(result.data.url);
            if (!result.data.emailSent) {
              toast.warning(
                "The agreement is ready, but the email did not go out. Share the link below.",
              );
            }
            router.refresh();
          }
          return result;
        }}
      >
        <p className="text-[0.82rem] leading-relaxed text-ink-soft">
          The applicant receives an email with a private link to this agreement,
          which they can read, print or save as a PDF. Any link sent earlier
          stops working. The agreement moves to <strong>Sent</strong>.
        </p>
      </ConfirmDialog>

      {sentUrl && (
        <CardContent className="pt-0">
          <div className="flex flex-wrap items-center gap-2 rounded-lg border border-ok/30 bg-ok/8 px-3 py-2">
            <span className="text-[0.78rem] font-semibold text-ink">
              Applicant link
            </span>
            <code className="min-w-0 flex-1 truncate font-mono text-[0.72rem] text-ink-soft">
              {sentUrl}
            </code>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                void navigator.clipboard.writeText(sentUrl);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
            >
              {copied ? <Check /> : <Copy />}
              {copied ? "Copied" : "Copy"}
            </Button>
          </div>
        </CardContent>
      )}
    </Card>
  );
}

function FieldInput({
  field,
  value,
  onChange,
}: {
  field: FieldDef;
  value: string;
  onChange: (value: string) => void;
}) {
  const id = `agr-${field.key}`;
  const wide = field.type === "textarea";

  return (
    <div className={wide ? "sm:col-span-2" : undefined}>
      <Field label={field.label} htmlFor={id} required={field.required} hint={field.hint}>
        {field.type === "select" ? (
          <Select id={id} value={value} onChange={(event) => onChange(event.target.value)}>
            <option value="">Select…</option>
            {field.options?.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </Select>
        ) : field.type === "textarea" ? (
          <Textarea
            id={id}
            rows={2}
            value={value}
            onChange={(event) => onChange(event.target.value)}
          />
        ) : (
          <Input
            id={id}
            type={field.type === "date" ? "date" : "text"}
            inputMode={
              field.type === "money" || field.type === "percent" ? "decimal" : undefined
            }
            value={value}
            onChange={(event) => onChange(event.target.value)}
          />
        )}
      </Field>
    </div>
  );
}

/**
 * Per-agreement clause rewrites.
 *
 * Collapsed and empty by default: the standard wording is what almost every
 * agreement should carry, and an override is a decision somebody should have
 * to make on purpose.
 */
function ClauseOverrides({
  overrides,
  onChange,
}: {
  overrides: Record<string, string>;
  onChange: (next: Record<string, string>) => void;
}) {
  const [open, setOpen] = useState(false);
  const count = Object.keys(overrides).length;

  return (
    <section className="rounded-xl border border-line">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
      >
        <span>
          <span className="font-display text-[0.9rem] font-bold text-ink">
            Clause wording
          </span>
          <span className="ml-2 text-[0.78rem] text-ink-soft">
            {count === 0
              ? "Standard wording throughout"
              : `${count} ${count === 1 ? "clause" : "clauses"} rewritten for this agreement`}
          </span>
        </span>
        <ChevronDown
          className={`size-4 shrink-0 text-ink-soft transition ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="space-y-2 border-t border-line px-4 py-3">
          <p className="text-[0.78rem] leading-relaxed text-ink-soft">
            Rewriting a clause changes it for this agreement only. Placeholders
            such as <code className="font-mono">{"{{approved_territory}}"}</code>{" "}
            still work. Leave a clause alone to use the standard text.
          </p>
          {AGREEMENT_CLAUSES.map((clause) => {
            const override = overrides[clause.id];
            return (
              <div key={clause.id} className="rounded-lg border border-line-soft p-2.5">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-[0.8rem] font-medium text-ink">
                    {clause.number ? `${clause.number}. ` : ""}
                    {clause.heading}
                  </p>
                  {override === undefined ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        onChange({ ...overrides, [clause.id]: clause.html.trim() })
                      }
                    >
                      <Sparkles />
                      Customise
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        const next = { ...overrides };
                        delete next[clause.id];
                        onChange(next);
                      }}
                    >
                      <RotateCcw />
                      Use standard
                    </Button>
                  )}
                </div>
                {override !== undefined && (
                  <Textarea
                    rows={8}
                    value={override}
                    onChange={(event) =>
                      onChange({ ...overrides, [clause.id]: event.target.value })
                    }
                    className="mt-2 font-mono text-[0.72rem]"
                  />
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
