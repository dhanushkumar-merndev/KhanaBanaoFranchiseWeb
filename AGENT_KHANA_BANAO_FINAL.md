# AGENT.md — KHANA BANAO Franchise Partner Management System

## 1. Project Goal

Build a production-ready franchise partner management web application for **KHANA BANAO**.

The system must follow this client journey:

```text
Franchise Enquiry
→ Business Discussion
→ Application Form
→ Application Review
→ Franchise Approval
→ Franchise Agreement
→ Payment
→ Franchise Activation
→ Training
→ Business Setup
→ Go Live
→ Ongoing Support
```

Keep the product simple for non-technical staff. Use only two internal roles:

```text
ADMIN
MEMBER
```

Do not add unrelated CRM modules or future features.

---

## 2. Final Technology Stack

Use:

```text
Next.js App Router
TypeScript
React
Tailwind CSS
shadcn/ui
TanStack Table
TanStack Virtual
React Hook Form
Zod
Supabase Auth
Supabase PostgreSQL
Supabase Storage
Supabase Realtime
Brevo Transactional Email
Lenis Smooth Scroll
Recharts through shadcn/ui charts
Vercel deployment
```

### Fixed decisions

- Use Next.js for frontend and backend.
- Use Supabase for Google login, database, storage and realtime.
- Use Brevo for transactional email.
- Use Google login for Admin and Members.
- Do not use Redis.
- Do not create a separate Express/Nest backend.
- Do not use an online payment gateway.
- Payment proof is uploaded and approved manually.
- Use private Supabase Storage buckets.
- Use server-side pagination and filters.
- Use automated tests for all main flows.

---

## 3. Brand and UI Direction

Use the supplied **KHANA BANAO logo** as the visual reference.

### Brand palette

```css
:root {
  --brand-red: #e5483f;
  --brand-blue: #1398eb;
  --brand-beige: #cdbb9b;
  --brand-black: #111111;

  --background: #fffaf4;
  --surface: #ffffff;
  --surface-muted: #f7f1e8;
  --border: #e7ddd0;

  --text-primary: #1d1d1d;
  --text-secondary: #696158;

  --success: #2f9e44;
  --warning: #e9a23b;
  --danger: #d94841;
  --info: #168aad;
}
```

### UI rules

- Use warm white and beige backgrounds.
- Use red for primary actions.
- Use blue for links, secondary actions and selected items.
- Use dark text for readability.
- Use rounded cards, soft borders and subtle shadows.
- Keep layouts spacious and uncluttered.
- Use status colours only where they add meaning.
- Use subtle animation only.
- Use Lenis on the public landing page.
- Do not use heavy parallax or excessive motion.
- The admin dashboard should be desktop-first and responsive.
- Public pages must be fully responsive.
- Use accessible contrast, focus states and keyboard support.

### Client reference image

Use the supplied franchise-process image as a reference for:

- Process order
- Section grouping
- Application form categories
- Status presentation
- Franchise journey timeline
- Benefits section

Do not recreate it as a flat poster. Convert it into a modern responsive website.

---

## 4. Roles and Responsibilities

## 4.1 Admin

The Admin can:

- Sign in with Google through Supabase Auth.
- Invite Members.
- Maintain a maximum of 20 active Members.
- Activate or deactivate Members.
- View all Members.
- View all leads.
- View every Member's assigned leads.
- Enable round-robin assignment.
- Manually assign or reassign leads.
- View analytics and Member performance.
- Review applications.
- Review every requested document separately.
- Approve documents.
- Request document re-upload.
- Approve or reject payment proof.
- Manage agreement records.
- Activate franchise partners.
- View active and live franchises.
- Manage training and setup.
- Mark a franchise live.
- Manage ongoing support notes.
- View, edit and preview email templates.
- Send test emails.
- View email logs and activity history.

Only the Admin can perform final approvals.

## 4.2 Member

A Member can:

- Sign in with an invited Google account.
- View only assigned leads.
- Contact assigned leads.
- Add call, WhatsApp, email or meeting notes.
- Record business discussions.
- Record franchise model, investment and territory discussions.
- Schedule follow-ups.
- Accept or reject a lead.
- Enter a mandatory rejection reason.
- Send the public application link after acceptance.
- Select required documents.
- Send document-request email.
- Track document-upload status.
- See approval and re-upload status.
- Record payment information.
- Upload payment proof.
- Submit payment proof to Admin.
- See Admin rejection reasons.
- Upload corrected payment proof.
- Track the full lead pipeline.

Members cannot:

- Create Members.
- View another Member's leads.
- Approve applications.
- Approve documents.
- Approve payments.
- Complete final agreement approval.
- Activate franchises.
- Mark a franchise live.
- Manage email templates.
- Change system settings.

---

## 5. Member Invitation and Google Login

The Admin creates a Member invitation using:

```text
Full name
Google email
Phone number
```

Flow:

1. Check that active Member count is below 20.
2. Create a pending invitation.
3. Send invitation email through Brevo.
4. Member clicks the invitation and chooses Google login.
5. Supabase verifies the Google account.
6. Allow access only when Google email matches the invited email.
7. Create the Member profile.
8. Mark invitation as accepted.

Invitation statuses:

```text
PENDING
ACCEPTED
EXPIRED
REVOKED
```

Maximum rule:

```text
Maximum active Members: 20
```

Enforce this on the server. Inactive Members do not count toward the limit.

---

## 6. Public Landing Page

Create a complete franchise landing page.

### Required sections

1. Header
2. Hero
3. Franchise introduction
4. Why partner with KHANA BANAO
5. Benefits
6. Franchise process
7. Eligibility
8. Investment overview
9. Franchise enquiry form
10. FAQ
11. Contact section
12. Footer

### Hero direction

```text
Start Your Own Business.
Grow With KHANA BANAO.
```

Primary CTA:

```text
Become a Franchise Partner
```

Secondary CTA:

```text
View Franchise Process
```

### Public process timeline

```text
01 Franchise Enquiry
02 Business Discussion
03 Application Review
04 Franchise Approval
05 Franchise Agreement
06 Payment
07 Franchise Activation
08 Training
09 Business Setup
10 Go Live
11 Ongoing Support
```

### Landing-page experience

- Use Lenis smooth scrolling.
- Use subtle reveal animations.
- Use sticky navigation.
- Optimize images.
- Avoid layout shifts.
- Keep the enquiry form simple.
- Show clear success and error states.

---

## 7. Franchise Enquiry Form

Fields:

```text
Full name
Phone number
WhatsApp number
Email
City
Preferred territory
Investment range
Current occupation
Existing business
Message
Consent checkbox
```

Required:

```text
Full name
Phone number
Email
City
Consent
```

On submission:

1. Validate with Zod on the server.
2. Normalize phone and email.
3. Create a lead.
4. Set source to `WEBSITE`.
5. Set status to `NEW`.
6. Assign through round-robin when enabled.
7. Send enquiry-received email.
8. Show a success message.
9. Make the lead visible in the dashboard.

---

## 8. Manual Lead Creation

Admin can create leads manually.

Lead sources:

```text
WEBSITE
WHATSAPP
PHONE
REFERRAL
WALK_IN
EMAIL
FACEBOOK
INSTAGRAM
OTHER
```

Fields:

```text
Name
Phone
WhatsApp
Email
City
Source
Preferred territory
Investment range
Notes
```

Admin may assign the lead manually or leave it for round-robin assignment.

---

## 9. Round-Robin Assignment

Round-robin must distribute new leads equally among active Members.

Rules:

1. Use only active Members.
2. Ignore inactive Members.
3. Assign new leads in rotation.
4. Store the last assignment position.
5. Record assignment history.
6. Allow Admin manual reassignment.
7. If no active Member exists, leave the lead unassigned.
8. Show unassigned leads clearly to Admin.

Example:

```text
Lead 1 → Member A
Lead 2 → Member B
Lead 3 → Member C
Lead 4 → Member A
```

Use a database transaction so simultaneous incoming leads do not corrupt the rotation.

---

## 10. Lead Pipeline

Use these statuses:

```text
NEW
ASSIGNED
CONTACTED
BUSINESS_DISCUSSION
FOLLOW_UP
ACCEPTED
REJECTED
APPLICATION_LINK_SENT
APPLICATION_IN_PROGRESS
APPLICATION_SUBMITTED
APPLICATION_UNDER_REVIEW
DOCUMENTS_PENDING
DOCUMENTS_PARTIALLY_SUBMITTED
DOCUMENTS_UNDER_REVIEW
DOCUMENT_CORRECTION_REQUIRED
DOCUMENTS_APPROVED
FRANCHISE_APPROVED
AGREEMENT_PENDING
AGREEMENT_SENT
AGREEMENT_COMPLETED
PAYMENT_PENDING
PAYMENT_PROOF_SUBMITTED
PAYMENT_REJECTED
PAYMENT_APPROVED
READY_FOR_ACTIVATION
ACTIVE
TRAINING_PENDING
TRAINING_SCHEDULED
TRAINING_IN_PROGRESS
TRAINING_COMPLETED
SETUP_PENDING
SETUP_IN_PROGRESS
SETUP_COMPLETED
READY_TO_GO_LIVE
LIVE
ONGOING_SUPPORT
```

Do not use a generic final status such as `COMPLETED`.

Successful business status:

```text
LIVE
```

After go-live:

```text
ONGOING_SUPPORT
```

---

## 11. Lead Details Page

Use one main lead-details page with tabs.

Tabs:

```text
Overview
Activity
Follow-Ups
Application
Documents
Agreement
Payment
Activation
Training
Setup
Emails
```

Header:

```text
Lead name
Lead number
Phone
Email
Assigned Member
Current status
Created date
Next follow-up
```

Show only context-relevant actions.

Examples:

```text
NEW → Contact Lead
BUSINESS_DISCUSSION → Add Discussion / Follow-Up / Accept / Reject
ACCEPTED → Send Application Link
APPLICATION_SUBMITTED → Review Application
DOCUMENTS_PENDING → Request Documents
PAYMENT_PENDING → Upload Payment Proof
```

Do not show every action at once.

---

## 12. Business Discussion and Follow-Up

### Business discussion fields

```text
Contact channel
Discussion date
Discussion summary
Business model discussed
Investment discussed
Territory discussed
Interest level
Next follow-up
Outcome
Notes
```

Channels:

```text
PHONE
WHATSAPP
EMAIL
VIDEO_MEETING
OFFICE_MEETING
OTHER
```

Outcomes:

```text
ACCEPTED
FOLLOW_UP_REQUIRED
REJECTED
UNREACHABLE
```

If rejected, rejection reason is mandatory.

### Follow-up statuses

```text
PENDING
COMPLETED
OVERDUE
CANCELLED
RESCHEDULED
```

Follow-up views:

```text
Due Today
Upcoming
Overdue
Completed
```

---

## 13. Public Application Form

After acceptance, the Member sends a secure application link.

Route:

```text
/franchise/application/[token]
```

Applicant does not log in.

### Application sections

#### Personal information

```text
Full name
Mobile number
WhatsApp number
Email
Date of birth
```

#### Address details

```text
Current address
City
State
PIN code
```

#### Business information

```text
Current occupation
Business experience
Company name
GST number
```

#### Franchise details

```text
Preferred city
Preferred territory
Investment budget
Franchise model
Expected start date
```

#### Financial details

```text
Source of investment
Available investment amount
Bank name
```

#### Declaration

```text
Information is true and correct
Consent to verification
Terms acceptance
```

### Submission behaviour

After submission:

```text
APPLICATION_SUBMITTED
```

When the same link is opened again:

- Do not show the editable form.
- Show `Application Submitted Successfully`.
- Show the application number.
- Show the submitted date.
- Prevent duplicate submission.

---

## 14. Document Request Workflow

Documents are selected per applicant. Do not force all documents for everyone.

Available document types:

```text
Aadhaar Card
PAN Card
Passport-size Photograph
Address Proof
Cancelled Cheque
GST Certificate
Business Registration
Premises Photographs
Bank Statement
Other
```

### Request flow

1. Open the accepted lead/application.
2. Click `Request Documents`.
3. Select only required documents.
4. Add an optional note.
5. Preview the email.
6. Send a secure upload link through Brevo.
7. Applicant sees only requested documents.
8. Applicant uploads them.
9. Applicant submits.
10. Admin reviews every document separately.

Document statuses:

```text
REQUESTED
UPLOADED
UNDER_REVIEW
APPROVED
REUPLOAD_REQUIRED
```

Overall document status:

```text
No uploads → DOCUMENTS_PENDING
Some uploads → DOCUMENTS_PARTIALLY_SUBMITTED
All uploaded → DOCUMENTS_UNDER_REVIEW
Any rejected → DOCUMENT_CORRECTION_REQUIRED
All approved → DOCUMENTS_APPROVED
```

---

## 15. Per-Document Admin Approval

Admin document table columns:

```text
Document Type
Applicant
Lead Number
Uploaded At
Version
Status
Reviewed By
Actions
```

Actions:

```text
View
Download
Approve
Request Re-upload
Add Review Note
```

### Approve document

When Admin clicks `Approve`:

1. Show confirmation dialog.
2. Ask whether to send an email.
3. Options:
   - `Approve and Send Email`
   - `Approve Without Email`
   - `Cancel`
4. Update document status.
5. Record reviewer and timestamp.
6. Send email only when selected.
7. Store email log.

### Request re-upload

1. Require a reason.
2. Set `REUPLOAD_REQUIRED`.
3. Generate secure upload link.
4. Preview the email.
5. Ask whether to send now.
6. Applicant page shows only the rejected document.
7. Previously approved documents stay locked.

---

## 16. Franchise Approval

Allow approval only when:

```text
Application submitted
Business discussion completed
All required documents approved
```

Admin records:

```text
Approved territory
Approved franchise model
Approved investment
Approval notes
Approval letter
```

Approval dialog options:

```text
Approve and Send Email
Approve Without Email
Cancel
```

On approval:

- Set `FRANCHISE_APPROVED`.
- Store decision and reviewer.
- Show downloadable approval letter when available.
- Send email only when selected.

---

## 17. Agreement Management

Agreement must have a separate page.

Statuses:

```text
PENDING
UPLOADED
SENT
SIGNED_BY_APPLICANT
SIGNED_BY_COMPANY
COMPLETED
```

Agreement page:

```text
Agreement number
Applicant
Lead number
Version
Agreement file
Date sent
Applicant signed date
Company signed date
Completion date
Status
Notes
Activity
```

Admin can:

```text
Upload agreement
Mark as sent
Mark applicant signed
Mark company signed
Mark completed
Download agreement
Send agreement email
```

Record every status change.

---

## 18. Payment Workflow

Member records payment information:

```text
Amount
Payment mode
Reference number
Payment date
Payment proof
Notes
```

Payment modes:

```text
BANK_TRANSFER
UPI
CHEQUE
CASH
DEMAND_DRAFT
OTHER
```

Member flow:

```text
PAYMENT_PENDING
→ Upload proof
→ PAYMENT_PROOF_SUBMITTED
```

Admin actions:

```text
View proof
Download proof
Approve
Reject
Add note
```

### Payment approval

Dialog options:

```text
Approve and Send Email
Approve Without Email
Cancel
```

On approval:

- Set `PAYMENT_APPROVED`.
- Record reviewer.
- Send email only when selected.
- Continue to activation.

### Payment rejection

- Require reason.
- Set `PAYMENT_REJECTED`.
- Show reason to Member.
- Allow corrected proof upload.
- Optionally send rejection email.

Use private Supabase Storage.

---

## 19. Franchise Activation

Activation means converting the approved lead into an active franchise partner.

Prerequisites:

```text
Franchise approved
Agreement completed
Payment approved
```

Admin records:

```text
Franchise ID
Franchise name
Owner name
Territory
Activation date
CRM login email
Dashboard URL
Support contact
Notes
```

Status:

```text
READY_FOR_ACTIVATION
→ ACTIVE
```

On activation:

1. Create franchise record.
2. Generate Franchise ID.
3. Send CRM invitation or password-setup link.
4. Never send a plain-text permanent password.
5. Ask Admin whether to send activation email.
6. Update analytics.

Dashboard counters:

```text
Active Franchises
Activation Pending
Recently Activated
Live Franchises
```

---

## 20. Training, Setup and Go Live

### Training statuses

```text
TRAINING_PENDING
TRAINING_SCHEDULED
TRAINING_IN_PROGRESS
TRAINING_COMPLETED
```

Training fields:

```text
Training module
Trainer
Scheduled date
Meeting link or venue
Attendance
Status
Notes
Completion date
```

Suggested modules:

```text
CRM usage
Sales process
Operations
Customer service
Billing
Marketing
Reporting
```

### Setup statuses

```text
SETUP_PENDING
SETUP_IN_PROGRESS
SETUP_COMPLETED
```

Setup checklist:

```text
CRM configured
Territory configured
Address confirmed
Bank details confirmed
GST details confirmed
Staff details added
Pricing configured
Vendor network prepared
Chef/service network prepared
Marketing assets shared
Test booking completed
Support contact assigned
```

### Go-live status

```text
READY_TO_GO_LIVE
→ LIVE
→ ONGOING_SUPPORT
```

Store:

```text
Go-live date
Activated by
Support owner
Territory
Remarks
```

---

## 21. Brevo Email System

Use Brevo for transactional email.

Required templates:

```text
Member Invitation
Enquiry Received
Application Link
Application Submitted
Document Request
Document Re-upload Request
Application Approved
Application Rejected
Agreement Sent
Payment Approved
Payment Rejected
Franchise Activated
Training Scheduled
Training Completed
Go Live Confirmation
```

### Admin email-template page

Admin can:

- View all templates.
- Search templates.
- Edit subject.
- Edit body.
- Insert variables.
- Preview.
- Send a test email.
- Activate/deactivate template.
- Reset to default.
- View last-updated time.

Template variables:

```text
{{applicant_name}}
{{lead_number}}
{{application_number}}
{{application_link}}
{{document_names}}
{{reupload_reason}}
{{territory}}
{{agreement_number}}
{{payment_amount}}
{{franchise_id}}
{{dashboard_url}}
{{password_setup_link}}
{{training_date}}
{{support_name}}
{{support_phone}}
```

### Important email confirmation pattern

For approvals and important changes, always show:

```text
[Approve and Send Email]
[Approve Without Email]
[Cancel]
```

Use this pattern for:

- Document approval
- Document re-upload request
- Franchise approval
- Agreement sent
- Payment approval
- Payment rejection
- Franchise activation
- Training scheduling
- Go live

Email failure must not undo a successful business action.

Log every send attempt.

---

## 22. Admin Dashboard and Analytics

Use shadcn/ui cards and charts.

Summary cards:

```text
Total Leads
New Leads
Assigned Leads
Follow-Ups Due
Accepted Leads
Rejected Leads
Applications Submitted
Documents Pending Review
Payments Pending Approval
Agreements Pending
Active Franchises
Live Franchises
```

Charts:

```text
Leads by Status
Leads by Source
Leads by Member
Accepted vs Rejected
Monthly Lead Trend
Franchise Pipeline
Payment Status
Active Franchises by Territory
```

Member-performance table:

```text
Member
Assigned Leads
Contacted Leads
Follow-Ups Completed
Accepted
Rejected
Applications Sent
Documents Collected
Payment Proofs Submitted
Live Conversions
```

---

## 23. Member Dashboard

Show:

```text
My New Leads
My Follow-Ups Today
My Overdue Follow-Ups
My Accepted Leads
Applications Waiting
Documents Pending
Payment Proof Rejected
Recent Activity
```

Members see only assigned leads.

---

## 24. Tables

Use one reusable TanStack Table system across the app.

Required features:

```text
Server-side pagination
Server-side filtering
Server-side sorting
Search
Column visibility
Sticky header
Responsive layout
Row actions
Loading skeleton
Empty state
Error state
Optional row selection
Virtualization for visible rows
```

Page sizes:

```text
20
50
100
```

Use TanStack Virtual only for rendering visible rows.

Do not fetch thousands of rows into the browser.

Use this table system for:

```text
Members
Leads
Follow-Ups
Applications
Documents
Agreements
Payments
Franchises
Training
Email Logs
Activity
```

Lead-table columns:

```text
Lead Number
Name
Phone
Email
Source
Assigned To
Created At
Status
Next Follow-Up
Actions
```

Default new-lead status:

```text
NEW
```

---

## 25. Supabase Storage

Use private buckets:

```text
franchise-documents
payment-proofs
franchise-agreements
training-documents
approval-letters
```

Suggested paths:

```text
franchise-documents/{applicationId}/{documentRequestId}/{fileName}
payment-proofs/{leadId}/{paymentId}/{fileName}
franchise-agreements/{leadId}/{agreementId}/{fileName}
training-documents/{franchiseId}/{trainingId}/{fileName}
approval-letters/{applicationId}/{fileName}
```

Rules:

- Buckets must remain private.
- Use signed URLs.
- Validate type and size.
- Allow PDF, JPG, JPEG and PNG.
- Do not expose permanent URLs.
- Members can upload allowed files.
- Only Admin can approve.

---

## 26. Database Tables

Use this simple structure:

```text
profiles
member_invitations
leads
lead_assignments
lead_activities
followups
applications
application_tokens
document_requests
documents
document_reviews
agreements
payments
franchises
training_records
setup_items
email_templates
email_logs
activity_logs
```

### profiles

```text
id
auth_user_id
full_name
email
phone
role
status
created_by
created_at
updated_at
```

Roles:

```text
ADMIN
MEMBER
```

Statuses:

```text
ACTIVE
INACTIVE
```

### leads

```text
id
lead_number
full_name
phone
whatsapp
email
city
source
assigned_member_id
current_status
business_model_discussed
interest_level
rejection_reason
next_followup_at
created_by
created_at
updated_at
```

### lead_activities

```text
id
lead_id
member_id
activity_type
channel
notes
previous_status
new_status
followup_at
created_at
```

### applications

```text
id
lead_id
application_number
personal_details jsonb
address_details jsonb
business_details jsonb
franchise_details jsonb
financial_details jsonb
status
submitted_at
reviewed_by
reviewed_at
created_at
updated_at
```

### document_requests

```text
id
application_id
document_type
is_required
request_note
status
requested_by
requested_at
```

### documents

```text
id
document_request_id
application_id
document_type
storage_path
file_name
file_size
mime_type
version
status
uploaded_at
reviewed_by
reviewed_at
rejection_reason
```

### agreements

```text
id
lead_id
agreement_number
version
storage_path
status
sent_at
applicant_signed_at
company_signed_at
completed_at
notes
```

### payments

```text
id
lead_id
amount
payment_mode
reference_number
payment_date
proof_storage_path
status
submitted_by
submitted_at
reviewed_by
reviewed_at
rejection_reason
notes
```

### franchises

```text
id
lead_id
franchise_id
franchise_name
owner_name
phone
email
territory
crm_login_email
dashboard_url
activation_date
go_live_date
support_owner
status
created_at
```

---

## 27. Supabase Security

Enable Row Level Security.

### Admin

Admin can access all operational records.

### Member

Member can:

- Read assigned leads.
- Update assigned leads.
- Create activity for assigned leads.
- Manage follow-ups for assigned leads.
- Send document requests for assigned leads.
- View document status for assigned leads.
- Upload payment proof for assigned leads.

Member cannot:

- Approve documents.
- Approve payments.
- View another Member's leads.
- Manage Members.
- Manage templates.
- Activate franchises.
- Mark go live.

### Public applicant

Public applicant must not directly query protected Supabase tables.

Validate application and document tokens through Next.js server routes.

---

## 28. Main Routes

### Public

```text
/
/franchise
/franchise/application/[token]
/franchise/documents/[token]
/privacy
/terms
```

### Authentication

```text
/login
/auth/callback
/unauthorized
```

### Admin

```text
/admin
/admin/members
/admin/leads
/admin/leads/[id]
/admin/follow-ups
/admin/applications
/admin/documents
/admin/agreements
/admin/payments
/admin/franchises
/admin/training
/admin/setup
/admin/email-templates
/admin/email-logs
/admin/activity
```

### Member

```text
/member
/member/leads
/member/leads/[id]
/member/follow-ups
/member/applications
/member/documents
/member/payments
```

Use one protected layout with role-aware navigation.

---

## 29. UX Requirements

- Show only relevant actions.
- Use simple wording.
- Avoid technical terms in UI.
- Keep status names understandable.
- Use confirmation dialogs for important actions.
- Show clear success and error messages.
- Use skeleton loaders.
- Use empty states.
- Use retry states.
- Use responsive tables.
- Use breadcrumbs.
- Use sticky action bars on long pages.
- Preserve form state.
- Warn about unsaved changes.
- Show upload progress.
- Show document rejection reason clearly.
- Show payment rejection reason clearly.
- Keep public forms step-by-step.
- Do not communicate status through colour alone.

Status examples:

```text
NEW → Blue
FOLLOW_UP → Amber
ACCEPTED → Green
REJECTED → Red
UNDER_REVIEW → Purple
REUPLOAD_REQUIRED → Orange
PAYMENT_APPROVED → Green
ACTIVE → Blue
LIVE → Green
```

---

## 30. Testing Requirements

The coding agent must create and run most tests.

Use:

```text
Vitest
React Testing Library
Playwright
```

### Unit tests

Test:

```text
Role permissions
Member limit
Round-robin assignment
Lead-status transitions
Phone/email normalization
Document-overall-status calculation
Payment-status transitions
Duplicate application submission prevention
Email-template variables
```

### Component tests

Test:

```text
Lead form
Member invitation form
Follow-up form
Document request dialog
Document approval dialog
Payment approval dialog
Email preview dialog
Status badge
TanStack table filters
```

### End-to-end tests

Test:

```text
Admin Google login
Member invitation
Member Google login
Round-robin assignment
Member sees assigned lead
Business discussion
Accept lead
Send application link
Applicant submits application
Request selected documents
Applicant uploads requested documents
Admin approves one document
Admin requests re-upload for another
Applicant re-uploads
Admin approves all documents
Franchise approval
Agreement completion
Member uploads payment proof
Admin rejects payment proof
Member uploads corrected proof
Admin approves payment
Franchise activation
Training completion
Setup completion
Go live
```

### Completion rule

Before marking a feature complete:

1. Run lint.
2. Run TypeScript checks.
3. Run unit tests.
4. Run relevant component tests.
5. Run relevant Playwright flow.
6. Fix critical errors.
7. Report remaining limitations honestly.

---

## 31. Environment Variables

Use:

```env
# Application
NEXT_PUBLIC_APP_URL=

# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Brevo
BREVO_API_KEY=
BREVO_SENDER_EMAIL=
BREVO_SENDER_NAME=KHANA BANAO Franchise Team

# Secure public links
APPLICATION_TOKEN_SECRET=
DOCUMENT_TOKEN_SECRET=
```

Do not add:

```env
CRON_SECRET=
PASSWORD_SETUP_TOKEN_PEPPER=
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
```

Supabase Auth handles Google login and password setup.

---

## 32. Automatic Email Triggers

Automatic transactional email triggers:

```text
Member invited
Enquiry received
Application link sent
Application submitted
Document request sent
Document re-upload requested
Franchise approved
Application rejected
Agreement sent
Payment approved
Payment rejected
Franchise activated
Training scheduled
Training completed
Go live confirmed
```

For important Admin approvals, always show the choice to send or not send.

Never silently send a high-impact email without confirmation.

---

## 33. Acceptance Criteria

The system is complete when:

1. Admin can sign in with Google.
2. Admin can invite up to 20 active Members.
3. Invited Member can sign in with the invited Google account.
4. Admin can deactivate Members.
5. Website enquiry creates a lead.
6. Leads are distributed using round-robin.
7. Admin can see all Members and their leads.
8. Member sees only assigned leads.
9. Lead table supports pagination, sorting and filtering.
10. Member can record business discussion.
11. Member can accept or reject a lead.
12. Rejection reason is mandatory.
13. Accepted lead can receive application link.
14. Applicant can submit application without login.
15. Submitted application cannot be submitted twice.
16. Member/Admin can select required documents.
17. Applicant sees only requested documents.
18. Admin can approve every document separately.
19. Admin can request re-upload with a reason.
20. Approved documents stay locked.
21. Franchise approval works only after required documents are approved.
22. Agreement has a separate page.
23. Member can upload payment proof.
24. Admin can approve or reject payment.
25. Payment rejection reason is visible to Member.
26. Admin can activate franchise.
27. Admin can see active-franchise count.
28. Training and setup can be tracked.
29. Admin can mark franchise live.
30. Email templates can be viewed and edited.
31. Approval dialogs offer send or do-not-send choices.
32. Brevo email logs are stored.
33. Files use private Supabase Storage.
34. Admin dashboard shows cards and charts.
35. Automated tests cover the main workflow.
36. Landing page follows the supplied reference and logo theme.
37. Application remains simple and easy for staff.

---

## 34. Final Architecture

```text
Public Applicant
├── Franchise enquiry
├── Application form
└── Requested-document upload

Admin
├── Member management
├── All leads
├── Analytics
├── Document approval
├── Payment approval
├── Agreement
├── Activation
├── Training
├── Setup
└── Go live

Member
├── Assigned leads
├── Business discussion
├── Follow-up
├── Accept/reject
├── Application link
├── Document request
└── Payment proof submission

Next.js
├── Public website
├── Admin dashboard
├── Member dashboard
├── Server Actions
└── Route Handlers

Supabase
├── Google Auth
├── PostgreSQL
├── Private Storage
├── RLS
└── Realtime

Brevo
├── Transactional email
├── Editable templates
├── Email preview
└── Email logs
```

---

## 35. Final Development Instruction

Build the product in small, testable modules.

Prioritize:

```text
Simple workflow
Clear permissions
Reliable round-robin assignment
Secure document handling
Per-document approval
Safe payment approval
Editable email templates
Clean user experience
Automated testing
Maintainable code
```

Do not over-engineer the project.

Do not add any module not described in this file.
