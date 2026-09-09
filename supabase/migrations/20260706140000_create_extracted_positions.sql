-- TODO(rls-firm-scoping): Nach Einführung der Tabellen profiles/firms müssen diese Policies
-- durch kanzleigebundene Regeln ersetzt werden. Siehe docs/04_security_requirements.md.

-- Extrahierte Fondspositionen aus Dokumenten (KI-Auswertung, Prüfung vor Übernahme)

create table if not exists public.extracted_positions (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.statement_uploads (id) on delete cascade,
  portfolio_id uuid not null references public.portfolios (id) on delete cascade,
  isin text not null,
  fondsname text not null,
  anzahl_anteile numeric not null,
  kurs_jahresanfang numeric not null,
  kurs_jahresende numeric not null,
  ausschuettungen numeric not null default 0,
  waehrung text not null default 'EUR',
  kauf_datum date,
  verkauf_datum date,
  review_status text not null default 'needs_review',
  created_at timestamptz not null default now()
);

create index if not exists extracted_positions_document_id_idx
  on public.extracted_positions (document_id);

create index if not exists extracted_positions_portfolio_id_idx
  on public.extracted_positions (portfolio_id);

comment on table public.extracted_positions is
  'Von der KI ausgelesene Fondspositionen; werden vor Übernahme in fund_positions geprüft.';

alter table public.extracted_positions enable row level security;

create policy extracted_positions_select_authenticated
  on public.extracted_positions
  for select
  to authenticated
  using (auth.uid() is not null);

create policy extracted_positions_insert_authenticated
  on public.extracted_positions
  for insert
  to authenticated
  with check (auth.uid() is not null);

create policy extracted_positions_update_authenticated
  on public.extracted_positions
  for update
  to authenticated
  using (auth.uid() is not null)
  with check (auth.uid() is not null);

create policy extracted_positions_delete_authenticated
  on public.extracted_positions
  for delete
  to authenticated
  using (auth.uid() is not null);
