import assert from "node:assert/strict";
import test from "node:test";

import { calculateFondsPosition } from "@/lib/calculate-vorabpauschale";

test("Normalfall – thesaurierender Aktienfonds, volles Jahr", () => {
  const result = calculateFondsPosition({
    depot_id: "dep-1",
    isin: "LU0000000001",
    fondsname: "Aktien Global Thesaurierend",
    fondsart: "aktien",
    anzahl_anteile: 100,
    kurs_jahresanfang: 100,
    kurs_jahresende: 110,
    ausschuettungen: 0,
    waehrung: "EUR",
    ezb_kurs: 1,
    steuerjahr: 2025,
  });

  // Erwartung (manuell):
  // Jahresanfangswert = 100 * 100 = 10.000,000000
  // Basisertrag = 10.000 * 0,0253 * 0,7 = 177,100000
  // Wertsteigerung = (110 - 100) * 100 = 1.000,000000
  // Vorabpauschale brutto = min(177,1 ; 1.000) = 177,100000
  // Vorabpauschale netto = 177,100000
  // Steuerpflichtig (Aktienfonds 30% TF) = 177,1 * 0,7 = 123,970000
  // KeSt = 30,99 ; Soli = 1,70 ; Gesamtsteuer = 32,69
  assert.equal(result.ist_nullfall, false);
  assert.equal(result.vorabpauschale, 177.1);
  assert.equal(result.steuerpflichtig, 123.97);
  assert.equal(result.kest, 30.99);
  assert.equal(result.soli, 1.7);
  assert.equal(result.gesamtsteuer, 32.69);
});

test("Nullfall Wertverlust – Vorabpauschale muss 0 sein", () => {
  const result = calculateFondsPosition({
    depot_id: "dep-2",
    isin: "LU0000000002",
    fondsname: "Aktien Global Verlust",
    fondsart: "aktien",
    anzahl_anteile: 100,
    kurs_jahresanfang: 100,
    kurs_jahresende: 90,
    ausschuettungen: 0,
    waehrung: "EUR",
    ezb_kurs: 1,
    steuerjahr: 2025,
  });

  // Erwartung (manuell):
  // Wertsteigerung = (90 - 100) * 100 = -1.000,000000 <= 0
  // => Nullfall, Vorabpauschale = 0
  assert.equal(result.ist_nullfall, true);
  assert.equal(result.vorabpauschale, 0);
  assert.equal(result.kest, 0);
  assert.equal(result.nullfall_grund, "Wertsteigerung <= 0.");
});

test("Nullfall Ausschüttung – Ausschüttung >= Basisertrag", () => {
  const result = calculateFondsPosition({
    depot_id: "dep-3",
    isin: "LU0000000003",
    fondsname: "Ausschüttender Fonds",
    fondsart: "aktien",
    anzahl_anteile: 100,
    kurs_jahresanfang: 100,
    kurs_jahresende: 120,
    ausschuettungen: 300,
    waehrung: "EUR",
    ezb_kurs: 1,
    steuerjahr: 2025,
  });

  // Erwartung (manuell):
  // Basisertrag = 177,100000
  // Ausschüttungen = 300,000000 >= 177,100000
  // => Nullfall, Vorabpauschale = 0
  assert.equal(result.ist_nullfall, true);
  assert.equal(result.vorabpauschale, 0);
  assert.equal(result.kest, 0);
  assert.equal(result.nullfall_grund, "Ausschüttungen >= Basisertrag.");
});

test("Unterjähriger Kauf – Kauf im Juni, Kürzung 5/12", () => {
  const result = calculateFondsPosition({
    depot_id: "dep-4",
    isin: "LU0000000004",
    fondsname: "Aktienfonds Kauf im Juni",
    fondsart: "aktien",
    anzahl_anteile: 100,
    kurs_jahresanfang: 100,
    kurs_jahresende: 110,
    ausschuettungen: 0,
    waehrung: "EUR",
    ezb_kurs: 1,
    kauf_datum: "2025-06-15",
    steuerjahr: 2025,
  });

  // Erwartung (manuell):
  // volle Vorabpauschale netto = 177,100000
  // Kaufmonat Juni => Kürzungsmonate = 6 - 1 = 5
  // Faktor = (12 - 5)/12 = 7/12 = 0,583333
  // Vorabpauschale gekürzt = 177,1 * 0,583333 = 103,308274
  // Vorabpauschale (Endwert 2 Nachkommastellen) = 103,31
  assert.equal(result.ist_nullfall, false);
  assert.equal(result.kuerzungsmonate, 5);
  assert.equal(result.kuerzungsfaktor, 0.583333);
  assert.equal(result.vorabpauschale_gekuerzt, 103.308274);
  assert.equal(result.vorabpauschale, 103.31);
});

test("Fremdwährung USD – korrekte Umrechnung über EZB-Kurs", () => {
  const result = calculateFondsPosition({
    depot_id: "dep-5",
    isin: "US0000000005",
    fondsname: "US Equity Fund",
    fondsart: "aktien",
    anzahl_anteile: 100,
    kurs_jahresanfang: 120,
    kurs_jahresende: 132,
    ausschuettungen: 0,
    waehrung: "USD",
    ezb_kurs: 1.2,
    steuerjahr: 2025,
  });

  // Erwartung (manuell):
  // Kurs 01.01 EUR = 120 / 1,2 = 100
  // Kurs 31.12 EUR = 132 / 1,2 = 110
  // Danach identisch zum Normalfall:
  // Vorabpauschale = 177,10 ; KeSt = 30,99 ; Soli = 1,70
  assert.equal(result.waehrung_ist_eur, false);
  assert.equal(result.jahresanfangswert, 10000);
  assert.equal(result.wertsteigerung, 1000);
  assert.equal(result.vorabpauschale, 177.1);
  assert.equal(result.kest, 30.99);
  assert.equal(result.soli, 1.7);
});
