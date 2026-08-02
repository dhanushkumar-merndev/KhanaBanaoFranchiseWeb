"use client";

import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { updateApplicationDetails } from "@/app/actions/applications";
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
import { Field, Input, Textarea } from "@/components/ui/field";
import type { ApplicationDetail } from "@/lib/data/pipeline";
import {
  applicationEditSchema,
  type ApplicationEditInput,
} from "@/lib/validation/application";

function read(section: unknown, key: string): string {
  if (!section || typeof section !== "object") return "";
  const raw = (section as Record<string, unknown>)[key];
  return raw === null || raw === undefined ? "" : String(raw);
}

function defaults(application: ApplicationDetail): ApplicationEditInput {
  return {
    fullName: read(application.personal_details, "full_name"),
    mobile: read(application.personal_details, "mobile"),
    whatsapp: read(application.personal_details, "whatsapp"),
    email: read(application.personal_details, "email"),
    dateOfBirth: read(application.personal_details, "date_of_birth"),
    currentAddress: read(application.address_details, "current_address"),
    city: read(application.address_details, "city"),
    state: read(application.address_details, "state"),
    pinCode: read(application.address_details, "pin_code"),
    currentOccupation: read(application.business_details, "current_occupation"),
    businessExperience: read(
      application.business_details,
      "business_experience",
    ),
    companyName: read(application.business_details, "company_name"),
    gstNumber: read(application.business_details, "gst_number"),
    preferredCity: read(application.franchise_details, "preferred_city"),
    preferredTerritory: read(
      application.franchise_details,
      "preferred_territory",
    ),
    investmentBudget: read(
      application.franchise_details,
      "investment_budget",
    ),
    franchiseModel: read(application.franchise_details, "franchise_model"),
    expectedStartDate: read(
      application.franchise_details,
      "expected_start_date",
    ),
    sourceOfInvestment: read(
      application.financial_details,
      "source_of_investment",
    ),
    availableInvestmentAmount: read(
      application.financial_details,
      "available_investment_amount",
    ),
    bankName: read(application.financial_details, "bank_name"),
  };
}

function EditSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <fieldset className="rounded-xl border border-line p-4">
      <legend className="px-1 font-display text-sm font-bold text-ink">
        {title}
      </legend>
      <div className="grid gap-4 sm:grid-cols-2">{children}</div>
    </fieldset>
  );
}

export function ApplicationEditDialog({
  application,
  onClose,
}: {
  application: ApplicationDetail;
  onClose: () => void;
}) {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ApplicationEditInput>({
    resolver: zodResolver(applicationEditSchema),
    defaultValues: defaults(application),
  });

  const save = handleSubmit(async (values) => {
    const result = await updateApplicationDetails(application.id, values);
    if (!result.ok) {
      if (result.fieldErrors) {
        for (const [field, message] of Object.entries(result.fieldErrors)) {
          setError(field as keyof ApplicationEditInput, {
            type: "server",
            message,
          });
        }
      }
      toast.error(result.message);
      return;
    }

    toast.success("Application details updated.");
    onClose();
    router.refresh();
  });

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl">
        <form onSubmit={save} noValidate>
          <DialogHeader>
            <DialogTitle>Edit application details</DialogTitle>
            <DialogDescription>
              Correct information supplied by the applicant. Their declaration,
              submission time, review history, and pipeline status stay unchanged.
            </DialogDescription>
          </DialogHeader>

          <DialogBody className="space-y-4">
            <EditSection title="Personal information">
              <Field
                label="Full name"
                htmlFor="edit-app-name"
                required
                error={errors.fullName?.message}
              >
                <Input
                  id="edit-app-name"
                  autoComplete="name"
                  aria-invalid={Boolean(errors.fullName)}
                  {...register("fullName")}
                />
              </Field>
              <Field
                label="Date of birth"
                htmlFor="edit-app-dob"
                required
                error={errors.dateOfBirth?.message}
              >
                <Input
                  id="edit-app-dob"
                  type="date"
                  aria-invalid={Boolean(errors.dateOfBirth)}
                  {...register("dateOfBirth")}
                />
              </Field>
              <Field
                label="Mobile number"
                htmlFor="edit-app-mobile"
                required
                error={errors.mobile?.message}
              >
                <Input
                  id="edit-app-mobile"
                  type="tel"
                  aria-invalid={Boolean(errors.mobile)}
                  {...register("mobile")}
                />
              </Field>
              <Field
                label="WhatsApp number"
                htmlFor="edit-app-whatsapp"
                error={errors.whatsapp?.message}
              >
                <Input
                  id="edit-app-whatsapp"
                  type="tel"
                  aria-invalid={Boolean(errors.whatsapp)}
                  {...register("whatsapp")}
                />
              </Field>
              <Field
                label="Email"
                htmlFor="edit-app-email"
                required
                error={errors.email?.message}
                className="sm:col-span-2"
              >
                <Input
                  id="edit-app-email"
                  type="email"
                  autoComplete="email"
                  aria-invalid={Boolean(errors.email)}
                  {...register("email")}
                />
              </Field>
            </EditSection>

            <EditSection title="Address">
              <Field
                label="Current address"
                htmlFor="edit-app-address"
                required
                error={errors.currentAddress?.message}
                className="sm:col-span-2"
              >
                <Textarea
                  id="edit-app-address"
                  rows={2}
                  aria-invalid={Boolean(errors.currentAddress)}
                  {...register("currentAddress")}
                />
              </Field>
              <Field
                label="City"
                htmlFor="edit-app-city"
                required
                error={errors.city?.message}
              >
                <Input
                  id="edit-app-city"
                  aria-invalid={Boolean(errors.city)}
                  {...register("city")}
                />
              </Field>
              <Field
                label="State"
                htmlFor="edit-app-state"
                required
                error={errors.state?.message}
              >
                <Input
                  id="edit-app-state"
                  aria-invalid={Boolean(errors.state)}
                  {...register("state")}
                />
              </Field>
              <Field
                label="PIN code"
                htmlFor="edit-app-pin"
                required
                error={errors.pinCode?.message}
              >
                <Input
                  id="edit-app-pin"
                  inputMode="numeric"
                  maxLength={6}
                  aria-invalid={Boolean(errors.pinCode)}
                  {...register("pinCode")}
                />
              </Field>
            </EditSection>

            <EditSection title="Business information">
              <Field
                label="Current occupation"
                htmlFor="edit-app-occupation"
                required
                error={errors.currentOccupation?.message}
              >
                <Input
                  id="edit-app-occupation"
                  aria-invalid={Boolean(errors.currentOccupation)}
                  {...register("currentOccupation")}
                />
              </Field>
              <Field
                label="Company name"
                htmlFor="edit-app-company"
                error={errors.companyName?.message}
              >
                <Input id="edit-app-company" {...register("companyName")} />
              </Field>
              <Field
                label="GST number"
                htmlFor="edit-app-gst"
                error={errors.gstNumber?.message}
              >
                <Input
                  id="edit-app-gst"
                  maxLength={15}
                  className="uppercase"
                  aria-invalid={Boolean(errors.gstNumber)}
                  {...register("gstNumber")}
                />
              </Field>
              <Field
                label="Business experience"
                htmlFor="edit-app-experience"
                error={errors.businessExperience?.message}
                className="sm:col-span-2"
              >
                <Textarea
                  id="edit-app-experience"
                  rows={3}
                  aria-invalid={Boolean(errors.businessExperience)}
                  {...register("businessExperience")}
                />
              </Field>
            </EditSection>

            <EditSection title="Franchise preferences">
              <Field
                label="Preferred city"
                htmlFor="edit-app-preferred-city"
                required
                error={errors.preferredCity?.message}
              >
                <Input
                  id="edit-app-preferred-city"
                  aria-invalid={Boolean(errors.preferredCity)}
                  {...register("preferredCity")}
                />
              </Field>
              <Field
                label="Preferred territory"
                htmlFor="edit-app-territory"
                error={errors.preferredTerritory?.message}
              >
                <Input
                  id="edit-app-territory"
                  {...register("preferredTerritory")}
                />
              </Field>
              <Field
                label="Investment budget"
                htmlFor="edit-app-budget"
                required
                error={errors.investmentBudget?.message}
              >
                <Input
                  id="edit-app-budget"
                  aria-invalid={Boolean(errors.investmentBudget)}
                  {...register("investmentBudget")}
                />
              </Field>
              <Field
                label="Franchise model"
                htmlFor="edit-app-model"
                error={errors.franchiseModel?.message}
              >
                <Input id="edit-app-model" {...register("franchiseModel")} />
              </Field>
              <Field
                label="Expected start"
                htmlFor="edit-app-start"
                error={errors.expectedStartDate?.message}
              >
                <Input
                  id="edit-app-start"
                  {...register("expectedStartDate")}
                />
              </Field>
            </EditSection>

            <EditSection title="Financial details">
              <Field
                label="Source of investment"
                htmlFor="edit-app-source"
                required
                error={errors.sourceOfInvestment?.message}
              >
                <Input
                  id="edit-app-source"
                  aria-invalid={Boolean(errors.sourceOfInvestment)}
                  {...register("sourceOfInvestment")}
                />
              </Field>
              <Field
                label="Available investment amount"
                htmlFor="edit-app-available"
                required
                error={errors.availableInvestmentAmount?.message}
              >
                <Input
                  id="edit-app-available"
                  aria-invalid={Boolean(errors.availableInvestmentAmount)}
                  {...register("availableInvestmentAmount")}
                />
              </Field>
              <Field
                label="Bank name"
                htmlFor="edit-app-bank"
                error={errors.bankName?.message}
                className="sm:col-span-2"
              >
                <Input id="edit-app-bank" {...register("bankName")} />
              </Field>
            </EditSection>
          </DialogBody>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={isSubmitting}
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button type="submit" loading={isSubmitting}>
              Save corrections
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
