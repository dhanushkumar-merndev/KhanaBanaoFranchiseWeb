"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2, TriangleAlert } from "lucide-react";
import { submitApplication } from "@/app/actions/applications";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, Input, Label, Select, Textarea } from "@/components/ui/field";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  applicationSchema,
  type ApplicationInput,
} from "@/lib/validation/application";
import { formatDateTime } from "@/lib/format";

const FRANCHISE_MODELS = [
  "Single territory",
  "Multi territory",
  "Master franchise",
  "Not sure yet",
];

const START_WINDOWS = [
  "Within 1 month",
  "1–3 months",
  "3–6 months",
  "More than 6 months",
];

function Section({
  step,
  title,
  description,
  children,
}: {
  step: number;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-line bg-surface p-5">
      <header className="mb-4 flex items-start gap-3">
        <span className="grid size-7 shrink-0 place-items-center rounded-full bg-brand-red text-[0.75rem] font-bold text-white">
          {step}
        </span>
        <div>
          <h2 className="font-display text-base font-bold text-ink">{title}</h2>
          {description && (
            <p className="mt-0.5 text-[0.78rem] text-ink-soft">{description}</p>
          )}
        </div>
      </header>
      <div className="grid gap-4 sm:grid-cols-2">{children}</div>
    </section>
  );
}

export function ApplicationForm({
  token,
  prefill,
}: {
  token: string;
  /** What we already know from the enquiry, so they retype as little as possible. */
  prefill: Partial<ApplicationInput>;
}) {
  const [submitted, setSubmitted] = useState<{
    applicationNumber: string;
    submittedAt: string;
  } | null>(null);
  const [reviewValues, setReviewValues] = useState<ApplicationInput | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ApplicationInput>({
    resolver: zodResolver(applicationSchema),
    defaultValues: {
      fullName: "",
      mobile: "",
      whatsapp: "",
      email: "",
      dateOfBirth: "",
      currentAddress: "",
      city: "",
      state: "",
      pinCode: "",
      currentOccupation: "",
      businessExperience: "",
      companyName: "",
      gstNumber: "",
      preferredCity: "",
      preferredTerritory: "",
      investmentBudget: "",
      franchiseModel: "",
      expectedStartDate: "",
      sourceOfInvestment: "",
      availableInvestmentAmount: "",
      bankName: "",
      informationTrue: false,
      consentToVerification: false,
      termsAccepted: false,
      ...prefill,
    },
  });

  const onSubmit = handleSubmit((values) => setReviewValues(values));

  const confirmSubmit = async () => {
    if (!reviewValues) {
      return { ok: false, message: "Review the application before submitting." };
    }

    const result = await submitApplication(token, reviewValues);

    if (result.ok) {
      setSubmitted(result.data);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return { ok: true };
    }

    if (result.fieldErrors) {
      for (const [field, message] of Object.entries(result.fieldErrors)) {
        setError(field as keyof ApplicationInput, { type: "server", message });
      }
    }
    setReviewValues(null);
    return result;
  };

  if (submitted) {
    return (
      <SubmittedNotice
        applicationNumber={submitted.applicationNumber}
        submittedAt={submitted.submittedAt}
      />
    );
  }

  const errorCount = Object.keys(errors).length;

  return (
    <>
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <Section
        step={1}
        title="Personal information"
        description="As it appears on your ID documents."
      >
        <Field label="Full name" htmlFor="a-name" required error={errors.fullName?.message}>
          <Input id="a-name" placeholder="e.g. Ramesh Iyer" autoComplete="name" aria-invalid={Boolean(errors.fullName)} {...register("fullName")} />
        </Field>

        <Field label="Date of birth" htmlFor="a-dob" required error={errors.dateOfBirth?.message}>
          <Input id="a-dob" type="date" aria-invalid={Boolean(errors.dateOfBirth)} {...register("dateOfBirth")} />
        </Field>

        <Field label="Mobile number" htmlFor="a-mobile" required error={errors.mobile?.message}>
          <Input id="a-mobile" type="tel" inputMode="tel" placeholder="e.g. +91 98765 43210" autoComplete="tel" aria-invalid={Boolean(errors.mobile)} {...register("mobile")} />
        </Field>

        <Field label="WhatsApp number" htmlFor="a-whatsapp" error={errors.whatsapp?.message} hint="Leave blank if the same as above.">
          <Input id="a-whatsapp" type="tel" inputMode="tel" placeholder="e.g. +91 98765 43210" aria-invalid={Boolean(errors.whatsapp)} {...register("whatsapp")} />
        </Field>

        <Field label="Email" htmlFor="a-email" required error={errors.email?.message} className="sm:col-span-2">
          <Input id="a-email" type="email" placeholder="e.g. ramesh@example.com" autoComplete="email" aria-invalid={Boolean(errors.email)} {...register("email")} />
        </Field>
      </Section>

      <Section step={2} title="Address details">
        <Field label="Current address" htmlFor="a-address" required error={errors.currentAddress?.message} className="sm:col-span-2">
          <Textarea id="a-address" rows={2} placeholder="e.g. 12, MG Road, Indiranagar" autoComplete="street-address" aria-invalid={Boolean(errors.currentAddress)} {...register("currentAddress")} />
        </Field>

        <Field label="City" htmlFor="a-city" required error={errors.city?.message}>
          <Input id="a-city" placeholder="e.g. Bengaluru" autoComplete="address-level2" aria-invalid={Boolean(errors.city)} {...register("city")} />
        </Field>

        <Field label="State" htmlFor="a-state" required error={errors.state?.message}>
          <Input id="a-state" placeholder="e.g. Karnataka" autoComplete="address-level1" aria-invalid={Boolean(errors.state)} {...register("state")} />
        </Field>

        <Field label="PIN code" htmlFor="a-pin" required error={errors.pinCode?.message}>
          <Input id="a-pin" inputMode="numeric" maxLength={6} placeholder="e.g. 560038" autoComplete="postal-code" aria-invalid={Boolean(errors.pinCode)} {...register("pinCode")} />
        </Field>
      </Section>

      <Section step={3} title="Business information">
        <Field label="Current occupation" htmlFor="a-occupation" required error={errors.currentOccupation?.message}>
          <Input id="a-occupation" placeholder="e.g. Restaurant owner" aria-invalid={Boolean(errors.currentOccupation)} {...register("currentOccupation")} />
        </Field>

        <Field label="Company name" htmlFor="a-company" error={errors.companyName?.message} hint="If you run a registered business.">
          <Input id="a-company" placeholder="e.g. ABC Foods Pvt. Ltd." {...register("companyName")} />
        </Field>

        <Field label="GST number" htmlFor="a-gst" error={errors.gstNumber?.message} hint="15 characters. Leave blank if not registered.">
          <Input id="a-gst" maxLength={15} placeholder="e.g. 29AAAAA0000A1Z5" className="uppercase" aria-invalid={Boolean(errors.gstNumber)} {...register("gstNumber")} />
        </Field>

        <Field label="Business experience" htmlFor="a-experience" error={errors.businessExperience?.message} className="sm:col-span-2">
          <Textarea id="a-experience" rows={3} placeholder="e.g. 5 years running a restaurant or retail business" {...register("businessExperience")} />
        </Field>
      </Section>

      <Section step={4} title="Franchise details" description="Where and how you would like to operate.">
        <Field label="Preferred city" htmlFor="a-pref-city" required error={errors.preferredCity?.message}>
          <Input id="a-pref-city" placeholder="e.g. Bengaluru" aria-invalid={Boolean(errors.preferredCity)} {...register("preferredCity")} />
        </Field>

        <Field label="Preferred territory" htmlFor="a-territory" error={errors.preferredTerritory?.message}>
          <Input id="a-territory" placeholder="e.g. Coimbatore South" {...register("preferredTerritory")} />
        </Field>

        <Field label="Investment budget" htmlFor="a-budget" required error={errors.investmentBudget?.message}>
          <Input id="a-budget" placeholder="e.g. ₹3–5 lakh" aria-invalid={Boolean(errors.investmentBudget)} {...register("investmentBudget")} />
        </Field>

        <Field label="Franchise model" htmlFor="a-model" error={errors.franchiseModel?.message}>
          <Select id="a-model" {...register("franchiseModel")}>
            <option value="">Select a franchise model…</option>
            {FRANCHISE_MODELS.map((model) => (
              <option key={model} value={model}>{model}</option>
            ))}
          </Select>
        </Field>

        <Field label="Expected start date" htmlFor="a-start" error={errors.expectedStartDate?.message}>
          <Select id="a-start" {...register("expectedStartDate")}>
            <option value="">Select a start window…</option>
            {START_WINDOWS.map((window) => (
              <option key={window} value={window}>{window}</option>
            ))}
          </Select>
        </Field>
      </Section>

      <Section step={5} title="Financial details">
        <Field label="Source of investment" htmlFor="a-source" required error={errors.sourceOfInvestment?.message}>
          <Input id="a-source" placeholder="e.g. Personal savings, bank loan" aria-invalid={Boolean(errors.sourceOfInvestment)} {...register("sourceOfInvestment")} />
        </Field>

        <Field label="Available investment amount" htmlFor="a-available" required error={errors.availableInvestmentAmount?.message}>
          <Input id="a-available" placeholder="e.g. ₹4,00,000" aria-invalid={Boolean(errors.availableInvestmentAmount)} {...register("availableInvestmentAmount")} />
        </Field>

        <Field label="Bank name" htmlFor="a-bank" error={errors.bankName?.message} className="sm:col-span-2">
          <Input id="a-bank" placeholder="e.g. State Bank of India" {...register("bankName")} />
        </Field>
      </Section>

      <section className="rounded-2xl border border-line bg-surface p-5">
        <header className="mb-4 flex items-start gap-3">
          <span className="grid size-7 shrink-0 place-items-center rounded-full bg-brand-red text-[0.75rem] font-bold text-white">
            6
          </span>
          <div>
            <h2 className="font-display text-base font-bold text-ink">Declaration</h2>
            <p className="mt-0.5 text-[0.78rem] text-ink-soft">
              All three are required before you can submit.
            </p>
          </div>
        </header>

        <div className="space-y-3">
          {(
            [
              ["informationTrue", "The information I have given is true and correct to the best of my knowledge."],
              ["consentToVerification", "I consent to Khana Banao verifying the details and documents I provide."],
              ["termsAccepted", "I have read and accept the franchise terms, including the applicable franchise investment and royalty."],
            ] as const
          ).map(([name, text]) => (
            <div key={name}>
              <Label htmlFor={`a-${name}`} className="mb-0 flex cursor-pointer items-start gap-2.5 font-normal">
                <Checkbox
                  id={`a-${name}`}
                  className="mt-0.5"
                  aria-invalid={Boolean(errors[name])}
                  {...register(name)}
                />
                <span className="text-[0.82rem] leading-relaxed text-ink">{text}</span>
              </Label>
              {errors[name]?.message && (
                <p role="alert" className="ml-7 mt-1 text-[0.72rem] font-medium text-danger">
                  {errors[name]?.message}
                </p>
              )}
            </div>
          ))}
        </div>
      </section>

      {errorCount > 0 && (
        <p role="alert" className="rounded-lg border border-danger/25 bg-danger/5 px-3.5 py-2.5 text-[0.8rem] text-ink">
          {errorCount === 1
            ? "One field needs your attention — it is highlighted above."
            : `${errorCount} fields need your attention — they are highlighted above.`}
        </p>
      )}

      <div className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-5 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[0.78rem] leading-relaxed text-ink-soft">
          You can only submit once. Please check your answers before continuing.
        </p>
        <Button type="submit" size="lg" loading={isSubmitting} className="shrink-0">
          Submit application
        </Button>
      </div>
      </form>

      <ConfirmDialog
        open={Boolean(reviewValues)}
        onOpenChange={(open) => !open && setReviewValues(null)}
        title="Submit your franchise application?"
        description="Please confirm that every detail is complete and correct."
        confirmLabel="Submit application"
        onConfirm={confirmSubmit}
      >
        <div className="space-y-3">
          <div className="flex gap-3 rounded-xl border border-warn/30 bg-warn/10 px-3.5 py-3">
            <TriangleAlert className="mt-0.5 size-5 shrink-0 text-[#9a6410]" />
            <div>
              <p className="text-[0.82rem] font-semibold text-ink">
                You cannot edit the application after submission.
              </p>
              <p className="mt-1 text-[0.75rem] leading-relaxed text-ink-soft">
                Go back and check any details now. Once submitted, contact the
                Khana Banao team if something needs to be corrected.
              </p>
            </div>
          </div>
          <p className="text-[0.78rem] leading-relaxed text-ink-soft">
            By continuing, you confirm that the information and declarations
            in this application are accurate.
          </p>
        </div>
      </ConfirmDialog>
    </>
  );
}

export function SubmittedNotice({
  applicationNumber,
  submittedAt,
}: {
  applicationNumber: string;
  submittedAt: string | null;
}) {
  return (
    <div className="rounded-2xl border border-ok/30 bg-surface px-6 py-12 text-center">
      <span className="mx-auto grid size-14 place-items-center rounded-full bg-ok/12 text-[#217a33]">
        <CheckCircle2 className="size-7" />
      </span>

      <h1 className="mt-4 font-display text-2xl font-bold text-ink">
        Application submitted successfully
      </h1>
      <p className="mx-auto mt-2 max-w-md text-[0.85rem] leading-relaxed text-ink-soft">
        Thank you. Our franchise team will review your application and get in
        touch about the next step, which is sharing your documents.
      </p>

      <dl className="mx-auto mt-6 grid max-w-sm gap-3 text-left sm:grid-cols-2">
        <div className="rounded-xl border border-line px-4 py-3">
          <dt className="text-[0.68rem] font-semibold uppercase tracking-wide text-ink-soft">
            Application number
          </dt>
          <dd className="mt-0.5 font-mono text-[0.9rem] font-bold text-ink">
            {applicationNumber}
          </dd>
        </div>
        <div className="rounded-xl border border-line px-4 py-3">
          <dt className="text-[0.68rem] font-semibold uppercase tracking-wide text-ink-soft">
            Submitted
          </dt>
          <dd className="mt-0.5 text-[0.85rem] font-medium text-ink">
            {formatDateTime(submittedAt)}
          </dd>
        </div>
      </dl>

      <p className="mt-6 text-[0.75rem] text-ink-soft">
        Please keep your application number for reference.
      </p>
    </div>
  );
}
