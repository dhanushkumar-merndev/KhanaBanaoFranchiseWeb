-- Existing environments may already have run 0013 with the former public
-- agreement link. Replace that email with the single personalised attachment
-- flow. The application_link variable and red button are intentionally gone.

update email_templates
set subject = 'Your KHANA BANAO franchise agreement {{agreement_number}}',
    default_subject = 'Your KHANA BANAO franchise agreement {{agreement_number}}',
    body_html = $body$<h2 style="margin:0 0 16px;font-family:Georgia,'Times New Roman',serif;font-size:21px;line-height:1.3;color:#8e1218;font-weight:700;">Your franchise agreement</h2><p>Hi {{applicant_name}},</p><p>Your personalised agreement <strong>{{agreement_number}}</strong> is attached to this email as a PDF. It has been filled in with the details supplied in your application.</p><p>Please download the attached agreement, read it carefully, sign it, and return the signed copy to us.</p><p>If anything is unclear, call us before you sign &mdash; we would be happy to talk it through.</p>$body$,
    default_body = $body$<h2 style="margin:0 0 16px;font-family:Georgia,'Times New Roman',serif;font-size:21px;line-height:1.3;color:#8e1218;font-weight:700;">Your franchise agreement</h2><p>Hi {{applicant_name}},</p><p>Your personalised agreement <strong>{{agreement_number}}</strong> is attached to this email as a PDF. It has been filled in with the details supplied in your application.</p><p>Please download the attached agreement, read it carefully, sign it, and return the signed copy to us.</p><p>If anything is unclear, call us before you sign &mdash; we would be happy to talk it through.</p>$body$,
    variables = array['applicant_name','agreement_number','lead_number'],
    updated_by = null
where template_key = 'AGREEMENT_SENT';
