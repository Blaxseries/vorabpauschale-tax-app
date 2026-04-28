# Security Requirements

## Grundregeln
- Keine echten Mandantendaten in der Entwicklungsumgebung
- API Keys dürfen nie im Frontend sichtbar sein
- Jede mandantenbezogene Tabelle braucht Row Level Security
- Nutzer dürfen nur Daten ihrer eigenen Organisation sehen
- Änderungen an Berechnungen müssen protokolliert werden
- Berechnungsergebnisse dürfen nicht unkontrolliert überschrieben werden

## Rollen
- Owner
- Admin
- Bearbeiter
- Viewer

## Vor Produktivbetrieb erforderlich
- RLS prüfen
- Backup-Konzept prüfen
- Audit-Log einbauen
- Fehlerlogs ohne personenbezogene Daten
- Security Review durch externen Entwickler