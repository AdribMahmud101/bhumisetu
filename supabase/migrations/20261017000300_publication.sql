create or replace function public.bump_land_revision() returns trigger language plpgsql security definer set search_path=public as $$
begin update public.master_lands set revision=revision+1,is_finalized=false where id=new.master_land_id; return new; end $$;
