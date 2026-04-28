/**
 * Reiner Berechnungskern für Vorabpauschale gemäß docs/02_tax_calculation_spec.md.
 *
 * Wichtige Randbedingungen:
 * - Keine UI-Logik
 * - Keine Datenbank-/Supabase-Aufrufe
 * - Vollständige Zwischenwerte für spätere Protokollansicht
 */

export interface FondsPosition {
  depot_id: string;
  isin: string;
  fondsname: string;
  fondsart: "aktien" | "misch" | "immobilien" | "immobilien_ausland" | "sonstige";
  teilfreistellungssatz?: number;
  anzahl_anteile: number;
  kurs_jahresanfang: number;
  kurs_jahresende: number;
  ausschuettungen: number;
  waehrung: string;
  ezb_kurs: number;
  kauf_datum?: string | Date | null;
  verkauf_datum?: string | Date | null;
  ist_verkaufsjahr?: boolean;
  steuerjahr: number;
}

export interface FondsErgebnis {
  depot_id: string;
  isin: string;
  fondsname: string;
  steuerjahr: number;
  waehrung: string;
  waehrung_ist_eur: boolean;
  verwendeter_basiszins: number;
  teilfreistellungssatz: number;
  kuerzungsfaktor: number;
  kuerzungsmonate: number;
  ist_verkaufsjahr: boolean;
  jahresanfangswert: number;
  basisertrag: number;
  wertsteigerung: number;
  vorabpauschale_brutto: number;
  vorabpauschale_netto: number;
  vorabpauschale_gekuerzt: number;
  steuerpflichtig: number;
  kest: number;
  soli: number;
  kirchensteuer: number;
  gesamtsteuer: number;
  vorabpauschale: number;
  ist_nullfall: boolean;
  nullfall_grund: string | null;
  protokoll: Array<{
    schritt: string;
    formel: string;
    wert: number;
    hinweis?: string;
  }>;
}

export interface DepotErgebnis {
  depot_id: string;
  fonds_ergebnisse: FondsErgebnis[];
  summe_vorabpauschale_depot: number;
  summe_steuerpflichtig_depot: number;
  summe_kest_depot: number;
  summe_soli_depot: number;
  summe_kirchensteuer_depot: number;
  summe_steuer_depot: number;
}

export interface MandantErgebnis {
  depot_ergebnisse: DepotErgebnis[];
  summe_vorabpauschale_gesamt: number;
  summe_steuerpflichtig_vor_freistellung: number;
  freistellungsauftrag: number;
  steuerpflichtig_nach_freistellung: number;
  kest_gesamt: number;
  soli_gesamt: number;
  kirchensteuer_gesamt: number;
  summe_steuer_gesamt: number;
  protokoll: string[];
}

const BASISZINS_BY_YEAR: Record<number, number> = {
  2018: 0.0087,
  2019: 0.0052,
  2020: 0.0,
  2021: 0.0,
  2022: 0.0,
  2023: 0.0255,
  2024: 0.0229,
  2025: 0.0253,
  2026: 0.032,
};

export function getBasiszins(jahr: number): number {
  const rate = BASISZINS_BY_YEAR[jahr];
  if (typeof rate !== "number") {
    throw new Error(`Unbekannter Basiszins für Jahr ${jahr}. Unterstützt: 2018-2026.`);
  }
  return rate;
}

export function getTeilfreistellungssatz(fondsart: string): number {
  switch (fondsart) {
    case "aktien":
      return 0.3;
    case "misch":
      return 0.15;
    case "immobilien":
      return 0.6;
    case "immobilien_ausland":
      return 0.8;
    case "sonstige":
      return 0;
    default:
      return 0;
  }
}

export function calculateFondsPosition(position: FondsPosition): FondsErgebnis {
  const protokoll: FondsErgebnis["protokoll"] = [];

  const basiszins = getBasiszins(position.steuerjahr);
  const teilfreistellungssatz =
    typeof position.teilfreistellungssatz === "number"
      ? position.teilfreistellungssatz
      : getTeilfreistellungssatz(position.fondsart);

  const waehrungIstEur = position.waehrung.toUpperCase() === "EUR";
  const fx = waehrungIstEur ? 1 : position.ezb_kurs;
  if (!Number.isFinite(fx) || fx <= 0) {
    throw new Error(`Ungültiger EZB-Kurs für ${position.isin}.`);
  }

  const kursJahresanfangEur = round6(position.kurs_jahresanfang / fx);
  const kursJahresendeEur = round6(position.kurs_jahresende / fx);
  const ausschuettungenEur = round6(position.ausschuettungen / fx);

  const istVerkaufsjahr = Boolean(position.ist_verkaufsjahr) || isSaleInTaxYear(position);
  if (istVerkaufsjahr) {
    return buildZeroResult({
      position,
      basiszins,
      teilfreistellungssatz,
      waehrungIstEur,
      protokoll,
      grund: "Verkaufsjahr: keine Vorabpauschale.",
    });
  }

  if (basiszins === 0) {
    return buildZeroResult({
      position,
      basiszins,
      teilfreistellungssatz,
      waehrungIstEur,
      protokoll,
      grund: "Basiszins ist 0.",
    });
  }

  const jahresanfangswert = round6(position.anzahl_anteile * kursJahresanfangEur);
  protokoll.push({
    schritt: "Jahresanfangswert",
    formel: "anzahl_anteile × kurs_jahresanfang_eur",
    wert: jahresanfangswert,
  });

  const basisertrag = round6(jahresanfangswert * basiszins * 0.7);
  protokoll.push({
    schritt: "Basisertrag",
    formel: "jahresanfangswert × basiszins × 0,7",
    wert: basisertrag,
  });

  if (ausschuettungenEur >= basisertrag) {
    return buildZeroResult({
      position,
      basiszins,
      teilfreistellungssatz,
      waehrungIstEur,
      protokoll,
      grund: "Ausschüttungen >= Basisertrag.",
      jahresanfangswert,
      basisertrag,
      wertsteigerung: 0,
    });
  }

  const wertsteigerung = round6((kursJahresendeEur - kursJahresanfangEur) * position.anzahl_anteile);
  protokoll.push({
    schritt: "Wertsteigerung",
    formel: "(kurs_jahresende_eur - kurs_jahresanfang_eur) × anzahl_anteile",
    wert: wertsteigerung,
  });

  if (wertsteigerung <= 0) {
    return buildZeroResult({
      position,
      basiszins,
      teilfreistellungssatz,
      waehrungIstEur,
      protokoll,
      grund: "Wertsteigerung <= 0.",
      jahresanfangswert,
      basisertrag,
      wertsteigerung,
    });
  }

  const vorabpauschaleBrutto = round6(Math.min(basisertrag, wertsteigerung));
  protokoll.push({
    schritt: "Vorabpauschale brutto",
    formel: "MIN(basisertrag, wertsteigerung)",
    wert: vorabpauschaleBrutto,
  });

  const vorabpauschaleNetto = round6(vorabpauschaleBrutto - ausschuettungenEur);
  protokoll.push({
    schritt: "Vorabpauschale netto",
    formel: "vorabpauschale_brutto - ausschuettungen_eur",
    wert: vorabpauschaleNetto,
  });

  if (vorabpauschaleNetto <= 0) {
    return buildZeroResult({
      position,
      basiszins,
      teilfreistellungssatz,
      waehrungIstEur,
      protokoll,
      grund: "Vorabpauschale netto <= 0.",
      jahresanfangswert,
      basisertrag,
      wertsteigerung,
      vorabpauschaleBrutto,
      vorabpauschaleNetto,
    });
  }

  const kuerzungsmonate = getKuerzungsmonate(position.kauf_datum);
  const kuerzungsfaktor = round6((12 - kuerzungsmonate) / 12);
  const vorabpauschaleGekuerzt = round6(vorabpauschaleNetto * kuerzungsfaktor);
  protokoll.push({
    schritt: "Unterjährige Kürzung",
    formel: "vorabpauschale_netto × ((12 - kuerzungsmonate) / 12)",
    wert: vorabpauschaleGekuerzt,
    hinweis: `Kürzungsmonate: ${kuerzungsmonate}`,
  });

  const steuerpflichtig = round6(vorabpauschaleGekuerzt * (1 - teilfreistellungssatz));
  protokoll.push({
    schritt: "Steuerpflichtiger Betrag",
    formel: "vorabpauschale_gekuerzt × (1 - teilfreistellungssatz)",
    wert: steuerpflichtig,
  });

  const kest = round2(steuerpflichtig * 0.25);
  const soli = round2(kest * 0.055);
  const kirchensteuer = 0;
  const gesamtsteuer = round2(kest + soli + kirchensteuer);

  protokoll.push({ schritt: "KeSt", formel: "steuerpflichtig × 0,25", wert: kest });
  protokoll.push({ schritt: "Soli", formel: "kest × 0,055", wert: soli });
  protokoll.push({ schritt: "KiSt", formel: "optional", wert: kirchensteuer, hinweis: "Auf Positionsebene nicht angesetzt." });
  protokoll.push({ schritt: "Gesamtsteuer", formel: "kest + soli + kirchensteuer", wert: gesamtsteuer });

  return {
    depot_id: position.depot_id,
    isin: position.isin,
    fondsname: position.fondsname,
    steuerjahr: position.steuerjahr,
    waehrung: position.waehrung,
    waehrung_ist_eur: waehrungIstEur,
    verwendeter_basiszins: basiszins,
    teilfreistellungssatz,
    kuerzungsfaktor,
    kuerzungsmonate,
    ist_verkaufsjahr: false,
    jahresanfangswert,
    basisertrag,
    wertsteigerung,
    vorabpauschale_brutto: vorabpauschaleBrutto,
    vorabpauschale_netto: vorabpauschaleNetto,
    vorabpauschale_gekuerzt: vorabpauschaleGekuerzt,
    steuerpflichtig,
    kest,
    soli,
    kirchensteuer,
    gesamtsteuer,
    vorabpauschale: round2(vorabpauschaleGekuerzt),
    ist_nullfall: false,
    nullfall_grund: null,
    protokoll,
  };
}

export function calculateDepot(positionen: FondsPosition[]): DepotErgebnis {
  const fondsErgebnisse = positionen.map((position) => calculateFondsPosition(position));
  const depotId = positionen[0]?.depot_id ?? "unknown";

  const summeVorabpauschaleDepot = round2(sumBy(fondsErgebnisse, (item) => item.vorabpauschale));
  const summeSteuerpflichtigDepot = round6(sumBy(fondsErgebnisse, (item) => item.steuerpflichtig));
  const summeKestDepot = round2(sumBy(fondsErgebnisse, (item) => item.kest));
  const summeSoliDepot = round2(sumBy(fondsErgebnisse, (item) => item.soli));
  const summeKirchensteuerDepot = round2(sumBy(fondsErgebnisse, (item) => item.kirchensteuer));
  const summeSteuerDepot = round2(summeKestDepot + summeSoliDepot + summeKirchensteuerDepot);

  return {
    depot_id: depotId,
    fonds_ergebnisse: fondsErgebnisse,
    summe_vorabpauschale_depot: summeVorabpauschaleDepot,
    summe_steuerpflichtig_depot: summeSteuerpflichtigDepot,
    summe_kest_depot: summeKestDepot,
    summe_soli_depot: summeSoliDepot,
    summe_kirchensteuer_depot: summeKirchensteuerDepot,
    summe_steuer_depot: summeSteuerDepot,
  };
}

export function calculateMandant(
  depots: { depot_id: string; positionen: FondsPosition[] }[],
  freistellungsauftrag: number,
  kirchensteuersatz?: number,
): MandantErgebnis {
  const depotErgebnisse = depots.map((depot) =>
    calculateDepot(
      depot.positionen.map((position) => ({
        ...position,
        depot_id: depot.depot_id,
      })),
    ),
  );

  const summeVorabpauschaleGesamt = round2(
    sumBy(depotErgebnisse, (depot) => depot.summe_vorabpauschale_depot),
  );
  const summeSteuerpflichtigVorFreistellung = round6(
    sumBy(depotErgebnisse, (depot) => depot.summe_steuerpflichtig_depot),
  );
  const steuerpflichtigNachFreistellung = round6(
    Math.max(summeSteuerpflichtigVorFreistellung - Math.max(freistellungsauftrag, 0), 0),
  );

  const kestGesamt = round2(steuerpflichtigNachFreistellung * 0.25);
  const soliGesamt = round2(kestGesamt * 0.055);
  const kirchensteuerGesamt = round2(
    kirchensteuersatz ? kestGesamt * Math.max(kirchensteuersatz, 0) : 0,
  );
  const summeSteuerGesamt = round2(kestGesamt + soliGesamt + kirchensteuerGesamt);

  const protokoll = [
    `Summe Vorabpauschale gesamt: ${summeVorabpauschaleGesamt.toFixed(2)} EUR`,
    `Steuerpflichtig vor Freistellungsauftrag: ${summeSteuerpflichtigVorFreistellung.toFixed(6)} EUR`,
    `Freistellungsauftrag: ${Math.max(freistellungsauftrag, 0).toFixed(2)} EUR`,
    `Steuerpflichtig nach Freistellungsauftrag: ${steuerpflichtigNachFreistellung.toFixed(6)} EUR`,
    `KeSt gesamt: ${kestGesamt.toFixed(2)} EUR`,
    `Soli gesamt: ${soliGesamt.toFixed(2)} EUR`,
    `KiSt gesamt: ${kirchensteuerGesamt.toFixed(2)} EUR`,
    `Summe Steuer gesamt: ${summeSteuerGesamt.toFixed(2)} EUR`,
  ];

  return {
    depot_ergebnisse: depotErgebnisse,
    summe_vorabpauschale_gesamt: summeVorabpauschaleGesamt,
    summe_steuerpflichtig_vor_freistellung: summeSteuerpflichtigVorFreistellung,
    freistellungsauftrag: round2(Math.max(freistellungsauftrag, 0)),
    steuerpflichtig_nach_freistellung: steuerpflichtigNachFreistellung,
    kest_gesamt: kestGesamt,
    soli_gesamt: soliGesamt,
    kirchensteuer_gesamt: kirchensteuerGesamt,
    summe_steuer_gesamt: summeSteuerGesamt,
    protokoll,
  };
}

function buildZeroResult(params: {
  position: FondsPosition;
  basiszins: number;
  teilfreistellungssatz: number;
  waehrungIstEur: boolean;
  protokoll: FondsErgebnis["protokoll"];
  grund: string;
  jahresanfangswert?: number;
  basisertrag?: number;
  wertsteigerung?: number;
  vorabpauschaleBrutto?: number;
  vorabpauschaleNetto?: number;
}): FondsErgebnis {
  const {
    position,
    basiszins,
    teilfreistellungssatz,
    waehrungIstEur,
    protokoll,
    grund,
    jahresanfangswert = 0,
    basisertrag = 0,
    wertsteigerung = 0,
    vorabpauschaleBrutto = 0,
    vorabpauschaleNetto = 0,
  } = params;

  protokoll.push({
    schritt: "Nullfall",
    formel: "Vorabpauschale = 0",
    wert: 0,
    hinweis: grund,
  });

  return {
    depot_id: position.depot_id,
    isin: position.isin,
    fondsname: position.fondsname,
    steuerjahr: position.steuerjahr,
    waehrung: position.waehrung,
    waehrung_ist_eur: waehrungIstEur,
    verwendeter_basiszins: basiszins,
    teilfreistellungssatz,
    kuerzungsfaktor: 1,
    kuerzungsmonate: 0,
    ist_verkaufsjahr: grund.includes("Verkaufsjahr"),
    jahresanfangswert,
    basisertrag,
    wertsteigerung,
    vorabpauschale_brutto: vorabpauschaleBrutto,
    vorabpauschale_netto: vorabpauschaleNetto,
    vorabpauschale_gekuerzt: 0,
    steuerpflichtig: 0,
    kest: 0,
    soli: 0,
    kirchensteuer: 0,
    gesamtsteuer: 0,
    vorabpauschale: 0,
    ist_nullfall: true,
    nullfall_grund: grund,
    protokoll,
  };
}

function getKuerzungsmonate(kaufDatum?: string | Date | null): number {
  if (!kaufDatum) return 0;
  const date = new Date(kaufDatum);
  if (Number.isNaN(date.getTime())) return 0;
  const kaufmonat = date.getMonth() + 1;
  return Math.max(kaufmonat - 1, 0);
}

function isSaleInTaxYear(position: FondsPosition): boolean {
  if (!position.verkauf_datum) return false;
  const date = new Date(position.verkauf_datum);
  if (Number.isNaN(date.getTime())) return false;
  return date.getFullYear() === position.steuerjahr;
}

function sumBy<T>(items: T[], mapper: (item: T) => number): number {
  return items.reduce((sum, item) => sum + mapper(item), 0);
}

function round6(value: number): number {
  return Number(value.toFixed(6));
}

function round2(value: number): number {
  return Number(value.toFixed(2));
}
