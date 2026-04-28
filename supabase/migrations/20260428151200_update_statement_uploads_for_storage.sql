alter table if exists public.statement_uploads
  add column if not exists display_name text,
  add column if not exists original_filename text,
  add column if not exists document_type text default 'unknown',
  add column if not exists storage_bucket text default 'raw-documents',
  add column if not exists storage_path text,
  add column if not exists anonymized_bucket text,
  add column if not exists anonymized_storage_path text,
  add column if not exists mime_type text,
  add column if not exists file_size_bytes bigint,
  add column if not exists upload_status text default 'uploaded',
  add column if not exists anonymization_status text default 'not_started',
  add column if not exists extraction_status text default 'not_started',
  add column if not exists uploaded_by uuid,
  add column if not exists uploaded_at timestamptz default now(),
  add column if not exists error_message text;

create unique index if not exists statement_uploads_storage_path_unique_idx
  on public.statement_uploads (storage_path)
  where storage_path is not null;

do $$
declare
  portfolios_id_is_uuid boolean;
begin
  select exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'portfolios'
      and column_name = 'id'
      and data_type = 'uuid'
  )
  into portfolios_id_is_uuid;

  if portfolios_id_is_uuid then
    if not exists (
      select 1
      from pg_constraint
      where conname = 'statement_uploads_portfolio_id_fkey'
    ) then
      alter table public.statement_uploads
        add constraint statement_uploads_portfolio_id_fkey
        foreign key (portfolio_id)
        references public.portfolios(id)
        on delete cascade;
    end if;
  end if;
end $$;
