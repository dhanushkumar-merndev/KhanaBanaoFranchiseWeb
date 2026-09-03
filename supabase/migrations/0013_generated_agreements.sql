-- ===================================================================
-- 0013  Generated franchise agreements
--
-- The agreement stops being a PDF somebody fills in by hand and uploads. It
-- is now produced from the applicant's own answers: src/lib/agreement/clauses
-- holds the 32 clauses and both schedules, and the per-agreement blanks live
-- in `field_values` here.
--
-- `clause_overrides` lets an admin replace one clause's wording for a single
-- negotiated agreement without touching the template every other franchisee
-- receives. It is keyed by the stable clause id, never by clause number.
--
-- The manual upload columns (storage_path, file_name) are deliberately kept:
-- the *signed* copy still comes back as a scan, and agreements created before
-- this migration keep working exactly as they did.
-- ===================================================================

alter table agreements
  add column if not exists field_values     jsonb not null default '{}'::jsonb,
  add column if not exists clause_overrides jsonb not null default '{}'::jsonb,
  add column if not exists document_version text,
  add column if not exists document_sent_at timestamptz;

comment on column agreements.field_values is
  'Fill-in values for the generated document, keyed by src/lib/agreement/fields key.';
comment on column agreements.clause_overrides is
  'Per-agreement clause rewrites, keyed by clause id. Empty means the standard wording.';
comment on column agreements.document_version is
  'AGREEMENT_DOCUMENT_VERSION at the time the document was last sent, so an old agreement never silently acquires new terms.';

-- -------------------------------------------------------------------
-- The agreement email carries the generated PDF as its only contract.
-- -------------------------------------------------------------------

update email_templates
set subject = 'Your KHANA BANAO franchise agreement {{agreement_number}}',
    default_subject = 'Your KHANA BANAO franchise agreement {{agreement_number}}',
    body_html = $body$<h2 style="margin:0 0 16px;font-family:Georgia,'Times New Roman',serif;font-size:21px;line-height:1.3;color:#8e1218;font-weight:700;">Your franchise agreement</h2><p>Hi {{applicant_name}},</p><p>Your personalised agreement <strong>{{agreement_number}}</strong> is attached to this email as a PDF. It has been filled in with the details supplied in your application.</p><p>Please download the attached agreement, read it carefully, sign it, and return the signed copy to us.</p><p>If anything is unclear, call us before you sign &mdash; we would be happy to talk it through.</p>$body$,
    default_body = $body$<h2 style="margin:0 0 16px;font-family:Georgia,'Times New Roman',serif;font-size:21px;line-height:1.3;color:#8e1218;font-weight:700;">Your franchise agreement</h2><p>Hi {{applicant_name}},</p><p>Your personalised agreement <strong>{{agreement_number}}</strong> is attached to this email as a PDF. It has been filled in with the details supplied in your application.</p><p>Please download the attached agreement, read it carefully, sign it, and return the signed copy to us.</p><p>If anything is unclear, call us before you sign &mdash; we would be happy to talk it through.</p>$body$,
    variables = array['applicant_name','agreement_number','lead_number'],
    updated_by = null
where template_key = 'AGREEMENT_SENT';
