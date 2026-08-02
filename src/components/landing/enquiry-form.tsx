"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CircleCheck, LoaderCircle, Send } from "lucide-react";
import { toast } from "sonner";
import { submitEnquiry } from "@/app/actions/enquiry";
import { Leaf } from "@/components/decor/leaf";
import { SectionHeading } from "@/components/landing/section-heading";
import { Reveal } from "@/components/motion/reveal";
import { site } from "@/lib/site";
import {
  INVESTMENT_RANGES,
  enquirySchema,
  type EnquiryInput,
} from "@/lib/validation/enquiry";
import { cn } from "@/lib/utils";

const fieldClass =
  "w-full rounded-xl border border-line bg-surface px-4 py-3 text-sm text-ink placeholder:text-ink-soft/60 transition focus:border-brand-red focus:outline-none focus:ring-2 focus:ring-brand-red/20 disabled:opacity-60";

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} role="alert" className="mt-1.5 text-[0.82rem] font-medium text-danger">
      {message}
    </p>
  );
}

export function EnquiryForm() {
  const [leadNumber, setLeadNumber] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<EnquiryInput>({
    resolver: zodResolver(enquirySchema),
    defaultValues: {
      fullName: "",
      phone: "",
      whatsapp: "",
      email: "",
      city: "",
      preferredTerritory: "",
      investmentRange: "",
      currentOccupation: "",
      existingBusiness: "",
      message: "",
      website: "",
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    const result = await submitEnquiry(values);

    if (result.ok) {
      setLeadNumber(result.leadNumber);
      reset();
      toast.success("Enquiry received — we'll call you shortly.");
      return;
    }

    if (result.fieldErrors) {
      for (const [field, message] of Object.entries(result.fieldErrors)) {
        setError(field as keyof EnquiryInput, { type: "server", message });
      }
    }
    toast.error(result.message);
  });

  return (
    <section id="enquiry" className="relative overflow-hidden py-20 md:py-24">
      <Leaf src="/decor/leaf-basil.svg" className="left-[1%] top-20 w-10 md:w-16" speed={0.12} rotate={-16} sway opacity={0.85} desktopOnly />
      <Leaf src="/decor/leaf-sprig.svg" className="-right-3 bottom-12 w-16 md:w-28" speed={-0.1} rotate={14} flip sway swayDelay={0.6} opacity={0.85} />

      <div className="shell relative max-w-4xl">
        <SectionHeading>Become a Franchise Partner</SectionHeading>
        <Reveal delay={80}>
          <p className="mx-auto mt-5 max-w-xl text-center text-[0.95rem] leading-relaxed text-ink-soft">
            Tell us a little about yourself. A franchise advisor will call you
            within one working day — no obligation, no pressure.
          </p>
        </Reveal>

        <Reveal delay={140} className="mt-10">
          {leadNumber ? (
            <div
              role="status"
              className="rounded-2xl border border-ok/25 bg-surface px-6 py-12 text-center shadow-[0_20px_46px_-34px_rgba(47,158,68,0.5)]"
            >
              <span className="mx-auto grid size-14 place-items-center rounded-full bg-ok/10 text-ok">
                <CircleCheck className="size-7" strokeWidth={1.8} />
              </span>
              <h3 className="mt-5 font-display text-xl font-bold text-ink">
                Thank you — we have your enquiry
              </h3>
              <p className="mx-auto mt-3 max-w-md text-[0.95rem] leading-relaxed text-ink-soft">
                Your reference is{" "}
                <strong className="font-semibold text-brand-crimson">
                  {leadNumber}
                </strong>
                . One of our franchise advisors will call you shortly. We have
                also emailed you a confirmation.
              </p>
              <div className="mt-7 flex flex-wrap justify-center gap-3">
                <a
                  href={site.whatsappHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-full bg-[#25D366] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#1eb857]"
                >
                  Message us on WhatsApp
                </a>
                <button
                  type="button"
                  onClick={() => setLeadNumber(null)}
                  className="rounded-full border border-line px-6 py-3 text-sm font-semibold text-ink transition hover:bg-surface-muted"
                >
                  Send another enquiry
                </button>
              </div>
            </div>
          ) : (
            <form
              onSubmit={onSubmit}
              noValidate
              className="rounded-2xl border border-line bg-surface p-6 shadow-[0_24px_56px_-38px_rgba(110,40,20,0.55)] sm:p-8"
            >
              <div className="grid gap-5 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label htmlFor="fullName" className="mb-1.5 block text-[0.88rem] font-semibold text-ink">
                    Full name <span className="text-brand-red">*</span>
                  </label>
                  <input
                    id="fullName"
                    autoComplete="name"
                    className={cn(fieldClass, errors.fullName && "border-danger")}
                    aria-invalid={Boolean(errors.fullName)}
                    aria-describedby={errors.fullName ? "fullName-error" : undefined}
                    placeholder="Your name"
                    {...register("fullName")}
                  />
                  <FieldError id="fullName-error" message={errors.fullName?.message} />
                </div>

                <div>
                  <label htmlFor="phone" className="mb-1.5 block text-[0.88rem] font-semibold text-ink">
                    Phone number <span className="text-brand-red">*</span>
                  </label>
                  <input
                    id="phone"
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    className={cn(fieldClass, errors.phone && "border-danger")}
                    aria-invalid={Boolean(errors.phone)}
                    aria-describedby={errors.phone ? "phone-error" : undefined}
                    placeholder="98765 43210"
                    {...register("phone")}
                  />
                  <FieldError id="phone-error" message={errors.phone?.message} />
                </div>

                <div>
                  <label htmlFor="whatsapp" className="mb-1.5 block text-[0.88rem] font-semibold text-ink">
                    WhatsApp number
                  </label>
                  <input
                    id="whatsapp"
                    type="tel"
                    inputMode="tel"
                    className={cn(fieldClass, errors.whatsapp && "border-danger")}
                    aria-invalid={Boolean(errors.whatsapp)}
                    aria-describedby={errors.whatsapp ? "whatsapp-error" : undefined}
                    placeholder="Same as phone, if different leave blank"
                    {...register("whatsapp")}
                  />
                  <FieldError id="whatsapp-error" message={errors.whatsapp?.message} />
                </div>

                <div>
                  <label htmlFor="email" className="mb-1.5 block text-[0.88rem] font-semibold text-ink">
                    Email <span className="text-brand-red">*</span>
                  </label>
                  <input
                    id="email"
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    className={cn(fieldClass, errors.email && "border-danger")}
                    aria-invalid={Boolean(errors.email)}
                    aria-describedby={errors.email ? "email-error" : undefined}
                    placeholder="you@example.com"
                    {...register("email")}
                  />
                  <FieldError id="email-error" message={errors.email?.message} />
                </div>

                <div>
                  <label htmlFor="city" className="mb-1.5 block text-[0.88rem] font-semibold text-ink">
                    City <span className="text-brand-red">*</span>
                  </label>
                  <input
                    id="city"
                    autoComplete="address-level2"
                    className={cn(fieldClass, errors.city && "border-danger")}
                    aria-invalid={Boolean(errors.city)}
                    aria-describedby={errors.city ? "city-error" : undefined}
                    placeholder="e.g. Pune"
                    {...register("city")}
                  />
                  <FieldError id="city-error" message={errors.city?.message} />
                </div>

                <div>
                  <label htmlFor="preferredTerritory" className="mb-1.5 block text-[0.88rem] font-semibold text-ink">
                    Preferred territory
                  </label>
                  <input
                    id="preferredTerritory"
                    className={fieldClass}
                    placeholder="Area you want to operate in"
                    {...register("preferredTerritory")}
                  />
                </div>

                <div>
                  <label htmlFor="investmentRange" className="mb-1.5 block text-[0.88rem] font-semibold text-ink">
                    Investment range
                  </label>
                  <select
                    id="investmentRange"
                    className={fieldClass}
                    defaultValue=""
                    {...register("investmentRange")}
                  >
                    <option value="">Select a range</option>
                    {INVESTMENT_RANGES.map((range) => (
                      <option key={range} value={range}>
                        {range}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="currentOccupation" className="mb-1.5 block text-[0.88rem] font-semibold text-ink">
                    Current occupation
                  </label>
                  <input
                    id="currentOccupation"
                    className={fieldClass}
                    placeholder="e.g. Business owner, salaried"
                    {...register("currentOccupation")}
                  />
                </div>

                <div>
                  <label htmlFor="existingBusiness" className="mb-1.5 block text-[0.88rem] font-semibold text-ink">
                    Existing business
                  </label>
                  <input
                    id="existingBusiness"
                    className={fieldClass}
                    placeholder="If any"
                    {...register("existingBusiness")}
                  />
                </div>

                <div className="sm:col-span-2">
                  <label htmlFor="message" className="mb-1.5 block text-[0.88rem] font-semibold text-ink">
                    Anything you would like to tell us?
                  </label>
                  <textarea
                    id="message"
                    rows={4}
                    className={cn(fieldClass, "resize-y")}
                    placeholder="Your plans, questions or timeline"
                    {...register("message")}
                  />
                  <FieldError id="message-error" message={errors.message?.message} />
                </div>
              </div>

              {/* Honeypot — visually and programmatically hidden from users */}
              <div aria-hidden="true" className="absolute left-[-9999px]">
                <label htmlFor="website">Leave this empty</label>
                <input id="website" tabIndex={-1} autoComplete="off" {...register("website")} />
              </div>

              <div className="mt-6">
                <label className="flex cursor-pointer items-start gap-3 text-[0.88rem] leading-relaxed text-ink-soft">
                  <input
                    type="checkbox"
                    className="mt-0.5 size-4 shrink-0 rounded border-line text-brand-red accent-[#c1272d]"
                    aria-invalid={Boolean(errors.consent)}
                    {...register("consent")}
                  />
                  <span>
                    I agree to be contacted by {site.name} about this enquiry by
                    phone, WhatsApp or email. <span className="text-brand-red">*</span>
                  </span>
                </label>
                <FieldError id="consent-error" message={errors.consent?.message} />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="mt-7 inline-flex w-full items-center justify-center gap-2.5 rounded-full bg-brand-crimson px-8 py-4 text-[0.9rem] font-semibold uppercase tracking-[0.1em] text-white shadow-[0_16px_34px_-16px_rgba(193,39,45,0.95)] transition hover:bg-brand-maroon disabled:cursor-not-allowed disabled:opacity-70 sm:w-auto"
              >
                {isSubmitting ? (
                  <>
                    <LoaderCircle className="size-4 animate-spin" />
                    Sending…
                  </>
                ) : (
                  <>
                    <Send className="size-4" strokeWidth={2.2} />
                    Send my enquiry
                  </>
                )}
              </button>

              <p className="mt-4 text-[0.8rem] text-ink-soft">
                Prefer to talk?{" "}
                <a href={site.phoneHref} className="font-semibold text-brand-crimson underline underline-offset-2">
                  {site.phone}
                </a>
              </p>
            </form>
          )}
        </Reveal>
      </div>
    </section>
  );
}
