-- Private intake drafts let officers upload before parcel metadata is known.
create table public.document_intakes (
 id uuid primary key default gen_random_uuid(), created_by uuid not null references auth.users(id),
 category text not null check(category in ('KHATIAN','PORCHA','DEED','MUTATION')), sub_type text not null,
 file_path text not null, file_name text not null, mime_type text not null, sha256 text not null,
 status text not null default 'UPLOADED' check(status in ('UPLOADED','EXTRACTING','READY','FAILED','ATTACHED')),
 extracted_fields jsonb not null default '{}', parcel_fields jsonb not null default '{}', extraction_metadata jsonb not null default '{}', extraction_error text,
 master_land_id uuid references public.master_lands(id), document_id uuid references public.land_documents(id),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
alter table public.document_intakes enable row level security;
revoke all on public.document_intakes from anon,authenticated;
grant select,insert,update on public.document_intakes to service_role;
create index on public.document_intakes(created_by,created_at desc);
create function public.confirm_document_intake(p_id uuid,p_actor uuid,p_land jsonb,p_reason text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare intake public.document_intakes%rowtype; land_id uuid; doc_id uuid; land_code text; key text; previous text; current text;
begin
 if not exists(select 1 from auth.users where id=p_actor and raw_app_meta_data->>'role'='officer') then raise exception 'Officer required';end if;
 select * into intake from public.document_intakes where id=p_id and created_by=p_actor for update;
 if not found then raise exception 'Intake draft not found';end if;
 if intake.status='ATTACHED' then
  select unique_land_id into land_code from public.master_lands where id=intake.master_land_id;
  return jsonb_build_object('unique_land_id',land_code,'document_id',intake.document_id);
 end if;
 if intake.status='EXTRACTING' then raise exception 'Document extraction is still running';end if;
 if length(trim(p_reason))<3 then raise exception 'Confirmation reason required';end if;
 if coalesce(trim(p_land->>'district'),'')='' or coalesce(trim(p_land->>'upazila'),'')='' or coalesce(trim(p_land->>'mouza'),'')='' or coalesce(trim(p_land->>'dag_number'),'')='' then raise exception 'Confirm the required parcel details';end if;
 land_id=gen_random_uuid();doc_id=gen_random_uuid();land_code='LND-'||upper(substr(replace(land_id::text,'-',''),1,12));
 insert into public.master_lands(id,unique_land_id,district,upazila,mouza,jl_number,dag_number,current_khatian_no,total_area_decimals)
 values(land_id,land_code,p_land->>'district',p_land->>'upazila',p_land->>'mouza',coalesce(p_land->>'jl_number',''),p_land->>'dag_number',coalesce(p_land->>'current_khatian_no',''),(p_land->>'total_area_decimals')::numeric);
 insert into public.land_documents(id,master_land_id,doc_code,category,sub_type,file_path,file_name,mime_type,sha256,extraction_status,extraction_error,extracted_json)
 values(doc_id,land_id,'DOC-'||upper(substr(replace(doc_id::text,'-',''),1,12)),intake.category,intake.sub_type,intake.file_path,intake.file_name,intake.mime_type,intake.sha256,
 case when intake.status='READY' then 'READY' else 'FAILED' end,intake.extraction_error,intake.extraction_metadata||jsonb_build_object('intake_id',intake.id,'original_extracted_fields',intake.extracted_fields,'original_parcel_fields',intake.parcel_fields));
 -- Applying initial extracted values uses the same transactional audit mechanism as later corrections.
 perform public.review_document(doc_id,p_actor,'Initial AI extraction from uploaded source; officer review pending',intake.extracted_fields,'PENDING');
 for key in select unnest(array['district','upazila','mouza','jl_number','dag_number','current_khatian_no','total_area_decimals']) loop
  previous=intake.parcel_fields->>key;current=p_land->>key;
  if previous is distinct from current then
   insert into public.audit_logs(document_id,admin_id,field_name,previous_value,new_value,reason)
   values(doc_id,p_actor,'parcel.'||key,previous,current,p_reason);
  end if;
 end loop;
 update public.document_intakes set status='ATTACHED',master_land_id=land_id,document_id=doc_id,updated_at=now() where id=p_id;
 return jsonb_build_object('unique_land_id',land_code,'document_id',doc_id);
end $$;
revoke all on function public.confirm_document_intake(uuid,uuid,jsonb,text) from public,anon,authenticated;
grant execute on function public.confirm_document_intake(uuid,uuid,jsonb,text) to service_role;
