-- ===================================================================
-- 0003: private storage buckets + default email templates
-- ===================================================================

-- -------------------------------------------------------------------
-- Buckets — all private. Files are only ever served through short-lived
-- signed URLs minted by the server.
-- -------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('franchise-documents',  'franchise-documents',  false, 10485760,
     array['application/pdf','image/jpeg','image/jpg','image/png','image/webp']),
  ('payment-proofs',       'payment-proofs',       false, 10485760,
     array['application/pdf','image/jpeg','image/jpg','image/png']),
  ('franchise-agreements', 'franchise-agreements', false, 20971520,
     array['application/pdf','image/jpeg','image/jpg','image/png']),
  ('training-documents',   'training-documents',   false, 20971520,
     array['application/pdf','image/jpeg','image/jpg','image/png']),
  ('approval-letters',     'approval-letters',     false, 10485760,
     array['application/pdf','image/jpeg','image/jpg','image/png'])
on conflict (id) do nothing;

-- -------------------------------------------------------------------
-- Storage access. Applicants never authenticate, so the server validates their
-- secure link and issues path-bound signed upload URLs. These policies only
-- cover signed-in staff; signed upload tokens need no applicant RLS policy.
-- -------------------------------------------------------------------

create policy "staff read franchise files"
  on storage.objects for select
  using (
    bucket_id in ('franchise-documents','payment-proofs','franchise-agreements',
                  'training-documents','approval-letters')
    and is_active_staff()
  );

create policy "members upload payment proofs"
  on storage.objects for insert
  with check (bucket_id = 'payment-proofs' and is_active_staff());

create policy "admin writes franchise files"
  on storage.objects for all
  using (
    bucket_id in ('franchise-documents','payment-proofs','franchise-agreements',
                  'training-documents','approval-letters')
    and is_admin()
  )
  with check (
    bucket_id in ('franchise-documents','payment-proofs','franchise-agreements',
                  'training-documents','approval-letters')
    and is_admin()
  );

-- ===================================================================
-- Default transactional email templates
-- ===================================================================

insert into email_templates
  (template_key, name, subject, body_html, default_subject, default_body, variables)
values
  ('MEMBER_INVITATION', 'Member Invitation',
   'You have been invited to the KHANA BANAO franchise team',
   '<p>Hi {{applicant_name}},</p><p>You have been invited to join the KHANA BANAO franchise team. Click below and sign in with this Google account to get started.</p><p><a href="{{application_link}}">Accept your invitation</a></p><p>— KHANA BANAO Franchise Team</p>',
   'You have been invited to the KHANA BANAO franchise team',
   '<p>Hi {{applicant_name}},</p><p>You have been invited to join the KHANA BANAO franchise team. Click below and sign in with this Google account to get started.</p><p><a href="{{application_link}}">Accept your invitation</a></p><p>— KHANA BANAO Franchise Team</p>',
   array['applicant_name','application_link']),

  ('ENQUIRY_RECEIVED', 'Enquiry Received',
   'We received your KHANA BANAO franchise enquiry',
   '<p>Hi {{applicant_name}},</p><p>Thank you for your interest in a KHANA BANAO franchise. Your enquiry reference is <strong>{{lead_number}}</strong>.</p><p>One of our franchise advisors will call you shortly to understand your plans and answer your questions.</p><p>— KHANA BANAO Franchise Team</p>',
   'We received your KHANA BANAO franchise enquiry',
   '<p>Hi {{applicant_name}},</p><p>Thank you for your interest in a KHANA BANAO franchise. Your enquiry reference is <strong>{{lead_number}}</strong>.</p><p>One of our franchise advisors will call you shortly to understand your plans and answer your questions.</p><p>— KHANA BANAO Franchise Team</p>',
   array['applicant_name','lead_number']),

  ('APPLICATION_LINK', 'Application Link',
   'Your KHANA BANAO franchise application form',
   '<p>Hi {{applicant_name}},</p><p>Please complete your franchise application using the secure link below. It is unique to you — do not share it.</p><p><a href="{{application_link}}">Open your application form</a></p><p>Reference: {{lead_number}}</p>',
   'Your KHANA BANAO franchise application form',
   '<p>Hi {{applicant_name}},</p><p>Please complete your franchise application using the secure link below. It is unique to you — do not share it.</p><p><a href="{{application_link}}">Open your application form</a></p><p>Reference: {{lead_number}}</p>',
   array['applicant_name','lead_number','application_link']),

  ('APPLICATION_SUBMITTED', 'Application Submitted',
   'We received your franchise application {{application_number}}',
   '<p>Hi {{applicant_name}},</p><p>Your application <strong>{{application_number}}</strong> has been received and is now under review. We will be in touch with the next step.</p>',
   'We received your franchise application {{application_number}}',
   '<p>Hi {{applicant_name}},</p><p>Your application <strong>{{application_number}}</strong> has been received and is now under review. We will be in touch with the next step.</p>',
   array['applicant_name','application_number']),

  ('DOCUMENT_REQUEST', 'Document Request',
   'Documents needed for your KHANA BANAO application',
   '<p>Hi {{applicant_name}},</p><p>To move your application forward, please upload the following documents:</p><p>{{document_names}}</p><p><a href="{{application_link}}">Upload your documents</a></p>',
   'Documents needed for your KHANA BANAO application',
   '<p>Hi {{applicant_name}},</p><p>To move your application forward, please upload the following documents:</p><p>{{document_names}}</p><p><a href="{{application_link}}">Upload your documents</a></p>',
   array['applicant_name','document_names','application_link']),

  ('DOCUMENT_REUPLOAD_REQUEST', 'Document Re-upload Request',
   'Please re-upload a document for your application',
   '<p>Hi {{applicant_name}},</p><p>We need a clearer copy of: <strong>{{document_names}}</strong>.</p><p>Reason: {{reupload_reason}}</p><p><a href="{{application_link}}">Upload the corrected document</a></p>',
   'Please re-upload a document for your application',
   '<p>Hi {{applicant_name}},</p><p>We need a clearer copy of: <strong>{{document_names}}</strong>.</p><p>Reason: {{reupload_reason}}</p><p><a href="{{application_link}}">Upload the corrected document</a></p>',
   array['applicant_name','document_names','reupload_reason','application_link']),

  ('APPLICATION_APPROVED', 'Application Approved',
   'Congratulations — your KHANA BANAO franchise is approved',
   '<p>Hi {{applicant_name}},</p><p>Your franchise application {{application_number}} has been approved for the territory <strong>{{territory}}</strong>.</p><p>Our team will share the franchise agreement next.</p>',
   'Congratulations — your KHANA BANAO franchise is approved',
   '<p>Hi {{applicant_name}},</p><p>Your franchise application {{application_number}} has been approved for the territory <strong>{{territory}}</strong>.</p><p>Our team will share the franchise agreement next.</p>',
   array['applicant_name','application_number','territory']),

  ('APPLICATION_REJECTED', 'Application Rejected',
   'Update on your KHANA BANAO franchise application',
   '<p>Hi {{applicant_name}},</p><p>Thank you for your interest. After review we are unable to take your application {{application_number}} forward at this time.</p>',
   'Update on your KHANA BANAO franchise application',
   '<p>Hi {{applicant_name}},</p><p>Thank you for your interest. After review we are unable to take your application {{application_number}} forward at this time.</p>',
   array['applicant_name','application_number']),

  ('AGREEMENT_SENT', 'Agreement Sent',
   'Your KHANA BANAO franchise agreement {{agreement_number}}',
   '<p>Hi {{applicant_name}},</p><p>Your franchise agreement <strong>{{agreement_number}}</strong> is attached / shared separately. Please review, sign and return it.</p>',
   'Your KHANA BANAO franchise agreement {{agreement_number}}',
   '<p>Hi {{applicant_name}},</p><p>Your franchise agreement <strong>{{agreement_number}}</strong> is attached / shared separately. Please review, sign and return it.</p>',
   array['applicant_name','agreement_number']),

  ('PAYMENT_APPROVED', 'Payment Approved',
   'Payment received — thank you',
   '<p>Hi {{applicant_name}},</p><p>We have confirmed your payment of <strong>{{payment_amount}}</strong>. Your franchise activation is now in progress.</p>',
   'Payment received — thank you',
   '<p>Hi {{applicant_name}},</p><p>We have confirmed your payment of <strong>{{payment_amount}}</strong>. Your franchise activation is now in progress.</p>',
   array['applicant_name','payment_amount']),

  ('PAYMENT_REJECTED', 'Payment Rejected',
   'We could not verify your payment proof',
   '<p>Hi {{applicant_name}},</p><p>We were unable to verify the payment proof you shared. Reason: {{reupload_reason}}</p><p>Please share a corrected proof.</p>',
   'We could not verify your payment proof',
   '<p>Hi {{applicant_name}},</p><p>We were unable to verify the payment proof you shared. Reason: {{reupload_reason}}</p><p>Please share a corrected proof.</p>',
   array['applicant_name','reupload_reason']),

  ('FRANCHISE_ACTIVATED', 'Franchise Activated',
   'Welcome aboard — your franchise {{franchise_id}} is active',
   '<p>Hi {{applicant_name}},</p><p>Your KHANA BANAO franchise <strong>{{franchise_id}}</strong> is now active for {{territory}}.</p><p>Set your password here: <a href="{{password_setup_link}}">{{password_setup_link}}</a></p><p>Your dashboard: <a href="{{dashboard_url}}">{{dashboard_url}}</a></p><p>Your support contact is {{support_name}} on {{support_phone}}.</p>',
   'Welcome aboard — your franchise {{franchise_id}} is active',
   '<p>Hi {{applicant_name}},</p><p>Your KHANA BANAO franchise <strong>{{franchise_id}}</strong> is now active for {{territory}}.</p><p>Set your password here: <a href="{{password_setup_link}}">{{password_setup_link}}</a></p><p>Your dashboard: <a href="{{dashboard_url}}">{{dashboard_url}}</a></p><p>Your support contact is {{support_name}} on {{support_phone}}.</p>',
   array['applicant_name','franchise_id','territory','password_setup_link','dashboard_url','support_name','support_phone']),

  ('TRAINING_SCHEDULED', 'Training Scheduled',
   'Your KHANA BANAO training is scheduled',
   '<p>Hi {{applicant_name}},</p><p>Your training is scheduled for <strong>{{training_date}}</strong>. Details will follow from {{support_name}}.</p>',
   'Your KHANA BANAO training is scheduled',
   '<p>Hi {{applicant_name}},</p><p>Your training is scheduled for <strong>{{training_date}}</strong>. Details will follow from {{support_name}}.</p>',
   array['applicant_name','training_date','support_name']),

  ('TRAINING_COMPLETED', 'Training Completed',
   'Training complete — next step is your setup',
   '<p>Hi {{applicant_name}},</p><p>You have completed your KHANA BANAO training. We will now move to business setup for {{territory}}.</p>',
   'Training complete — next step is your setup',
   '<p>Hi {{applicant_name}},</p><p>You have completed your KHANA BANAO training. We will now move to business setup for {{territory}}.</p>',
   array['applicant_name','territory']),

  ('GO_LIVE_CONFIRMATION', 'Go Live Confirmation',
   'You are live — congratulations!',
   '<p>Hi {{applicant_name}},</p><p>Your KHANA BANAO franchise <strong>{{franchise_id}}</strong> in {{territory}} is now live. Your support contact is {{support_name}} on {{support_phone}}.</p>',
   'You are live — congratulations!',
   '<p>Hi {{applicant_name}},</p><p>Your KHANA BANAO franchise <strong>{{franchise_id}}</strong> in {{territory}} is now live. Your support contact is {{support_name}} on {{support_phone}}.</p>',
   array['applicant_name','franchise_id','territory','support_name','support_phone'])
on conflict (template_key) do nothing;
