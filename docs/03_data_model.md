# Data Model

## Grundstruktur
Die App arbeitet mit Mandanten, Steuerjahren, Depots, Fondspositionen und Berechnungsläufen.

## Tabellen / Entities

### clients
- id
- name
- organization_id
- created_at

### tax_years
- id
- client_id
- year
- status

### depots
- id
- client_id
- tax_year_id
- broker_name
- broker_country

### positions
- id
- depot_id
- isin
- fund_name
- quantity
- start_price
- end_price
- currency

### distributions
- id
- position_id
- amount
- payment_date
- currency

### calculation_runs
- id
- client_id
- tax_year_id
- created_at
- created_by
- status