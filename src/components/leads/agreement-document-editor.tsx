"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronDown,
  Download,
  RotateCcw,
  Save,
  Send,
  Sparkles,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import {
  downloadAgreementDocument,
  saveAgreementDocument,
  sendAgreementDocument,
  uploadFranchisorSignature,
} from "@/app/actions/agreements";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
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
  franchisorSignatureFileName: string | null;
  canUploadSignature: boolean;
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
  const [downloading, setDownloading] = useState(false);
  const [sendOpen, setSendOpen] = useState(false);
  const [signatureFileName, setSignatureFileName] = useState(
    state.franchisorSignatureFileName,
  );

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

  const download = async () => {
    setDownloading(true);
    try {
      if (dirty && !(await save())) return;
      const result = await downloadAgreementDocument(state.agreementId);
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      const binary = atob(result.data.content);
      const bytes = new Uint8Array(binary.length);
      for (let index = 0; index < binary.length; index += 1) {
        bytes[index] = binary.charCodeAt(index);
      }
      const url = URL.createObjectURL(
        new Blob([bytes], { type: "application/pdf" }),
      );
      const anchor = window.document.createElement("a");
      anchor.href = url;
      anchor.download = result.data.fileName;
      anchor.click();
      URL.revokeObjectURL(url);
      toast.success("Agreement PDF downloaded.");
    } finally {
      setDownloading(false);
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
            loading={downloading}
            onClick={() => void download()}
          >
            <Download />
            Download agreement
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
            disabled={!state.canSend || missing.length > 0 || !signatureFileName}
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
              {section.id === "signatures" && (
                <FranchisorSignatureUpload
                  agreementId={state.agreementId}
                  fileName={signatureFileName}
                  canUpload={state.canUploadSignature}
                  onUploaded={setSignatureFileName}
                />
              )}
            </div>
          </section>
        ))}

        <ClauseOverrides overrides={overrides} onChange={setOverrides} />
      </CardContent>

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
            if (!result.data.emailSent) {
              toast.warning(
                "The PDF is ready, but the email provider did not send it. Download it and send it manually.",
              );
            }
            router.refresh();
          }
          return result;
        }}
      >
        <p className="text-[0.82rem] leading-relaxed text-ink-soft">
          The applicant receives one personalised PDF with the uploaded Khana
          Banao signature embedded on the franchisor signature line. There is
          no web-page link or “Open agreement” button. The agreement moves to
          <strong> Sent</strong>.
        </p>
      </ConfirmDialog>
    </Card>
  );
}

function FranchisorSignatureUpload({
  agreementId,
  fileName,
  canUpload,
  onUploaded,
}: {
  agreementId: string;
  fileName: string | null;
  canUpload: boolean;
  onUploaded: (fileName: string) => void;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const upload = async (file: File) => {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.set("signature", file);
      const result = await uploadFranchisorSignature(agreementId, formData);
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      onUploaded(result.data.fileName);
      toast.success("Khana Banao signature uploaded and added to the PDF.");
      router.refresh();
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="sm:col-span-2 rounded-lg border border-line bg-surface-muted/40 p-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[0.78rem] font-semibold text-ink">
            Khana Banao authorised signature <span className="text-danger">*</span>
          </p>
          <p className="mt-0.5 text-[0.72rem] leading-relaxed text-ink-soft">
            {fileName
              ? `${fileName} will be embedded on the franchisor signature line.`
              : "Upload a transparent PNG or JPG, up to 2 MB, before sending."}
          </p>
        </div>
        {canUpload ? (
          <>
            <input
              ref={inputRef}
              type="file"
              accept="image/png,image/jpeg"
              className="sr-only"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void upload(file);
              }}
            />
            <Button
              type="button"
              size="sm"
              variant="outline"
              loading={uploading}
              onClick={() => inputRef.current?.click()}
            >
              <Upload />
              {fileName ? "Replace signature" : "Upload signature"}
            </Button>
          </>
        ) : (
          <span className="text-[0.72rem] font-medium text-ink-soft">
            An administrator must upload the company signature.
          </span>
        )}
      </div>
    </div>
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
