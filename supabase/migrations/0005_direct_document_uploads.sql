-- Direct applicant uploads use short-lived, path-bound Supabase upload tokens.
-- Keep enforcement at the bucket too, in addition to browser/server checks.
update storage.buckets
set file_size_limit = 10485760,
    allowed_mime_types = array[
      'application/pdf',
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/webp'
    ]
where id = 'franchise-documents';

update storage.buckets
set file_size_limit = 10485760,
    allowed_mime_types = array[
      'application/pdf',
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/webp'
    ]
where id = 'payment-proofs';

update storage.buckets
set file_size_limit = 20971520,
    allowed_mime_types = array['application/pdf']
where id = 'franchise-agreements';

-- A stale or concurrently-finalised upload receipt must never create two rows
-- for the same document version.
create unique index if not exists documents_request_version_unique
  on documents(document_request_id, version);
