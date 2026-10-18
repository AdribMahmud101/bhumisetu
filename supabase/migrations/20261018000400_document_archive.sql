-- Removing a document from the active record must keep its source and audit
-- trail. The previous API deleted Storage before discovering that audit rows
-- cannot be deleted by the application role.
alter table public.land_documents
  add column if not exists deleted_at timestamptz;

create index if not exists idx_land_documents_active
  on public.land_documents(master_land_id, document_date)
  where deleted_at is null;

create or replace function public.archive_land_document(p_id uuid, p_actor uuid)
returns jsonb language plpgsql security definer set search_path=public as $$
declare
  doc record;
begin
  if not exists (
    select 1 from auth.users
    where id = p_actor and raw_app_meta_data->>'role' = 'officer'
  ) then
    raise exception 'Officer required';
  end if;

  select id, master_land_id, deleted_at into doc
  from public.land_documents where id = p_id for update;
  if not found then raise exception 'Document not found'; end if;
  if doc.deleted_at is not null then
    return jsonb_build_object('ok', true, 'deleted', p_id);
  end if;

  -- Keep the original and all existing audit rows. Remove this document from
  -- active analysis and force a fresh publication decision on the parcel.
  update public.land_documents set deleted_at = now() where id = p_id;
  delete from public.mutation_cases where source_deed_id = p_id;
  update public.master_lands set is_finalized = false where id = doc.master_land_id;
  insert into public.audit_logs
    (document_id, admin_id, field_name, previous_value, new_value, reason)
  values
    (p_id, p_actor, 'document_removed', 'active', 'removed',
     'Officer removed document from the active land record');

  return jsonb_build_object('ok', true, 'deleted', p_id);
end $$;

revoke all on function public.archive_land_document(uuid,uuid)
  from public, anon, authenticated;
grant execute on function public.archive_land_document(uuid,uuid)
  to service_role;
