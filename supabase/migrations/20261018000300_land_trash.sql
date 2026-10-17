alter table public.master_lands
  add column if not exists is_deleted boolean not null default false,
  add column if not exists deleted_at timestamptz;

create index if not exists idx_master_lands_deleted on public.master_lands(is_deleted, created_at desc);
