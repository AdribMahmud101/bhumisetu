create table if not exists public.master_lands (
 id uuid primary key default gen_random_uuid(), unique_land_id text unique not null,
 district text not null, upazila text not null, mouza text not null, jl_number text not null default '',
 dag_number text not null, current_khatian_no text not null default '', total_area_decimals numeric(12,2) not null check(total_area_decimals > 0),
 is_finalized boolean not null default false, created_at timestamptz not null default now()
);
create table if not exists public.land_documents (
 id uuid primary key default gen_random_uuid(), master_land_id uuid not null references public.master_lands(id), doc_code text unique not null,
 category text not null check(category in ('KHATIAN','PORCHA','DEED','MUTATION')), sub_type text not null,
 official_number text, document_date date, execution_date date, seller_or_prior_owner text, buyer_or_current_owner text,
 dag_number text, area_decimals numeric(12,2) check(area_decimals > 0), khatian_ref text, share_identity text, based_on_deed text,
 verification_status text not null default 'PENDING' check(verification_status in ('PENDING','VERIFIED','NEEDS_CORRECTION')),
 extraction_status text not null default 'UPLOADED', extraction_error text, extracted_json jsonb not null default '{}',
 file_path text not null, sha256 text not null, file_name text not null, mime_type text not null default 'application/pdf',
 created_at timestamptz not null default now(), unique(master_land_id,sha256)
);
create table if not exists public.audit_logs (
 id uuid primary key default gen_random_uuid(), document_id uuid not null references public.land_documents(id),
 admin_id uuid not null, field_name text not null, previous_value text, new_value text, reason text not null,
 created_at timestamptz not null default now()
);
create table if not exists public.mutation_cases (
 id uuid primary key default gen_random_uuid(), case_number text unique not null,
 master_land_id uuid not null references public.master_lands(id), source_deed_id uuid not null unique references public.land_documents(id),
 status text not null default 'AUTO_INITIATED' check(status in ('AUTO_INITIATED','HEARING_REQUIRED','READY_FOR_REVIEW','APPROVED','REJECTED')),
 decision_reason text, decided_by uuid, created_at timestamptz not null default now()
);
alter table public.master_lands enable row level security;
alter table public.land_documents enable row level security;
alter table public.audit_logs enable row level security;
alter table public.mutation_cases enable row level security;
-- All data passes through server projections. No direct anonymous/authenticated table access.
revoke all on public.master_lands,public.land_documents,public.audit_logs,public.mutation_cases from anon,authenticated;
grant all on public.master_lands,public.land_documents,public.mutation_cases to service_role;
grant select,insert on public.audit_logs to service_role;
revoke update,delete,truncate on public.audit_logs from service_role;
create or replace function public.audit_document_change() returns trigger language plpgsql set search_path = public as $$
declare k text; actor text := current_setting('app.actor',true); why text := current_setting('app.reason',true);
begin
 for k in select unnest(array['official_number','document_date','execution_date','seller_or_prior_owner','buyer_or_current_owner','dag_number','area_decimals','khatian_ref','share_identity','based_on_deed','verification_status']) loop
  if (to_jsonb(old)->k) is distinct from (to_jsonb(new)->k) then
   if coalesce(actor,'') = '' or coalesce(why,'') = '' then raise exception 'Audited changes require actor and reason'; end if;
   insert into public.audit_logs(document_id,admin_id,field_name,previous_value,new_value,reason)
   values(old.id,actor::uuid,k,to_jsonb(old)->>k,to_jsonb(new)->>k,why);
  end if;
 end loop;
 if new.verification_status='VERIFIED' and new.category='DEED' and new.sub_type='SAF_KABALA' then
  insert into public.mutation_cases(case_number,master_land_id,source_deed_id)
  values('MUT-'||upper(substr(replace(new.id::text,'-',''),1,10)),new.master_land_id,new.id)
  on conflict(source_deed_id) do nothing;
 end if;
 return new;
end $$;
create trigger document_audit before update on public.land_documents for each row execute function public.audit_document_change();
create or replace function public.review_document(p_id uuid,p_actor uuid,p_reason text,p_fields jsonb,p_status text)
returns void language plpgsql security definer set search_path=public as $$
begin
 if not exists(select 1 from auth.users where id=p_actor and raw_app_meta_data->>'role'='officer') then raise exception 'Officer required'; end if;
 if length(trim(p_reason))<3 then raise exception 'Correction reason required'; end if;
 perform set_config('app.actor',p_actor::text,true); perform set_config('app.reason',p_reason,true);
 update public.land_documents set
 official_number=p_fields->>'official_number',document_date=nullif(p_fields->>'document_date','')::date,
 execution_date=nullif(p_fields->>'execution_date','')::date,seller_or_prior_owner=p_fields->>'seller_or_prior_owner',
 buyer_or_current_owner=p_fields->>'buyer_or_current_owner',dag_number=p_fields->>'dag_number',
 area_decimals=nullif(p_fields->>'area_decimals','')::numeric,khatian_ref=p_fields->>'khatian_ref',
 share_identity=p_fields->>'share_identity',based_on_deed=p_fields->>'based_on_deed',verification_status=p_status
 where id=p_id;
 if not found then raise exception 'Document not found'; end if;
end $$;
revoke all on function public.review_document(uuid,uuid,text,jsonb,text) from public,anon,authenticated;
grant execute on function public.review_document(uuid,uuid,text,jsonb,text) to service_role;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('land-documents','land-documents',false,5242880,array['application/pdf','image/png','image/jpeg']) on conflict(id) do nothing;
create index on public.land_documents(master_land_id);
create index on public.audit_logs(document_id);
create index on public.mutation_cases(master_land_id);
