-- Email OTP challenge state for public document-upload links.
-- The link token remains the first factor; the short-lived OTP proves access
-- to the email address recorded against the lead.

alter table application_tokens
  add column document_otp_hash text,
  add column document_otp_expires_at timestamptz,
  add column document_otp_attempts smallint not null default 0,
  add column document_otp_sent_at timestamptz,
  add column document_otp_send_count smallint not null default 0,
  add column document_otp_window_started_at timestamptz,
  add column document_otp_verified_at timestamptz;

alter table application_tokens
  add constraint application_tokens_document_otp_attempts_check
    check (document_otp_attempts between 0 and 5),
  add constraint application_tokens_document_otp_send_count_check
    check (document_otp_send_count between 0 and 5);

