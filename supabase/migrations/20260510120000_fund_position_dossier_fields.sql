-- Zusatzfelder für Fondsakte (Rohdaten, Quellen, EZB getrennt nach Stichtag)
alter table if exists public.fund_positions
  add column if not exists advisor_note text,
  add column if not exists ezb_kurs_jahresanfang double precision,
  add column if not exists ezb_kurs_jahresende double precision,
  add column if not exists nav_data_source text,
  add column if not exists ezb_data_source text,
  add column if not exists ezb_kurs double precision;

comment on column public.fund_positions.advisor_note is 'Freitext für den Steuerberater';
comment on column public.fund_positions.nav_data_source is 'bankstatement | manual | api';
comment on column public.fund_positions.ezb_data_source is 'bankstatement | manual | api';
