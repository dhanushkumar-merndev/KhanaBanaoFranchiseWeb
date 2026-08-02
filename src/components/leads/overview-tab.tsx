import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ContactAction } from "@/components/contact/contact-action";
import { LEAD_SOURCE_LABELS } from "@/lib/domain/enums";
import { formatDateTime, formatPhone } from "@/lib/format";
import type { LeadDetail } from "@/lib/data/lead-detail";

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 border-b border-line/60 py-2.5 last:border-0 sm:flex-row sm:items-baseline sm:gap-4">
      <dt className="w-48 shrink-0 text-[0.72rem] font-semibold uppercase tracking-wide text-ink-soft">
        {label}
      </dt>
      <dd className="min-w-0 flex-1 text-[0.85rem] leading-relaxed text-ink">
        {value ?? <span className="text-ink-soft/60">Not provided</span>}
      </dd>
    </div>
  );
}

const INTEREST_LABEL = { HIGH: "High", MEDIUM: "Medium", LOW: "Low" } as const;

export function OverviewTab({ lead }: { lead: LeadDetail }) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Enquiry details</CardTitle>
        </CardHeader>
        <CardContent>
          <dl>
            <Row label="Full name" value={lead.full_name} />
            <Row
              label="Phone"
              value={
                <ContactAction
                  kind="phone"
                  value={lead.phone}
                  whatsapp={lead.whatsapp}
                  className="hover:text-brand-crimson hover:underline hover:underline-offset-2"
                >
                  {formatPhone(lead.phone)}
                </ContactAction>
              }
            />
            <Row
              label="WhatsApp"
              value={lead.whatsapp ? formatPhone(lead.whatsapp) : null}
            />
            <Row
              label="Email"
              value={
                <ContactAction
                  kind="email"
                  value={lead.email}
                  className="break-all hover:text-brand-crimson hover:underline hover:underline-offset-2"
                >
                  {lead.email}
                </ContactAction>
              }
            />
            <Row label="City" value={lead.city} />
            <Row label="Source" value={LEAD_SOURCE_LABELS[lead.source]} />
            <Row label="Preferred territory" value={lead.preferred_territory} />
            <Row label="Investment range" value={lead.investment_range} />
            <Row label="Current occupation" value={lead.current_occupation} />
            <Row label="Existing business" value={lead.existing_business} />
          </dl>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Qualification</CardTitle>
          </CardHeader>
          <CardContent>
            <dl>
              <Row
                label="Interest level"
                value={
                  lead.interest_level ? (
                    <Badge
                      tone={
                        lead.interest_level === "HIGH"
                          ? "success"
                          : lead.interest_level === "MEDIUM"
                            ? "warn"
                            : "neutral"
                      }
                    >
                      {INTEREST_LABEL[lead.interest_level]}
                    </Badge>
                  ) : null
                }
              />
              <Row
                label="Business model discussed"
                value={lead.business_model_discussed}
              />
              <Row
                label="Next follow-up"
                value={
                  lead.next_followup_at
                    ? formatDateTime(lead.next_followup_at)
                    : null
                }
              />
              <Row label="Rejection reason" value={lead.rejection_reason} />
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Their message</CardTitle>
          </CardHeader>
          <CardContent>
            {lead.message ? (
              <p className="whitespace-pre-wrap text-[0.85rem] leading-relaxed text-ink">
                {lead.message}
              </p>
            ) : (
              <p className="text-[0.82rem] text-ink-soft">
                No message came with this enquiry.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Record</CardTitle>
          </CardHeader>
          <CardContent>
            <dl>
              <Row label="Created" value={formatDateTime(lead.created_at)} />
              <Row
                label="Created by"
                value={lead.createdByName ?? "Website enquiry form"}
              />
              <Row label="Last updated" value={formatDateTime(lead.updated_at)} />
              <Row
                label="Marketing consent"
                value={lead.consent_given ? "Given" : "Not given"}
              />
            </dl>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
