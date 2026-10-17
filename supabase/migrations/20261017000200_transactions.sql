alter table public.master_lands add column revision integer not null default 0;
create function public.bump_land_revision() returns trigger language plpgsql security definer set search_path=public as $$
begin update public.master_lands set revision=revision+1 where id=new.master_land_id; return new; end $$;
create trigger land_revision after insert or update on public.land_documents for each row execute function public.bump_land_revision();
create function public.extract_document(p_id uuid,p_actor uuid,p_fields jsonb,p_metadata jsonb) returns void language plpgsql security definer set search_path=public as $$
begin
 if not exists(select 1 from auth.users where id=p_actor and raw_app_meta_data->>'role'='officer') then raise exception 'Officer required';end if;
 if not exists(select 1 from public.land_documents where id=p_id and verification_status<>'VERIFIED') then raise exception 'Document is already reviewed or missing';end if;
 perform public.review_document(p_id,p_actor,'AI extraction; source review required',p_fields,'PENDING');
 update public.land_documents set extraction_status='READY',extraction_error=null,extracted_json=p_metadata where id=p_id;
end $$;
revoke all on function public.extract_document(uuid,uuid,jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.extract_document(uuid,uuid,jsonb,jsonb) to service_role;
create function public.decide_mutation(p_id uuid,p_actor uuid,p_status text,p_reason text,p_revision integer) returns void language plpgsql security definer set search_path=public as $$
declare lid uuid; rev integer; deedstatus text;
begin
 if not exists(select 1 from auth.users where id=p_actor and raw_app_meta_data->>'role'='officer') then raise exception 'Officer required';end if;
 select master_land_id into lid from public.mutation_cases where id=p_id;
 select revision into rev from public.master_lands where id=lid for update;
 if rev is distinct from p_revision then raise exception 'Records changed; refresh and review again';end if;
 select d.verification_status into deedstatus from public.land_documents d join public.mutation_cases m on m.source_deed_id=d.id where m.id=p_id;
 if p_status='APPROVED' and deedstatus<>'VERIFIED' then raise exception 'Source deed must be verified';end if;
 if p_status not in ('APPROVED','REJECTED','HEARING_REQUIRED') or length(trim(p_reason))<3 then raise exception 'Invalid decision';end if;
 update public.mutation_cases set status=p_status,decision_reason=p_reason,decided_by=p_actor where id=p_id;
end $$;
revoke all on function public.decide_mutation(uuid,uuid,text,text,integer) from public,anon,authenticated;
grant execute on function public.decide_mutation(uuid,uuid,text,text,integer) to service_role;
