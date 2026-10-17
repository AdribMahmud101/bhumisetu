-- Retain source extraction, then audit officer edits in the same confirmation transaction.
create function public.confirm_document_intake_review(p_id uuid,p_actor uuid,p_land jsonb,p_reason text,p_fields jsonb default null)
returns jsonb language plpgsql security definer set search_path=public as $$
declare prior_status text; result jsonb;
begin
 select status into prior_status from public.document_intakes where id=p_id and created_by=p_actor for update;
 result=public.confirm_document_intake(p_id,p_actor,p_land,p_reason);
 if prior_status<>'ATTACHED' and p_fields is not null then
  perform public.review_document((result->>'document_id')::uuid,p_actor,p_reason,p_fields,'PENDING');
 end if;
 return result;
end $$;
revoke all on function public.confirm_document_intake_review(uuid,uuid,jsonb,text,jsonb) from public,anon,authenticated;
grant execute on function public.confirm_document_intake_review(uuid,uuid,jsonb,text,jsonb) to service_role;
