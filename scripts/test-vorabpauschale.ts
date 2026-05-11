/**
 * Kleine Kontrollfälle für Vorabpauschale (manuell per `node --experimental-strip-types`).
 * Siehe package.json → script "test:vorab".
 */

import { calculateFondsPosition, calculateMandant } from "../lib/calculate-vorabpauschale.ts";

function ok(name: string, pass: boolean, detail?: string) {
  if (pass) console.log(`OK  ${name}`);
  else console.log(`FAIL ${name}`, detail ?? "");
  if (!pass) process.exitCode = 1;
}

// 1) EUR-Aktienfonds ohne Ausschüttung
{
  const r = calculateFondsPosition({
    depot_id: "d",
    isin: "EUR1",
    fondsname: "EUR Aktien",
    fondsart: "aktien",
    anzahl_anteile: 100,
    kurs_jahresanfang: 100,
    kurs_jahresende: 110,
    ausschuettungen: 0,
    steuerjahr: 2025,
  });
  ok("EUR Aktien ohne Ausschüttung", r.vorabpauschale === 177.1 && r.steuerpflichtig === 123.97);
}

// 2) Ausschüttungen mit §-18-Abzug → Nullfall
{
  const r = calculateFondsPosition({
    depot_id: "d",
    isin: "EUR2",
    fondsname: "Ausschüttend",
    fondsart: "aktien",
    anzahl_anteile: 100,
    kurs_jahresanfang: 100,
    kurs_jahresende: 120,
    ausschuettungen: 300,
    steuerjahr: 2025,
  });
  ok("Ausschüttung führt zu 0", r.ist_nullfall && r.vorabpauschale === 0);
}

// 3) FX außerhalb: gleiche EUR-Kurse wie EUR-Fall → gleiches Ergebnis
{
  const r = calculateFondsPosition({
    depot_id: "d",
    isin: "FCY",
    fondsname: "Bereits EUR",
    fondsart: "aktien",
    anzahl_anteile: 100,
    kurs_jahresanfang: 100,
    kurs_jahresende: 110,
    ausschuettungen: 0,
    waehrung: "USD",
    steuerjahr: 2025,
  });
  ok("FCY-Label, EUR-Kern", r.vorabpauschale === 177.1);
}

// 4) KiSt none vs 8 vs 9 (Mandant)
{
  const pos = {
    depot_id: "d",
    isin: "M1",
    fondsname: "M",
    fondsart: "aktien" as const,
    anzahl_anteile: 1000,
    kurs_jahresanfang: 10,
    kurs_jahresende: 11,
    ausschuettungen: 0,
    steuerjahr: 2025,
  };
  const sp = calculateFondsPosition(pos).steuerpflichtig;
  const n = calculateMandant([{ depot_id: "d", positionen: [pos] }], { kirchensteuer: "none" });
  const e8 = calculateMandant([{ depot_id: "d", positionen: [pos] }], { kirchensteuer: "8" });
  ok("KiSt none KeSt = 25 %", Math.abs(n.kest_gesamt - sp * 0.25) < 0.02);
  const k = 0.08;
  ok("KiSt 8 KeSt = sp / (4+k)", Math.abs(e8.kest_gesamt - sp / (4 + k)) < 0.02);
}

// 5) Unterjähriger Erwerb
{
  const r = calculateFondsPosition({
    depot_id: "d",
    isin: "U1",
    fondsname: "Unterjährig",
    fondsart: "aktien",
    anzahl_anteile: 100,
    kurs_jahresanfang: 100,
    kurs_jahresende: 110,
    ausschuettungen: 0,
    kauf_datum: "2025-06-15",
    steuerjahr: 2025,
  });
  ok("Kürzung Juni", r.kuerzungsmonate === 5 && r.vorabpauschale === 103.31);
}

console.log("Fertig.");
