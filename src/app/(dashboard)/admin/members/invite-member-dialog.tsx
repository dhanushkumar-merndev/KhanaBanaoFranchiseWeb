"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { UserPlus } from "lucide-react";
import { toast } from "sonner";
import { inviteMember } from "@/app/actions/members";
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
import { Field, Input } from "@/components/ui/field";
import { MAX_ACTIVE_MEMBERS } from "@/lib/domain/enums";
import {
  inviteMemberSchema,
  type InviteMemberInput,
} from "@/lib/validation/member";

export function InviteMemberDialog({ activeCount }: { activeCount: number }) {
  const [open, setOpen] = useState(false);
  const atCapacity = activeCount >= MAX_ACTIVE_MEMBERS;

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<InviteMemberInput>({
    resolver: zodResolver(inviteMemberSchema),
    defaultValues: { fullName: "", email: "", phone: "" },
  });

  const onSubmit = handleSubmit(async (values) => {
    const result = await inviteMember(values);

    if (result.ok) {
      toast.success(
        result.data.emailSent
          ? `Invitation emailed to ${result.data.email}.`
          : `Invitation created for ${result.data.email}, but the email could not be sent. Check the email logs.`,
      );
      reset();
      setOpen(false);
      return;
    }

    if (result.fieldErrors) {
      for (const [field, message] of Object.entries(result.fieldErrors)) {
        setError(field as keyof InviteMemberInput, { type: "server", message });
      }
    }
    toast.error(result.message);
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" disabled={atCapacity}>
          <UserPlus />
          Invite member
        </Button>
      </DialogTrigger>

      <DialogContent>
        <form onSubmit={onSubmit}>
          <DialogHeader>
            <DialogTitle>Invite a team member</DialogTitle>
            <DialogDescription>
              They will receive an email and sign in with this exact Google
              account. {MAX_ACTIVE_MEMBERS - activeCount} of{" "}
              {MAX_ACTIVE_MEMBERS} slots remaining.
            </DialogDescription>
          </DialogHeader>

          <DialogBody className="space-y-4">
            <Field
              label="Full name"
              htmlFor="invite-name"
              required
              error={errors.fullName?.message}
            >
              <Input
                id="invite-name"
                autoComplete="off"
                placeholder="e.g. Priya Menon"
                aria-invalid={Boolean(errors.fullName)}
                {...register("fullName")}
              />
            </Field>

            <Field
              label="Google email"
              htmlFor="invite-email"
              required
              error={errors.email?.message}
              hint="Must be the Google account they will sign in with."
            >
              <Input
                id="invite-email"
                type="email"
                autoComplete="off"
                placeholder="name@gmail.com"
                aria-invalid={Boolean(errors.email)}
                {...register("email")}
              />
            </Field>

            <Field
              label="Phone number"
              htmlFor="invite-phone"
              required
              error={errors.phone?.message}
            >
              <Input
                id="invite-phone"
                type="tel"
                inputMode="tel"
                placeholder="98765 43210"
                aria-invalid={Boolean(errors.phone)}
                {...register("phone")}
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
              Send invitation
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
