# Tax Calculation Specification

## Zweck
Diese Datei beschreibt die fachliche Berechnung der Vorabpauschale
gemäß §18 InvStG. Sie dient als verbindliche Grundlage für den
Berechnungsalgorithmus in lib/calculate-vorabpauschale.ts

## Benötigte Eingaben pro Fondsposition
| Feld | Typ | Quelle |
|---|---|---|
| isin | string | KI-Extraktion |
| fondsname | string | KI-Extraktion |
| fondsart | 'aktien' / 'misch' / 'immobilien' / 'sonstige' | ISIN-API |
| teilfreistellungssatz | number (0–1) | aus Fondsart |
| anzahl_anteile | number | KI-Extraktion |
| kurs_jahresanfang | number | KI-Extraktion (1.1.) |
| kurs_jahresende | number | KI-Extraktion (31.12.) |
| ausschuettungen | number | KI-Extraktion (Summe) |
| basiszins | number | BMF, fest je Jahr |
| waehrung | string | KI-Extraktion |
| ezb_kurs | number | EZB-API (31.12.) |
| kauf_datum | date | KI-Extraktion |
| steuerjahr | number | Nutzer |

### Basiszinssätze (historisch)
- 2026: 3,20%
- 2025: 2,53%
- 2024: 2,29%
- 2023: 2,55%
- 2022: 0,00% (negativ → keine Vorabpauschale)
- 2021: 0,00% (negativ → keine Vorabpauschale)
- 2020: 0,00% (negativ → keine Vorabpauschale)

## Teilfreistellungssätze (§20 InvStG)
- Aktienfonds (≥51% Aktien): 30%
- Mischfonds (≥25% Aktien): 15%
- Immobilienfonds: 60%
- Immobilienfonds Ausland: 80%
- Sonstige Fonds: 0%

## Rechenschritte mit Formeln

### Schritt 1: Jahresanfangswert
jahresanfangswert = anzahl_anteile × kurs_jahresanfang

### Schritt 2: Basisertrag
basisertrag = jahresanfangswert × basiszins × 0,7

### Schritt 3: Wertsteigerung
wertsteigerung = (kurs_jahresende - kurs_jahresanfang) × anzahl_anteile
→ Wenn Wertsteigerung negativ: Vorabpauschale = 0, Berechnung endet hier

### Schritt 4: Vorabpauschale vor Ausschüttungen
vorabpauschale_brutto = MIN(basisertrag, wertsteigerung)

### Schritt 5: Ausschüttungen abziehen
vorabpauschale_netto = vorabpauschale_brutto - ausschuettungen
→ Wenn Ergebnis negativ oder 0: Vorabpauschale = 0, Berechnung endet hier

### Schritt 6: Teilfreistellung
steuerpflichtig = vorabpauschale_netto × (1 - teilfreistellungssatz)

### Schritt 7: Kapitalertragsteuer
kest = steuerpflichtig × 0,25

### Schritt 8: Solidaritätszuschlag
soli = kest × 0,055

### Schritt 9: Kirchensteuer (optional)
kirchensteuer = kest × kirchensteuersatz
(Bayern/Baden-Württemberg: 8%, alle anderen Bundesländer: 9%)

### Schritt 10: Gesamtsteuer
gesamtsteuer = kest + soli + kirchensteuer

## Sonderfälle

### Unterjährige Käufe (§18 Abs. 2 InvStG)
kürzungsmonate = kaufmonat - 1
(Januar = 1, Februar = 2, ... Dezember = 12)
faktor = (12 - kürzungsmonate) / 12
vorabpauschale_gekürzt = vorabpauschale × faktor

Beispiel Kauf im März:
kürzungsmonate = 3 - 1 = 2
faktor = 10/12
→ 10/12 der vollen Vorabpauschale werden berechnet

### Verkäufe (§18 Abs. 2 InvStG)
Im Jahr des Verkaufs wird keine Vorabpauschale erhoben.

### Verkäufe im Jahresverlauf
Bei Verkauf vor dem 31.12. gilt der Verkaufskurs als Jahresendkurs.
Die Anteile nach Verkauf werden separat berechnet.

### Fremdwährungen
Alle Werte in Fremdwährung werden mit dem EZB-Referenzkurs
zum 31.12. des Steuerjahres in EUR umgerechnet:
wert_eur = wert_fremdwaehrung / ezb_kurs

### Vorabpauschale = 0 wenn:
- Wertsteigerung ≤ 0
- Ausschüttungen ≥ Basisertrag
- Basiszins = 0 (war 2020, 2021, 2022 der Fall)

## Rundung
- Alle Zwischenwerte: 6 Nachkommastellen
- Endwerte (Steuerbeträge): 2 Nachkommastellen (kaufmännisch)

## Berechnungsprotokoll
Für jede Fondsposition wird ausgegeben:
- Alle Eingabewerte
- Alle Zwischenergebnisse mit Bezeichnung und Formel
- Endsteuer aufgeteilt in KeSt, Soli, KiSt
- Hinweis ob und warum Vorabpauschale = 0

## Berechnungshierarchie

Die Berechnung erfolgt in drei Ebenen:

### Ebene 1: Fondsposition
Pro Fonds im Depot wird einzeln berechnet:
- Alle Rechenschritte aus den Rechenschritten oben
- Ergebnis: Vorabpauschale und Steuerbetrag pro Fonds

### Ebene 2: Depot
Pro Depot werden alle enthaltenen Fondspositionen summiert:
- summe_vorabpauschale_depot = Summe aller Vorabpauschalen der Fonds
- summe_steuer_depot = Summe aller Steuerbeträge der Fonds
- Jedes Depot hat eine eigene Währung → Umrechnung in EUR vor Summierung

### Ebene 3: Mandant / Steuerjahr
Alle Depots eines Mandanten für ein Steuerjahr werden summiert:
- summe_vorabpauschale_gesamt = Summe aller Depot-Summen
- summe_steuer_gesamt = KeSt gesamt + Soli gesamt + KiSt gesamt
- Freistellungsauftrag wird auf Gesamtebene abgezogen
- Ergebnis ist die Grundlage für den PDF-Export und das Berechnungsprotokoll

## Berechnungsprotokoll (Ansicht "Berechnung")
Das Protokoll zeigt:
1. Pro Fonds: alle Eingabewerte + alle Zwischenschritte
2. Pro Depot: Zwischensumme
3. Gesamtübersicht: alle Depots addiert
4. Steueraufstellung: KeSt + Soli + KiSt einzeln ausgewiesen
5. Hinweis wenn Vorabpauschale = 0 und warum