"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  CalendarPlus,
  Check,
  MessageSquarePlus,
  PhoneCall,
  UserCog,
  X,
} from "lucide-react";
import { toast } from "sonner";
import {
  acceptLead,
  autoAssignLead,
  createFollowup,
  logContact,
  reassignLead,
  recordBusinessDiscussion,
  rejectLead,
} from "@/app/actions/leads";
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
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import {
  CONTACT_CHANNELS,
  DISCUSSION_OUTCOMES,
  INTEREST_LEVELS,
  type LeadStatus,
} from "@/lib/domain/enums";
import { localInputToIso, nowLocalInput } from "@/lib/format";
import {
  businessDiscussionSchema,
  followupSchema,
  logContactSchema,
  reassignLeadSchema,
  rejectLeadSchema,
  type BusinessDiscussionInput,
  type FollowupInput,
  type LogContactInput,
  type ReassignLeadInput,
  type RejectLeadInput,
} from "@/lib/validation/lead";
import type { ActionResult } from "@/lib/validation/result";

const CHANNEL_LABELS: Record<(typeof CONTACT_CHANNELS)[number], string> = {
  PHONE: "Phone call",
  WHATSAPP: "WhatsApp",
  EMAIL: "Email",
  VIDEO_MEETING: "Video meeting",
  OFFICE_MEETING: "Office meeting",
  OTHER: "Other",
};

const OUTCOME_LABELS: Record<(typeof DISCUSSION_OUTCOMES)[number], string> = {
  ACCEPTED: "Accepted — ready to apply",
  FOLLOW_UP_REQUIRED: "Follow-up required",
  REJECTED: "Rejected",
  UNREACHABLE: "Could not reach them",
};

const INTEREST_LABELS: Record<(typeof INTEREST_LEVELS)[number], string> = {
  HIGH: "High",
  MEDIUM: "Medium",
  LOW: "Low",
};

type DialogKind =
  | "contact"
  | "discussion"
  | "followup"
  | "accept"
  | "reject"
  | "reassign"
  | null;

/**
 * Only the actions that make sense at this stage are offered (spec §11).
 * Everything else is reachable through the pipeline, not through a wall of
 * buttons the user has to read past.
 */
export function availableActions(
  status: LeadStatus,
  businessDiscussionRecorded: boolean,
) {
  const early = status === "NEW" || status === "ASSIGNED";
  const inConversation =
    status === "CONTACTED" ||
    status === "BUSINESS_DISCUSSION" ||
    status === "FOLLOW_UP";
  const acceptedAwaitingDiscussion =
    status === "ACCEPTED" && !businessDiscussionRecorded;

  return {
    contact: early || inConversation,
    discussion: early || inConversation || acceptedAwaitingDiscussion,
    followup: early || inConversation || acceptedAwaitingDiscussion,
    decide: inConversation,
    acceptedAwaitingDiscussion,
  };
}

export function LeadActions({
  leadId,
  status,
  assignedMemberId,
  members,
  isAdmin,
  businessDiscussionRecorded,
}: {
  leadId: string;
  status: LeadStatus;
  assignedMemberId: string | null;
  members: { id: string; full_name: string }[];
  isAdmin: boolean;
  businessDiscussionRecorded: boolean;
}) {
  const [dialog, setDialog] = useState<DialogKind>(null);
  const [assigning, setAssigning] = useState(false);
  const router = useRouter();
  const close = () => setDialog(null);
  const available = availableActions(status, businessDiscussionRecorded);

  const runAutoAssign = async () => {
    setAssigning(true);
    try {
      const result = await autoAssignLead(leadId);
      if (result.ok) {
        toast.success("Lead assigned by round-robin.");
        router.refresh();
      } else {
        toast.error(result.message);
      }
    } finally {
      setAssigning(false);
    }
  };

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        {available.contact && (
          <Button size="sm" onClick={() => setDialog("contact")}>
            <PhoneCall />
            Log contact
          </Button>
        )}

        {available.discussion && (
          <Button
            size="sm"
            variant={
              available.contact && !available.acceptedAwaitingDiscussion
                ? "outline"
                : "primary"
            }
            onClick={() => setDialog("discussion")}
          >
            <MessageSquarePlus />
            Record discussion
          </Button>
        )}

        {available.followup && (
          <Button size="sm" variant="outline" onClick={() => setDialog("followup")}>
            <CalendarPlus />
            Schedule follow-up
          </Button>
        )}

        {available.decide && (
          <>
            <Button size="sm" variant="success" onClick={() => setDialog("accept")}>
              <Check />
              Accept
            </Button>
            <Button size="sm" variant="danger" onClick={() => setDialog("reject")}>
              <X />
              Reject
            </Button>
          </>
        )}

        {isAdmin && (
          <>
            <Button size="sm" variant="ghost" onClick={() => setDialog("reassign")}>
              <UserCog />
              {assignedMemberId ? "Reassign" : "Assign"}
            </Button>
            {!assignedMemberId && (
              <Button
                size="sm"
                variant="ghost"
                loading={assigning}
                onClick={runAutoAssign}
              >
                Auto-assign
              </Button>
            )}
          </>
        )}
      </div>

      {dialog === "contact" && (
        <LogContactDialog leadId={leadId} onDone={close} />
      )}
      {dialog === "discussion" && (
        <DiscussionDialog
          leadId={leadId}
          leadAlreadyAccepted={status === "ACCEPTED"}
          onDone={close}
        />
      )}
      {dialog === "followup" && (
        <FollowupDialog leadId={leadId} onDone={close} />
      )}
      {dialog === "accept" && (
        <AcceptDialog
          leadId={leadId}
          businessDiscussionRecorded={businessDiscussionRecorded}
          onDone={close}
        />
      )}
      {dialog === "reject" && <RejectDialog leadId={leadId} onDone={close} />}
      {dialog === "reassign" && (
        <ReassignDialog
          leadId={leadId}
          members={members}
          assignedMemberId={assignedMemberId}
          onDone={close}
        />
      )}
    </>
  );
}

/** Applies server-side field errors onto the form and shows the message. */
function applyErrors<T extends Record<string, unknown>>(
  result: Extract<ActionResult<never>, { ok: false }>,
  setError: (name: keyof T & string, error: { type: string; message: string }) => void,
) {
  if (result.fieldErrors) {
    for (const [field, message] of Object.entries(result.fieldErrors)) {
      setError(field as keyof T & string, { type: "server", message });
    }
  }
  toast.error(result.message);
}

// -------------------------------------------------------------------

function LogContactDialog({
  leadId,
  onDone,
}: {
  leadId: string;
  onDone: () => void;
}) {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LogContactInput>({
    resolver: zodResolver(logContactSchema),
    defaultValues: { channel: "PHONE", notes: "" },
  });

  const onSubmit = handleSubmit(async (values) => {
    const result = await logContact(leadId, values);
    if (!result.ok) return applyErrors<LogContactInput>(result, setError);
    toast.success("Contact recorded.");
    router.refresh();
    onDone();
  });

  return (
    <Dialog open onOpenChange={(open) => !open && onDone()}>
      <DialogContent>
        <form onSubmit={onSubmit}>
          <DialogHeader>
            <DialogTitle>Log a contact</DialogTitle>
            <DialogDescription>
              A quick record of reaching out. Use “Record discussion” once you
              have talked business.
            </DialogDescription>
          </DialogHeader>

          <DialogBody className="space-y-4">
            <Field label="Channel" htmlFor="contact-channel" required>
              <Select id="contact-channel" {...register("channel")}>
                {CONTACT_CHANNELS.map((channel) => (
                  <option key={channel} value={channel}>
                    {CHANNEL_LABELS[channel]}
                  </option>
                ))}
              </Select>
            </Field>

            <Field
              label="What happened?"
              htmlFor="contact-notes"
              required
              error={errors.notes?.message}
            >
              <Textarea
                id="contact-notes"
                rows={3}
                placeholder="e.g. Spoke briefly, sending details on WhatsApp."
                aria-invalid={Boolean(errors.notes)}
                {...register("notes")}
              />
            </Field>
          </DialogBody>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onDone} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" loading={isSubmitting}>
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// -------------------------------------------------------------------

function DiscussionDialog({
  leadId,
  leadAlreadyAccepted,
  onDone,
}: {
  leadId: string;
  leadAlreadyAccepted: boolean;
  onDone: () => void;
}) {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    setError,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<BusinessDiscussionInput>({
    resolver: zodResolver(businessDiscussionSchema),
    defaultValues: {
      channel: "PHONE",
      discussionDate: nowLocalInput(),
      summary: "",
      businessModelDiscussed: "",
      investmentDiscussed: "",
      territoryDiscussed: "",
      interestLevel: "",
      outcome: leadAlreadyAccepted ? "ACCEPTED" : "FOLLOW_UP_REQUIRED",
      nextFollowupAt: "",
      rejectionReason: "",
      notes: "",
    },
  });

  const outcome = watch("outcome");

  const onSubmit = handleSubmit(async (values) => {
    const result = await recordBusinessDiscussion(leadId, {
      ...values,
      discussionDate: localInputToIso(values.discussionDate),
      nextFollowupAt: values.nextFollowupAt
        ? localInputToIso(values.nextFollowupAt)
        : "",
    });
    if (!result.ok) return applyErrors<BusinessDiscussionInput>(result, setError);
    toast.success("Discussion recorded.");
    router.refresh();
    onDone();
  });

  return (
    <Dialog open onOpenChange={(open) => !open && onDone()}>
      <DialogContent className="max-w-2xl">
        <form onSubmit={onSubmit}>
          <DialogHeader>
            <DialogTitle>Record a business discussion</DialogTitle>
            <DialogDescription>
              The outcome you pick moves the lead to its next stage.
            </DialogDescription>
          </DialogHeader>

          <DialogBody className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Channel" htmlFor="disc-channel" required>
                <Select id="disc-channel" {...register("channel")}>
                  {CONTACT_CHANNELS.map((channel) => (
                    <option key={channel} value={channel}>
                      {CHANNEL_LABELS[channel]}
                    </option>
                  ))}
                </Select>
              </Field>

              <Field
                label="Discussion date"
                htmlFor="disc-date"
                required
                error={errors.discussionDate?.message}
              >
                <Input
                  id="disc-date"
                  type="datetime-local"
                  aria-invalid={Boolean(errors.discussionDate)}
                  {...register("discussionDate")}
                />
              </Field>
            </div>

            <Field
              label="Discussion summary"
              htmlFor="disc-summary"
              required
              error={errors.summary?.message}
            >
              <Textarea
                id="disc-summary"
                rows={4}
                placeholder="What was covered, what they asked, what you committed to."
                aria-invalid={Boolean(errors.summary)}
                {...register("summary")}
              />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Business model discussed"
                htmlFor="disc-model"
                error={errors.businessModelDiscussed?.message}
                className="sm:col-span-2"
              >
                <Input
                  id="disc-model"
                  placeholder="e.g. Single-territory catering franchise"
                  {...register("businessModelDiscussed")}
                />
              </Field>

              <Field
                label="Investment discussed"
                htmlFor="disc-investment"
                error={errors.investmentDiscussed?.message}
              >
                <Input
                  id="disc-investment"
                  placeholder="e.g. ₹3–4 lakh working capital"
                  {...register("investmentDiscussed")}
                />
              </Field>

              <Field
                label="Territory discussed"
                htmlFor="disc-territory"
                error={errors.territoryDiscussed?.message}
              >
                <Input
                  id="disc-territory"
                  placeholder="e.g. Coimbatore South"
                  {...register("territoryDiscussed")}
                />
              </Field>

              <Field label="Interest level" htmlFor="disc-interest">
                <Select id="disc-interest" {...register("interestLevel")}>
                  <option value="">Not recorded</option>
                  {INTEREST_LEVELS.map((level) => (
                    <option key={level} value={level}>
                      {INTEREST_LABELS[level]}
                    </option>
                  ))}
                </Select>
              </Field>

              <Field label="Outcome" htmlFor="disc-outcome" required>
                <Select id="disc-outcome" {...register("outcome")}>
                  {DISCUSSION_OUTCOMES.map((value) => (
                    <option key={value} value={value}>
                      {OUTCOME_LABELS[value]}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>

            {outcome === "FOLLOW_UP_REQUIRED" && (
              <Field
                label="Next follow-up"
                htmlFor="disc-followup"
                required
                error={errors.nextFollowupAt?.message}
                hint="A follow-up task is created for whoever owns this lead."
              >
                <Input
                  id="disc-followup"
                  type="datetime-local"
                  aria-invalid={Boolean(errors.nextFollowupAt)}
                  {...register("nextFollowupAt")}
                />
              </Field>
            )}

            {outcome === "REJECTED" && (
              <Field
                label="Rejection reason"
                htmlFor="disc-rejection"
                required
                error={errors.rejectionReason?.message}
                hint="Recorded against the lead so the decision is auditable later."
              >
                <Textarea
                  id="disc-rejection"
                  rows={2}
                  aria-invalid={Boolean(errors.rejectionReason)}
                  {...register("rejectionReason")}
                />
              </Field>
            )}

            <Field label="Internal notes" htmlFor="disc-notes" error={errors.notes?.message}>
              <Textarea
                id="disc-notes"
                rows={2}
                placeholder="Anything the team should know that is not part of the summary."
                {...register("notes")}
              />
            </Field>
          </DialogBody>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onDone} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" loading={isSubmitting}>
              Save discussion
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// -------------------------------------------------------------------

function FollowupDialog({
  leadId,
  onDone,
}: {
  leadId: string;
  onDone: () => void;
}) {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FollowupInput>({
    resolver: zodResolver(followupSchema),
    defaultValues: { dueAt: "", channel: "", note: "" },
  });

  const onSubmit = handleSubmit(async (values) => {
    const result = await createFollowup(leadId, {
      ...values,
      dueAt: localInputToIso(values.dueAt),
    });
    if (!result.ok) return applyErrors<FollowupInput>(result, setError);
    toast.success("Follow-up scheduled.");
    router.refresh();
    onDone();
  });

  return (
    <Dialog open onOpenChange={(open) => !open && onDone()}>
      <DialogContent>
        <form onSubmit={onSubmit}>
          <DialogHeader>
            <DialogTitle>Schedule a follow-up</DialogTitle>
            <DialogDescription>
              It appears in the follow-up queue of whoever owns this lead.
            </DialogDescription>
          </DialogHeader>

          <DialogBody className="space-y-4">
            <Field
              label="Due"
              htmlFor="fu-due"
              required
              error={errors.dueAt?.message}
            >
              <Input
                id="fu-due"
                type="datetime-local"
                aria-invalid={Boolean(errors.dueAt)}
                {...register("dueAt")}
              />
            </Field>

            <Field label="Channel" htmlFor="fu-channel">
              <Select id="fu-channel" {...register("channel")}>
                <option value="">Not decided</option>
                {CONTACT_CHANNELS.map((channel) => (
                  <option key={channel} value={channel}>
                    {CHANNEL_LABELS[channel]}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Note" htmlFor="fu-note" error={errors.note?.message}>
              <Textarea
                id="fu-note"
                rows={3}
                placeholder="What needs to happen on this call?"
                {...register("note")}
              />
            </Field>
          </DialogBody>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onDone} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" loading={isSubmitting}>
              Schedule
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// -------------------------------------------------------------------

function AcceptDialog({
  leadId,
  businessDiscussionRecorded,
  onDone,
}: {
  leadId: string;
  businessDiscussionRecorded: boolean;
  onDone: () => void;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  const confirm = async () => {
    setPending(true);
    try {
      const result = await acceptLead(leadId);
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success(
        businessDiscussionRecorded
          ? "Lead accepted. You can now send the application link."
          : "Lead accepted. Record the business discussion next.",
      );
      router.refresh();
      onDone();
    } finally {
      setPending(false);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && !pending && onDone()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Accept this lead?</DialogTitle>
          <DialogDescription>
            {businessDiscussionRecorded
              ? "They move to the application stage."
              : "They move to the business-discussion step."}
          </DialogDescription>
        </DialogHeader>
        <DialogBody>
          <p className="text-[0.82rem] leading-relaxed text-ink-soft">
            {businessDiscussionRecorded
              ? "Accepting does not send anything yet. The next step is to send the secure application link from this page."
              : "Accepting does not send anything yet. Record the business discussion before sending the application link."}
          </p>
        </DialogBody>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onDone} disabled={pending}>
            Cancel
          </Button>
          <Button type="button" variant="success" loading={pending} onClick={confirm}>
            Accept lead
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// -------------------------------------------------------------------

function RejectDialog({ leadId, onDone }: { leadId: string; onDone: () => void }) {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<RejectLeadInput>({
    resolver: zodResolver(rejectLeadSchema),
    defaultValues: { reason: "" },
  });

  const onSubmit = handleSubmit(async (values) => {
    const result = await rejectLead(leadId, values);
    if (!result.ok) return applyErrors<RejectLeadInput>(result, setError);
    toast.success("Lead rejected.");
    router.refresh();
    onDone();
  });

  return (
    <Dialog open onOpenChange={(open) => !open && onDone()}>
      <DialogContent className="max-w-md">
        <form onSubmit={onSubmit}>
          <DialogHeader>
            <DialogTitle>Reject this lead?</DialogTitle>
            <DialogDescription>
              Rejection is final — the lead cannot be moved on afterwards.
            </DialogDescription>
          </DialogHeader>

          <DialogBody>
            <Field
              label="Reason"
              htmlFor="reject-reason"
              required
              error={errors.reason?.message}
              hint="Stored on the lead and shown in the activity timeline."
            >
              <Textarea
                id="reject-reason"
                rows={3}
                placeholder="e.g. Investment capacity below the franchise requirement."
                aria-invalid={Boolean(errors.reason)}
                {...register("reason")}
              />
            </Field>
          </DialogBody>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onDone} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" variant="danger" loading={isSubmitting}>
              Reject lead
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// -------------------------------------------------------------------

function ReassignDialog({
  leadId,
  members,
  assignedMemberId,
  onDone,
}: {
  leadId: string;
  members: { id: string; full_name: string }[];
  assignedMemberId: string | null;
  onDone: () => void;
}) {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ReassignLeadInput>({
    resolver: zodResolver(reassignLeadSchema),
    defaultValues: { memberId: "", note: "" },
  });

  const onSubmit = handleSubmit(async (values) => {
    const result = await reassignLead(leadId, values);
    if (!result.ok) return applyErrors<ReassignLeadInput>(result, setError);
    toast.success("Lead reassigned.");
    router.refresh();
    onDone();
  });

  return (
    <Dialog open onOpenChange={(open) => !open && onDone()}>
      <DialogContent className="max-w-md">
        <form onSubmit={onSubmit}>
          <DialogHeader>
            <DialogTitle>
              {assignedMemberId ? "Reassign this lead" : "Assign this lead"}
            </DialogTitle>
            <DialogDescription>
              Pending follow-ups move across with the lead.
            </DialogDescription>
          </DialogHeader>

          <DialogBody className="space-y-4">
            <Field
              label="Member"
              htmlFor="reassign-member"
              required
              error={errors.memberId?.message}
            >
              <Select
                id="reassign-member"
                aria-invalid={Boolean(errors.memberId)}
                {...register("memberId")}
              >
                <option value="">Choose a member…</option>
                {members.map((member) => (
                  <option
                    key={member.id}
                    value={member.id}
                    disabled={member.id === assignedMemberId}
                  >
                    {member.full_name}
                    {member.id === assignedMemberId ? " (current owner)" : ""}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Reason" htmlFor="reassign-note" error={errors.note?.message}>
              <Textarea
                id="reassign-note"
                rows={2}
                placeholder="e.g. Covering while Priya is on leave."
                {...register("note")}
              />
            </Field>
          </DialogBody>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onDone} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" loading={isSubmitting}>
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
