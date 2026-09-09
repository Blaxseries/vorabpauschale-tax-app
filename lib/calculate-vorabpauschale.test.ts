import assert from "node:assert/strict";
import test from "node:test";

import {
  calculateFondsPosition,
  calculateMandant,
  getBasiszinsMeta,
  getKuerzungsmonate,
  getZuflussdatum,
} from "./calculate-vorabpauschale.ts";

function basePosition(overrides: Partial<Parameters<typeof calculateFondsPosition>[0]> = {}) {
  return {
    depot_id: "dep-1",
    isin: "LU0000000001",
    fondsname: "Testfonds",
    fondsart: "aktien" as const,
    anzahl_anteile: 100,
    kurs_jahresanfang: 100,
    kurs_jahresende: 110,
    ausschuettungen: 0,
    steuerjahr: 2025,
    ...overrides,
  };
}

test("EUR-Aktienfonds ohne Ausschüttung – § 18 Begrenzung und Teilfreistellung", () => {
  const result = calculateFondsPosition(basePosition());

  // Jahresanfangswert = 10_000; Basisertrag = 10_000 × 0,0253 × 0,7 = 177,1
  // Wertsteigerung inkl. Ausschüttungen = 1_000 → begrenzter Basisertrag = 177,1
  // vorabpauschale_vor_kuerzung = 177,1; gekürzt = 177,1; steuerpflichtig = 177,1 × 0,7 = 123,97
  assert.equal(result.ist_nullfall, false);
  assert.equal(result.vorabpauschale, 177.1);
  assert.equal(result.steuerpflichtig, 123.97);
  assert.equal(result.kest, 0);
  assert.equal(result.soli, 0);
  assert.equal(result.gesamtsteuer, 0);
});

test("Nullfall Wertverlust – begrenzter Basisertrag 0", () => {
  const result = calculateFondsPosition(
    basePosition({
      kurs_jahresende: 90,
    }),
  );

  assert.equal(result.ist_nullfall, true);
  assert.equal(result.vorabpauschale, 0);
  assert.equal(result.nullfall_grund, "Vorabpauschale vor Kürzung = 0.");
});

test("Ausschüttungen – Begrenzung und Abzug nach § 18", () => {
  const result = calculateFondsPosition(
    basePosition({
      kurs_jahresende: 120,
      ausschuettungen: 300,
    }),
  );

  // Wertsteigerung inkl. Ausschüttungen = 2000 + 300 = 2300; begrenzter Basisertrag = min(177,1; 2300) = 177,1
  // vorabpauschale_vor_kuerzung = max(177,1 − 300; 0) = 0
  assert.equal(result.ist_nullfall, true);
  assert.equal(result.vorabpauschale, 0);
  assert.equal(result.nullfall_grund, "Vorabpauschale vor Kürzung = 0.");
});

test("Unterjähriger Erwerb – Kürzungsfaktor", () => {
  const result = calculateFondsPosition(
    basePosition({
      kauf_datum: "2025-06-15",
    }),
  );

  assert.equal(result.kuerzungsmonate, 5);
  assert.equal(result.kuerzungsfaktor, 0.583333);
  // Gekürzter Betrag nutzt gerundeten Kürzungsfaktor (6 Nachkommastellen), nicht exakt 7/12.
  assert.ok(Math.abs(result.vorabpauschale_gekuerzt - 177.1 * result.kuerzungsfaktor) < 1e-5);
  assert.equal(result.vorabpauschale, 103.31);
});

test("Kauf im Vorjahr – keine unterjährige Kürzung", () => {
  const ohneKauf = calculateFondsPosition(basePosition());
  const mitVorjahreskauf = calculateFondsPosition(
    basePosition({
      kauf_datum: "2021-08-02",
    }),
  );

  assert.equal(mitVorjahreskauf.kuerzungsmonate, 0);
  assert.equal(mitVorjahreskauf.kuerzungsfaktor, 1);
  assert.equal(mitVorjahreskauf.vorabpauschale, ohneKauf.vorabpauschale);
  assert.equal(mitVorjahreskauf.vorabpauschale_gekuerzt, ohneKauf.vorabpauschale_gekuerzt);
});

test("Kauf im Steuerjahr Juni – kuerzungsmonate 5", () => {
  const result = calculateFondsPosition(
    basePosition({
      kauf_datum: "2025-06-15",
      steuerjahr: 2025,
    }),
  );

  assert.equal(result.kuerzungsmonate, 5);
});

test("Kauf im Januar des Steuerjahrs – kuerzungsmonate 0", () => {
  const result = calculateFondsPosition(
    basePosition({
      kauf_datum: "2025-01-10",
    }),
  );

  assert.equal(result.kuerzungsmonate, 0);
  assert.equal(result.kuerzungsfaktor, 1);
});

test("Kauf nach dem Steuerjahr – Nullfall", () => {
  const result = calculateFondsPosition(
    basePosition({
      kauf_datum: "2026-01-10",
      steuerjahr: 2025,
    }),
  );

  assert.equal(result.ist_nullfall, true);
  assert.equal(result.nullfall_grund, "Erwerb nach dem Steuerjahr: keine Vorabpauschale.");
  assert.equal(result.vorabpauschale, 0);
});

test("getKuerzungsmonate – vier Fälle", () => {
  assert.equal(getKuerzungsmonate("2021-08-02", 2025), 0);
  assert.equal(getKuerzungsmonate("2025-06-15", 2025), 5);
  assert.equal(getKuerzungsmonate("2025-01-10", 2025), 0);
  assert.equal(getKuerzungsmonate("2026-01-10", 2025), 0);
});

test("calculateMandant – KiSt none / 8 / 9 und Soli", () => {
  const depots = [
    {
      depot_id: "d1",
      positionen: [basePosition({ isin: "A", anzahl_anteile: 10, kurs_jahresanfang: 100, kurs_jahresende: 110 })],
    },
  ];

  const pos = depots[0].positionen[0];
  const r0 = calculateFondsPosition(pos);
  const sumSteuer = r0.steuerpflichtig;

  const mNone = calculateMandant(depots, { kirchensteuer: "none", freistellungsauftrag: 0 });
  assert.equal(mNone.kest_gesamt, Number((sumSteuer * 0.25).toFixed(2)));
  assert.equal(mNone.kirchensteuer_gesamt, 0);
  assert.equal(mNone.soli_gesamt, Number((mNone.kest_gesamt * 0.055).toFixed(2)));

  const m8 = calculateMandant(depots, { kirchensteuer: "8", freistellungsauftrag: 0 });
  const k = 0.08;
  assert.equal(m8.kest_gesamt, Number((sumSteuer / (4 + k)).toFixed(2)));
  assert.equal(m8.kirchensteuer_gesamt, Number((m8.kest_gesamt * k).toFixed(2)));

  const m9 = calculateMandant(depots, { kirchensteuer: "9", freistellungsauftrag: 0 });
  const k9 = 0.09;
  assert.equal(m9.kest_gesamt, Number((sumSteuer / (4 + k9)).toFixed(2)));

  const mNoSoli = calculateMandant(depots, { solidaritaetszuschlag: false });
  assert.equal(mNoSoli.soli_gesamt, 0);
});

test("Fremdwährung: Kern erwartet bereits EUR (keine Umrechnung im Kern)", () => {
  const result = calculateFondsPosition(
    basePosition({
      kurs_jahresanfang: 100,
      kurs_jahresende: 110,
      waehrung: "USD",
    }),
  );

  assert.equal(result.vorabpauschale, 177.1);
  assert.equal(result.kest, 0);
});

function assertDate(actual: Date, year: number, month: number, day: number) {
  assert.equal(actual.getFullYear(), year);
  assert.equal(actual.getMonth() + 1, month);
  assert.equal(actual.getDate(), day);
}

test("getZuflussdatum – 2026 → 04.01.2027 (2.1. und 3.1. Wochenende)", () => {
  assertDate(getZuflussdatum(2026), 2027, 1, 4);
});

test("getZuflussdatum – 2024 → 02.01.2025 (Werktag)", () => {
  assertDate(getZuflussdatum(2024), 2025, 1, 2);
});

test("getZuflussdatum – 2021 → 03.01.2022 (2.1. ist Sonntag)", () => {
  assertDate(getZuflussdatum(2021), 2022, 1, 3);
});

test("getBasiszinsMeta – 2026 mit Fundstelle", () => {
  const meta = getBasiszinsMeta(2026);
  assert.equal(meta.satz, 0.032);
  assert.equal(
    meta.fundstelle,
    "BMF-Schreiben v. 13.01.2026, IV C 1 - S 1980/00230/012/001, BStBl 2026 I S. 155",
  );
});

test("getBasiszinsMeta – Jahr ohne Fundstelle → null, kein Fehler", () => {
  const meta = getBasiszinsMeta(2024);
  assert.equal(meta.satz, 0.0229);
  assert.equal(meta.fundstelle, null);
});
