-- Keep every document-like upload within the application's shared 5 MB cap.
-- Existing objects are unaffected; Supabase applies this limit to new uploads.
update storage.buckets
set file_size_limit = 5242880
where id in (
  'franchise-documents',
  'payment-proofs',
  'franchise-agreements',
  'training-documents',
  'approval-letters'
);
