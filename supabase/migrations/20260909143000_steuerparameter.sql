-- Steuerparameter: Stammdaten am Mandanten, angewandte Werte historisiert am Steuerjahr.
-- Die tax_years-Werte sind die tatsächlich angewandten Parameter und dürfen sich nicht
-- rückwirkend ändern, wenn sich die Stammdaten des Mandanten später ändern.

alter table if exists public.clients
  add column if not exists church_tax_liable boolean not null default false,
  add column if not exists federal_state text;

comment on column public.clients.church_tax_liable is
  'Vorbelegung: Kirchensteuerpflichtig (änderbar in der Mandantenakte)';
comment on column public.clients.federal_state is
  'Vorbelegung: Bundesland (ISO-artig, z. B. HE, BY) für Kirchensteuersatz';

alter table if exists public.tax_years
  add column if not exists freistellungsauftrag numeric(12, 2) not null default 0,
  add column if not exists church_tax_rate numeric(4, 3),
  add column if not exists solidaritaetszuschlag boolean not null default true;

comment on column public.tax_years.freistellungsauftrag is
  'Tatsächlich angewandter Freistellungsauftrag für dieses Steuerjahr (historisiert)';
comment on column public.tax_years.church_tax_rate is
  'Tatsächlich angewandter Kirchensteuersatz (0.08 | 0.09 | null), historisiert';
comment on column public.tax_years.solidaritaetszuschlag is
  'Tatsächlich angewandter Solidaritätszuschlag (historisiert)';

-- RLS: bestehende Policies auf clients / tax_years unverändert belassen (nichts lockern).
