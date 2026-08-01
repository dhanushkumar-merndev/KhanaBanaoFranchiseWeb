"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { createLead } from "@/app/actions/leads";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { LEAD_SOURCES, LEAD_SOURCE_LABELS } from "@/lib/domain/enums";
import { createLeadSchema, type CreateLeadInput } from "@/lib/validation/lead";

export function CreateLeadDialog({
  members,
  canAssign,
}: {
  members: { id: string; full_name: string }[];
  /** Members create leads on their own name, so they see no picker. */
  canAssign: boolean;
}) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<CreateLeadInput>({
    resolver: zodResolver(createLeadSchema),
    defaultValues: {
      fullName: "",
      phone: "",
      whatsapp: "",
      email: "",
      city: "",
      source: "PHONE",
      preferredTerritory: "",
      investmentRange: "",
      currentOccupation: "",
      message: "",
      assignedMemberId: "",
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    const result = await createLead(values);

    if (result.ok) {
      toast.success(
        result.data.assignedTo
          ? `Lead ${result.data.leadNumber} created and assigned.`
          : `Lead ${result.data.leadNumber} created, but no active member was available to assign it.`,
      );
      reset();
      setOpen(false);
      router.push(`/admin/leads/${result.data.leadId}`);
      return;
    }

    if (result.fieldErrors) {
      for (const [field, message] of Object.entries(result.fieldErrors)) {
        setError(field as keyof CreateLeadInput, { type: "server", message });
      }
    }
    toast.error(result.message);
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus />
          Add lead
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-2xl">
        <form onSubmit={onSubmit}>
          <DialogHeader>
            <DialogTitle>Add a lead</DialogTitle>
            <DialogDescription>
              For enquiries that arrive by phone, WhatsApp or in person. Website
              enquiries land here automatically.
            </DialogDescription>
          </DialogHeader>

          <DialogBody className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Full name"
                htmlFor="lead-name"
                required
                error={errors.fullName?.message}
              >
                <Input
                  id="lead-name"
                  placeholder="e.g. Ramesh Iyer"
                  aria-invalid={Boolean(errors.fullName)}
                  {...register("fullName")}
                />
              </Field>

              <Field
                label="City"
                htmlFor="lead-city"
                required
                error={errors.city?.message}
              >
                <Input
                  id="lead-city"
                  placeholder="e.g. Coimbatore"
                  aria-invalid={Boolean(errors.city)}
                  {...register("city")}
                />
              </Field>

              <Field
                label="Phone"
                htmlFor="lead-phone"
                required
                error={errors.phone?.message}
              >
                <Input
                  id="lead-phone"
                  type="tel"
                  inputMode="tel"
                  placeholder="98765 43210"
                  aria-invalid={Boolean(errors.phone)}
                  {...register("phone")}
                />
              </Field>

              <Field
                label="WhatsApp"
                htmlFor="lead-whatsapp"
                error={errors.whatsapp?.message}
                hint="Leave blank if it is the same as the phone number."
              >
                <Input
                  id="lead-whatsapp"
                  type="tel"
                  inputMode="tel"
                  placeholder="98765 43210"
                  aria-invalid={Boolean(errors.whatsapp)}
                  {...register("whatsapp")}
                />
              </Field>

              <Field
                label="Email"
                htmlFor="lead-email"
                required
                error={errors.email?.message}
              >
                <Input
                  id="lead-email"
                  type="email"
                  placeholder="name@example.com"
                  aria-invalid={Boolean(errors.email)}
                  {...register("email")}
                />
              </Field>

              <Field
                label="Source"
                htmlFor="lead-source"
                required
                error={errors.source?.message}
              >
                <Select id="lead-source" {...register("source")}>
                  {LEAD_SOURCES.map((source) => (
                    <option key={source} value={source}>
                      {LEAD_SOURCE_LABELS[source]}
                    </option>
                  ))}
                </Select>
              </Field>

              <Field
                label="Preferred territory"
                htmlFor="lead-territory"
                error={errors.preferredTerritory?.message}
              >
                <Input
                  id="lead-territory"
                  placeholder="e.g. Coimbatore South"
                  {...register("preferredTerritory")}
                />
              </Field>

              <Field
                label="Investment range"
                htmlFor="lead-investment"
                error={errors.investmentRange?.message}
              >
                <Input
                  id="lead-investment"
                  placeholder="e.g. ₹2–5 lakh"
                  {...register("investmentRange")}
                />
              </Field>

              <Field
                label="Current occupation"
                htmlFor="lead-occupation"
                error={errors.currentOccupation?.message}
                className="sm:col-span-2"
              >
                <Input
                  id="lead-occupation"
                  placeholder="e.g. Runs a cloud kitchen"
                  {...register("currentOccupation")}
                />
              </Field>
            </div>

            {canAssign && (
              <Field
                label="Assign to"
                htmlFor="lead-member"
                hint="Leave on round-robin to keep the rotation even."
                error={errors.assignedMemberId?.message}
              >
                <Select id="lead-member" {...register("assignedMemberId")}>
                  <option value="">Round-robin (recommended)</option>
                  {members.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.full_name}
                    </option>
                  ))}
                </Select>
              </Field>
            )}

            <Field
              label="Notes"
              htmlFor="lead-message"
              error={errors.message?.message}
            >
              <Textarea
                id="lead-message"
                rows={3}
                placeholder="What did they ask about?"
                {...register("message")}
              />
            </Field>
          </DialogBody>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" loading={isSubmitting}>
              Create lead
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
