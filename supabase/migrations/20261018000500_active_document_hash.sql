-- Permit re-uploading the same source after its earlier document row has been
-- archived. The archived source and audit history remain under the old row.
alter table public.land_documents
  drop constraint if exists land_documents_master_land_id_sha256_key;

create unique index if not exists idx_land_documents_active_hash
  on public.land_documents(master_land_id, sha256)
  where deleted_at is null;
