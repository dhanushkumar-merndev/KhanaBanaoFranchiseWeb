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
-- Customer-facing link to the generated agreement
--
-- Reuses application_tokens rather than inventing a second token table, so
-- expiry, revocation and the signature check are the code that already runs
-- for application and document links.
-- -------------------------------------------------------------------

alter table application_tokens
  add column if not exists agreement_id uuid references agreements(id) on delete cascade;

create index if not exists application_tokens_agreement_idx
  on application_tokens(agreement_id) where agreement_id is not null;

-- -------------------------------------------------------------------
-- The agreement email now carries a link to the generated document.
-- -------------------------------------------------------------------

update email_templates
set subject = 'Your KHANA BANAO franchise agreement {{agreement_number}}',
    default_subject = 'Your KHANA BANAO franchise agreement {{agreement_number}}',
    body_html = $body$<h2 style="margin:0 0 16px;font-family:Georgia,'Times New Roman',serif;font-size:21px;line-height:1.3;color:#8e1218;font-weight:700;">Your franchise agreement</h2><p>Hi {{applicant_name}},</p><p>Agreement <strong>{{agreement_number}}</strong> has been prepared for you and is ready to read. It has been filled in with the details you gave us in your application.</p><p style="margin:26px 0;"><a href="{{application_link}}" style="display:inline-block;background:#c1272d;color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;line-height:1;padding:14px 30px;border-radius:8px;">Open your agreement</a></p><p>Please read it carefully. You can print it or save it as a PDF from that page. Once you are satisfied, sign it and return the signed copy to us.</p><p>If anything in it is unclear, call us before you sign &mdash; we would much rather talk it through first.</p><p style="margin:24px 0 0;font-size:13px;color:#696158;">The link is unique to you, so please do not forward it.</p>$body$,
    default_body = $body$<h2 style="margin:0 0 16px;font-family:Georgia,'Times New Roman',serif;font-size:21px;line-height:1.3;color:#8e1218;font-weight:700;">Your franchise agreement</h2><p>Hi {{applicant_name}},</p><p>Agreement <strong>{{agreement_number}}</strong> has been prepared for you and is ready to read. It has been filled in with the details you gave us in your application.</p><p style="margin:26px 0;"><a href="{{application_link}}" style="display:inline-block;background:#c1272d;color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;line-height:1;padding:14px 30px;border-radius:8px;">Open your agreement</a></p><p>Please read it carefully. You can print it or save it as a PDF from that page. Once you are satisfied, sign it and return the signed copy to us.</p><p>If anything in it is unclear, call us before you sign &mdash; we would much rather talk it through first.</p><p style="margin:24px 0 0;font-size:13px;color:#696158;">The link is unique to you, so please do not forward it.</p>$body$,
    variables = array['applicant_name','agreement_number','application_link','lead_number'],
    updated_by = null
where template_key = 'AGREEMENT_SENT';
