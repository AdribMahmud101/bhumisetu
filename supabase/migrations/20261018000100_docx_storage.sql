-- DOCX originals remain in the existing private, size-restricted bucket.
update storage.buckets set allowed_mime_types=array['application/pdf','image/png','image/jpeg','application/vnd.openxmlformats-officedocument.wordprocessingml.document'] where id='land-documents';
