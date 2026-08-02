-- OTP delivery is operational security traffic, not lead correspondence.
-- Retain delivery metadata for audit/diagnostics but remove previously stored
-- readable codes. Application queries also exclude these rows from email UIs.
update public.email_logs
set body_preview = null
where template_key = 'DOCUMENT_ACCESS_OTP'
  and body_preview is not null;
