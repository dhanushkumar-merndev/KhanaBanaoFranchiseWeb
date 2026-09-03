-- ===================================================================
-- 0012  Profile avatars + branded transactional email
--
-- 1. profiles.avatar_url — the Google photo shown in the members table and
--    the topbar. It previously existed only on auth.users, which is readable
--    for the signed-in session alone, so every other member rendered as
--    initials. The sign-in callback now copies it onto the profile.
--
-- 2. All transactional templates rewritten as branded content. The header,
--    logo and footer are NOT stored here — src/lib/email/layout.ts wraps every
--    send, so admins edit plain content HTML and cannot break the chrome.
--    DOCUMENT_ACCESS_OTP is seeded for the first time; it was declared in
--    EMAIL_TEMPLATE_KEYS but never inserted, and only worked because the OTP
--    action passed an inline override.
--
--    This resets subject and body for every key, so admin edits made in
--    /admin/email-templates before this migration are replaced.
-- ===================================================================

alter table profiles add column if not exists avatar_url text;

comment on column profiles.avatar_url is
  'Google profile photo URL, refreshed by the auth callback on each sign-in.';

-- Backfill for anyone who already signed in, so existing members do not have
-- to sign in again before their photo appears.
update profiles p
set avatar_url = coalesce(
      u.raw_user_meta_data ->> 'avatar_url',
      u.raw_user_meta_data ->> 'picture'
    )
from auth.users u
where p.auth_user_id = u.id
  and p.avatar_url is null
  and coalesce(
        u.raw_user_meta_data ->> 'avatar_url',
        u.raw_user_meta_data ->> 'picture'
      ) like 'https://%';

-- -------------------------------------------------------------------
-- Branded template content
-- -------------------------------------------------------------------

with seed (template_key, name, subject, body, variables) as (
  values
    ('MEMBER_INVITATION', 'Member Invitation',
     'You have been invited to the KHANA BANAO franchise team',
     '<h2 style="margin:0 0 16px;font-family:Georgia,''Times New Roman'',serif;font-size:21px;line-height:1.3;color:#8e1218;font-weight:700;">You have been invited to the team</h2><p>Hi {{applicant_name}},</p><p>You now have access to the KHANA BANAO franchise portal. Sign in with this Google account to see the leads assigned to you and follow them through to a live franchise.</p><p style="margin:26px 0;"><a href="{{application_link}}" style="display:inline-block;background:#c1272d;color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;line-height:1;padding:14px 30px;border-radius:8px;">Accept your invitation</a></p><p style="margin:24px 0 0;font-size:13px;color:#696158;">Sign in with the same email address this message was sent to &mdash; the invitation is tied to it.</p>',
     array['applicant_name','application_link']::text[]),
    ('ENQUIRY_RECEIVED', 'Enquiry Received',
     'We received your KHANA BANAO franchise enquiry',
     '<h2 style="margin:0 0 16px;font-family:Georgia,''Times New Roman'',serif;font-size:21px;line-height:1.3;color:#8e1218;font-weight:700;">Thank you for your enquiry</h2><p>Hi {{applicant_name}},</p><p>We have received your interest in a KHANA BANAO franchise. One of our franchise advisors will call you shortly to understand your plans and answer your questions.</p><div style="margin:0 0 20px;padding:14px 18px;background:#faf5ee;border-left:3px solid #c8a24d;border-radius:0 8px 8px 0;font-size:14px;line-height:1.6;">Your enquiry reference is <strong>{{lead_number}}</strong></div><p>Please keep this reference handy &mdash; it identifies your enquiry in everything that follows.</p>',
     array['applicant_name','lead_number']),
    ('APPLICATION_LINK', 'Application Link',
     'Your KHANA BANAO franchise application form',
     '<h2 style="margin:0 0 16px;font-family:Georgia,''Times New Roman'',serif;font-size:21px;line-height:1.3;color:#8e1218;font-weight:700;">Your application form is ready</h2><p>Hi {{applicant_name}},</p><p>Please complete your franchise application using the secure link below. The link is unique to you, so do not forward or share it.</p><p style="margin:26px 0;"><a href="{{application_link}}" style="display:inline-block;background:#c1272d;color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;line-height:1;padding:14px 30px;border-radius:8px;">Open your application form</a></p><div style="margin:0 0 20px;padding:14px 18px;background:#faf5ee;border-left:3px solid #c8a24d;border-radius:0 8px 8px 0;font-size:14px;line-height:1.6;">Reference: <strong>{{lead_number}}</strong></div>',
     array['applicant_name','lead_number','application_link']),
    ('APPLICATION_SUBMITTED', 'Application Submitted',
     'We received your franchise application {{application_number}}',
     '<h2 style="margin:0 0 16px;font-family:Georgia,''Times New Roman'',serif;font-size:21px;line-height:1.3;color:#8e1218;font-weight:700;">Application received</h2><p>Hi {{applicant_name}},</p><p>Your application is now with our franchise team and under review. We will write again with the next step shortly &mdash; nothing is needed from you in the meantime.</p><div style="margin:0 0 20px;padding:14px 18px;background:#faf5ee;border-left:3px solid #c8a24d;border-radius:0 8px 8px 0;font-size:14px;line-height:1.6;">Application number: <strong>{{application_number}}</strong></div>',
     array['applicant_name','application_number']),
    ('DOCUMENT_REQUEST', 'Document Request',
     'Documents needed for your KHANA BANAO application',
     '<h2 style="margin:0 0 16px;font-family:Georgia,''Times New Roman'',serif;font-size:21px;line-height:1.3;color:#8e1218;font-weight:700;">A few documents to upload</h2><p>Hi {{applicant_name}},</p><p>To move your application forward, please upload the following:</p><div style="margin:0 0 20px;padding:14px 18px;background:#faf5ee;border-left:3px solid #c8a24d;border-radius:0 8px 8px 0;font-size:14px;line-height:1.6;">{{document_names}}</div><p style="margin:26px 0;"><a href="{{application_link}}" style="display:inline-block;background:#c1272d;color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;line-height:1;padding:14px 30px;border-radius:8px;">Upload your documents</a></p>',
     array['applicant_name','document_names','application_link']),
    ('DOCUMENT_REUPLOAD_REQUEST', 'Document Re-upload Request',
     'Please re-upload a document for your application',
     '<h2 style="margin:0 0 16px;font-family:Georgia,''Times New Roman'',serif;font-size:21px;line-height:1.3;color:#8e1218;font-weight:700;">One document needs a clearer copy</h2><p>Hi {{applicant_name}},</p><p>We were not able to accept <strong>{{document_names}}</strong> as uploaded.</p><div style="margin:0 0 20px;padding:14px 18px;background:#faf5ee;border-left:3px solid #c8a24d;border-radius:0 8px 8px 0;font-size:14px;line-height:1.6;">Reason: {{reupload_reason}}</div><p style="margin:26px 0;"><a href="{{application_link}}" style="display:inline-block;background:#c1272d;color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;line-height:1;padding:14px 30px;border-radius:8px;">Upload the corrected document</a></p>',
     array['applicant_name','document_names','reupload_reason','application_link']),
    ('DOCUMENT_ACCESS_OTP', 'Document Access Code',
     'Your KHANA BANAO document verification code',
     '<h2 style="margin:0 0 16px;font-family:Georgia,''Times New Roman'',serif;font-size:21px;line-height:1.3;color:#8e1218;font-weight:700;">Your verification code</h2><p>Hi {{applicant_name}},</p><p>Use this code to open your secure document-upload page:</p><p style="margin:26px 0;padding:20px;background:#faf5ee;border:1px dashed #c8a24d;border-radius:10px;text-align:center;font-size:32px;line-height:1.1;font-weight:700;letter-spacing:10px;color:#8e1218;">{{verification_code}}</p><p>The code expires in 10 minutes. Never share it &mdash; our team will not ask you for it.</p><div style="margin:0 0 20px;padding:14px 18px;background:#faf5ee;border-left:3px solid #c8a24d;border-radius:0 8px 8px 0;font-size:14px;line-height:1.6;">Reference: <strong>{{lead_number}}</strong></div>',
     array['applicant_name','verification_code','lead_number']),
    ('APPLICATION_APPROVED', 'Application Approved',
     'Congratulations — your KHANA BANAO franchise is approved',
     '<h2 style="margin:0 0 16px;font-family:Georgia,''Times New Roman'',serif;font-size:21px;line-height:1.3;color:#8e1218;font-weight:700;">Your franchise is approved</h2><p>Hi {{applicant_name}},</p><p>Application <strong>{{application_number}}</strong> has been approved for the territory <strong>{{territory}}</strong>. Congratulations &mdash; we are glad to have you with us.</p><p>Our team will share your franchise agreement next. Nothing is needed from you until it arrives.</p>',
     array['applicant_name','application_number','territory']),
    ('APPLICATION_REJECTED', 'Application Rejected',
     'Update on your KHANA BANAO franchise application',
     '<h2 style="margin:0 0 16px;font-family:Georgia,''Times New Roman'',serif;font-size:21px;line-height:1.3;color:#8e1218;font-weight:700;">An update on your application</h2><p>Hi {{applicant_name}},</p><p>Thank you for your interest in KHANA BANAO. After review, we are not able to take application <strong>{{application_number}}</strong> forward at this time.</p><p>We are grateful for the time you gave this, and we will keep your details on file should a suitable territory open up.</p>',
     array['applicant_name','application_number']),
    ('AGREEMENT_SENT', 'Agreement Sent',
     'Your KHANA BANAO franchise agreement {{agreement_number}}',
     '<h2 style="margin:0 0 16px;font-family:Georgia,''Times New Roman'',serif;font-size:21px;line-height:1.3;color:#8e1218;font-weight:700;">Your franchise agreement</h2><p>Hi {{applicant_name}},</p><p>Agreement <strong>{{agreement_number}}</strong> is attached to this email, together with the franchise brochure for your reference. Please read the agreement carefully, sign it, and return the signed copy to us.</p><p>If anything in it is unclear, call us before you sign &mdash; we would much rather talk it through first.</p>',
     array['applicant_name','agreement_number']),
    ('PAYMENT_APPROVED', 'Payment Approved',
     'Payment received — thank you',
     '<h2 style="margin:0 0 16px;font-family:Georgia,''Times New Roman'',serif;font-size:21px;line-height:1.3;color:#8e1218;font-weight:700;">Payment confirmed</h2><p>Hi {{applicant_name}},</p><p>We have confirmed your payment of <strong>{{payment_amount}}</strong>. Thank you.</p><p>Your franchise activation is now in progress, and we will write again as soon as it is complete.</p>',
     array['applicant_name','payment_amount']),
    ('PAYMENT_REJECTED', 'Payment Rejected',
     'We could not verify your payment proof',
     '<h2 style="margin:0 0 16px;font-family:Georgia,''Times New Roman'',serif;font-size:21px;line-height:1.3;color:#8e1218;font-weight:700;">We could not verify your payment</h2><p>Hi {{applicant_name}},</p><p>The payment proof you shared could not be verified against our records.</p><div style="margin:0 0 20px;padding:14px 18px;background:#faf5ee;border-left:3px solid #c8a24d;border-radius:0 8px 8px 0;font-size:14px;line-height:1.6;">Reason: {{reupload_reason}}</div><p>Please share a corrected proof and we will review it right away.</p>',
     array['applicant_name','reupload_reason']),
    ('FRANCHISE_ACTIVATED', 'Franchise Activated',
     'Welcome aboard — your franchise {{franchise_id}} is active',
     '<h2 style="margin:0 0 16px;font-family:Georgia,''Times New Roman'',serif;font-size:21px;line-height:1.3;color:#8e1218;font-weight:700;">Welcome aboard</h2><p>Hi {{applicant_name}},</p><p>Your KHANA BANAO franchise <strong>{{franchise_id}}</strong> is now active for <strong>{{territory}}</strong>.</p><p>Start by setting the password for your partner dashboard:</p><p style="margin:26px 0;"><a href="{{password_setup_link}}" style="display:inline-block;background:#c1272d;color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;line-height:1;padding:14px 30px;border-radius:8px;">Set your password</a></p><p>After that, your dashboard lives at <a href="{{dashboard_url}}">{{dashboard_url}}</a>.</p><div style="margin:0 0 20px;padding:14px 18px;background:#faf5ee;border-left:3px solid #c8a24d;border-radius:0 8px 8px 0;font-size:14px;line-height:1.6;">Your support contact is <strong>{{support_name}}</strong> on {{support_phone}}.</div>',
     array['applicant_name','franchise_id','territory','password_setup_link','dashboard_url','support_name','support_phone']),
    ('TRAINING_SCHEDULED', 'Training Scheduled',
     'Your KHANA BANAO training is scheduled',
     '<h2 style="margin:0 0 16px;font-family:Georgia,''Times New Roman'',serif;font-size:21px;line-height:1.3;color:#8e1218;font-weight:700;">Your training is scheduled</h2><p>Hi {{applicant_name}},</p><p>Your training is confirmed for <strong>{{training_date}}</strong>.</p><p>{{support_name}} will send the joining details and anything to prepare closer to the date.</p>',
     array['applicant_name','training_date','support_name']),
    ('TRAINING_COMPLETED', 'Training Completed',
     'Training complete — next step is your setup',
     '<h2 style="margin:0 0 16px;font-family:Georgia,''Times New Roman'',serif;font-size:21px;line-height:1.3;color:#8e1218;font-weight:700;">Training complete</h2><p>Hi {{applicant_name}},</p><p>You have completed your KHANA BANAO training &mdash; well done.</p><p>We now move on to business setup for <strong>{{territory}}</strong>, and your support contact will guide you through it.</p>',
     array['applicant_name','territory']),
    ('GO_LIVE_CONFIRMATION', 'Go Live Confirmation',
     'You are live — congratulations!',
     '<h2 style="margin:0 0 16px;font-family:Georgia,''Times New Roman'',serif;font-size:21px;line-height:1.3;color:#8e1218;font-weight:700;">You are live</h2><p>Hi {{applicant_name}},</p><p>Your KHANA BANAO franchise <strong>{{franchise_id}}</strong> in <strong>{{territory}}</strong> is now live and taking orders. Congratulations on the launch.</p><div style="margin:0 0 20px;padding:14px 18px;background:#faf5ee;border-left:3px solid #c8a24d;border-radius:0 8px 8px 0;font-size:14px;line-height:1.6;">Your support contact is <strong>{{support_name}}</strong> on {{support_phone}}.</div>',
     array['applicant_name','franchise_id','territory','support_name','support_phone'])
)
insert into email_templates
  (template_key, name, subject, body_html, default_subject, default_body, variables)
select template_key, name, subject, body, subject, body, variables
from seed
on conflict (template_key) do update set
  name            = excluded.name,
  subject         = excluded.subject,
  body_html       = excluded.body_html,
  default_subject = excluded.default_subject,
  default_body    = excluded.default_body,
  variables       = excluded.variables,
  updated_by      = null;
