-- Make email attachments visible in the lead's Emails tab, and keep an
-- individual document approval distinct from final franchise approval.

alter table public.email_logs
  add column if not exists attachment_names text[] not null default '{}';

insert into public.email_templates (
  template_key,
  name,
  subject,
  body_html,
  default_subject,
  default_body,
  variables
)
values (
  'DOCUMENT_APPROVED',
  'Document Approved',
  'Your {{document_names}} has been approved',
  '<h2 style="margin:0 0 16px;font-family:Georgia,''Times New Roman'',serif;font-size:21px;line-height:1.3;color:#8e1218;font-weight:700;">Document approved</h2><p>Hi {{applicant_name}},</p><p>We have reviewed and approved your <strong>{{document_names}}</strong>.</p><p>We will contact you when the next step is ready.</p>',
  'Your {{document_names}} has been approved',
  '<h2 style="margin:0 0 16px;font-family:Georgia,''Times New Roman'',serif;font-size:21px;line-height:1.3;color:#8e1218;font-weight:700;">Document approved</h2><p>Hi {{applicant_name}},</p><p>We have reviewed and approved your <strong>{{document_names}}</strong>.</p><p>We will contact you when the next step is ready.</p>',
  array['applicant_name', 'document_names']
)
on conflict (template_key) do nothing;
