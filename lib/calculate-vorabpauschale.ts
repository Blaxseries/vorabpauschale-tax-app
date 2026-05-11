/**
 * Berechnungskern Vorabpauschale (Euro-only).
 *
 * Vorgelagerte Schicht (z. B. calculation-summary) liefert ausschließlich EUR-Werte.
 * kurs_jahresanfang / kurs_jahresende / ausschuettungen sind damit immer EUR-bezogen.
 * waehrung und ezb_kurs sind optional/deprecated und werden im Kern nicht ausgewertet.
 */

export interface FondsPosition {
  depot_id: string;
  isin: string;
  fondsname: string;
  fondsart: "aktien" | "misch" | "immobilien" | "immobilien_ausland" | "sonstige";
  /** Optional 0–1; sonst Ableitung aus fondsart. product_type/fund_type werden nicht verwendet. */
  teilfreistellungssatz?: number;
  anzahl_anteile: number;
  /** Nav bzw. Rücknahmepreis je Anteil am 01.01. in EUR (bereits umgerechnet). */
  kurs_jahresanfang: number;
  /** Nav bzw. Rücknahmepreis je Anteil am 31.12. in EUR. */
  kurs_jahresende: number;
  /** Ausschüttungen im Jahr in EUR. */
  ausschuettungen: number;
  /** @deprecated Nur für Kompatibilität; Kern ignoriert. */
  waehrung?: string;
  /** @deprecated Nur für Kompatibilität; Kern ignoriert. */
  ezb_kurs?: number;
  kauf_datum?: string | Date | null;
  verkauf_datum?: string | Date | null;
  ist_verkaufsjahr?: boolean;
  steuerjahr: number;
}

export type TaxOptions = {
  freistellungsauftrag?: number;
  kirchensteuer?: "none" | "8" | "9";
  solidaritaetszuschlag?: boolean;
};

export interface FondsErgebnis {
  depot_id: string;
  isin: string;
  fondsname: string;
  fondsart: FondsPosition["fondsart"];
  steuerjahr: number;
  /** @deprecated Kern rechnet nur EUR; nicht mehr gesetzt. */
  waehrung: string;
  /** @deprecated */
  waehrung_ist_eur: boolean;
  verwendeter_basiszins: number;
  teilfreistellungssatz: number;
  kuerzungsfaktor: number;
  kuerzungsmonate: number;
  ist_verkaufsjahr: boolean;
  jahresanfangswert: number;
  basisertrag: number;
  /** (kurs_jahresende − kurs_jahresanfang) × anzahl_anteile, ohne Ausschüttungen. */
  wertsteigerung: number;
  /** § 18: Wertänderung inkl. Ausschüttungen (vor Begrenzung). */
  wertsteigerung_inkl_ausschuettungen: number;
  /** min(Basisertrag, max(Wertsteigerung inkl. Ausschüttungen, 0)). */
  begrenzter_basisertrag: number;
  /** @deprecated Entspricht begrenzter_basisertrag. */
  vorabpauschale_brutto: number;
  /** max(begrenzter_basisertrag − ausschuettungen_eur, 0), vor unterjähriger Kürzung. */
  vorabpauschale_vor_kuerzung: number;
  /** @deprecated Entspricht vorabpauschale_vor_kuerzung. */
  vorabpauschale_netto: number;
  vorabpauschale_gekuerzt: number;
  /** Nach Teilfreistellung; End-KeSt/Soli/KiSt nur auf Gesamtebene (TaxOptions). */
  steuerpflichtig: number;
  /** @deprecated Immer 0 — Steuer nur in calculateMandant. */
  kest: number;
  /** @deprecated Immer 0. */
  soli: number;
  /** @deprecated Immer 0. */
  kirchensteuer: number;
  /** @deprecated Immer 0. */
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
  /** Summe Positions-KeSt (deprecated, hier 0). */
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

function resolveTeilfreistellungssatz(position: FondsPosition): number {
  if (typeof position.teilfreistellungssatz === "number" && Number.isFinite(position.teilfreistellungssatz)) {
    const t = position.teilfreistellungssatz;
    if (t < 0 || t > 1) {
      throw new Error(`teilfreistellungssatz muss zwischen 0 und 1 liegen (${position.isin}).`);
    }
    return Math.max(0, Math.min(1, t));
  }
  return getTeilfreistellungssatz(position.fondsart);
}

export function calculateFondsPosition(position: FondsPosition): FondsErgebnis {
  const protokoll: FondsErgebnis["protokoll"] = [];
  const waehrung = position.waehrung ?? "EUR";

  const basiszins = getBasiszins(position.steuerjahr);
  const teilfreistellungssatz = resolveTeilfreistellungssatz(position);

  const navStartEur = round6(position.kurs_jahresanfang);
  const navEndEur = round6(position.kurs_jahresende);
  const ausschuettungenEur = round6(position.ausschuettungen);

  const istVerkaufsjahr = Boolean(position.ist_verkaufsjahr) || isSaleInTaxYear(position);
  if (istVerkaufsjahr) {
    return buildZeroResult({
      position,
      basiszins,
      teilfreistellungssatz,
      waehrung,
      protokoll,
      grund: "Verkaufsjahr: keine Vorabpauschale.",
    });
  }

  if (basiszins === 0) {
    return buildZeroResult({
      position,
      basiszins,
      teilfreistellungssatz,
      waehrung,
      protokoll,
      grund: "Basiszins ist 0.",
    });
  }

  const jahresanfangswert = round6(position.anzahl_anteile * navStartEur);
  protokoll.push({
    schritt: "Jahresanfangswert",
    formel: "anzahl_anteile × nav_start_eur",
    wert: jahresanfangswert,
  });

  const basisertrag = round6(jahresanfangswert * basiszins * 0.7);
  protokoll.push({
    schritt: "Basisertrag",
    formel: "jahresanfangswert × basiszins × 0,7",
    wert: basisertrag,
  });

  const wertsteigerung = round6((navEndEur - navStartEur) * position.anzahl_anteile);
  protokoll.push({
    schritt: "Wertänderung (Preis)",
    formel: "(nav_end_eur − nav_start_eur) × anzahl_anteile",
    wert: wertsteigerung,
  });

  const wertsteigerungInklAusschuettungen = round6(wertsteigerung + ausschuettungenEur);
  protokoll.push({
    schritt: "Wertsteigerung inkl. Ausschüttungen",
    formel: "wertsteigerung + ausschuettungen_eur",
    wert: wertsteigerungInklAusschuettungen,
  });

  const begrenzterBasisertrag = round6(Math.min(basisertrag, Math.max(wertsteigerungInklAusschuettungen, 0)));
  protokoll.push({
    schritt: "Begrenzter Basisertrag",
    formel: "MIN(basisertrag, MAX(wertsteigerung_inkl_ausschuettungen, 0))",
    wert: begrenzterBasisertrag,
  });

  const vorabpauschaleVorKuerzung = round6(Math.max(begrenzterBasisertrag - ausschuettungenEur, 0));
  protokoll.push({
    schritt: "Vorabpauschale vor Kürzung",
    formel: "MAX(begrenzter_basisertrag − ausschuettungen_eur, 0)",
    wert: vorabpauschaleVorKuerzung,
  });

  if (vorabpauschaleVorKuerzung <= 0) {
    return buildZeroResult({
      position,
      basiszins,
      teilfreistellungssatz,
      waehrung,
      protokoll,
      grund: "Vorabpauschale vor Kürzung = 0.",
      jahresanfangswert,
      basisertrag,
      wertsteigerung,
      wertsteigerung_inkl_ausschuettungen: wertsteigerungInklAusschuettungen,
      begrenzter_basisertrag: begrenzterBasisertrag,
      vorabpauschale_vor_kuerzung: vorabpauschaleVorKuerzung,
    });
  }

  const kuerzungsmonate = getKuerzungsmonate(position.kauf_datum);
  const kuerzungsfaktor = round6((12 - kuerzungsmonate) / 12);
  const vorabpauschaleGekuerzt = round6(vorabpauschaleVorKuerzung * kuerzungsfaktor);
  protokoll.push({
    schritt: "Unterjährige Kürzung",
    formel: "vorabpauschale_vor_kuerzung × ((12 − kuerzungsmonate) / 12)",
    wert: vorabpauschaleGekuerzt,
    hinweis: `Kürzungsmonate: ${kuerzungsmonate}`,
  });

  const steuerpflichtig = round6(vorabpauschaleGekuerzt * (1 - teilfreistellungssatz));
  protokoll.push({
    schritt: "Steuerpflicht nach Teilfreistellung (Position)",
    formel: "vorabpauschale_gekuerzt × (1 − teilfreistellungssatz)",
    wert: steuerpflichtig,
    hinweis: "Endgültige Kapitalertragsteuer auf Mandantenebene (Freistellungsauftrag, KiSt, Soli).",
  });

  return {
    depot_id: position.depot_id,
    isin: position.isin,
    fondsname: position.fondsname,
    fondsart: position.fondsart,
    steuerjahr: position.steuerjahr,
    waehrung,
    waehrung_ist_eur: waehrung.toUpperCase() === "EUR",
    verwendeter_basiszins: basiszins,
    teilfreistellungssatz,
    kuerzungsfaktor,
    kuerzungsmonate,
    ist_verkaufsjahr: false,
    jahresanfangswert,
    basisertrag,
    wertsteigerung,
    wertsteigerung_inkl_ausschuettungen: wertsteigerungInklAusschuettungen,
    begrenzter_basisertrag: begrenzterBasisertrag,
    vorabpauschale_brutto: begrenzterBasisertrag,
    vorabpauschale_vor_kuerzung: vorabpauschaleVorKuerzung,
    vorabpauschale_netto: vorabpauschaleVorKuerzung,
    vorabpauschale_gekuerzt: vorabpauschaleGekuerzt,
    steuerpflichtig,
    kest: 0,
    soli: 0,
    kirchensteuer: 0,
    gesamtsteuer: 0,
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

  return {
    depot_id: depotId,
    fonds_ergebnisse: fondsErgebnisse,
    summe_vorabpauschale_depot: summeVorabpauschaleDepot,
    summe_steuerpflichtig_depot: summeSteuerpflichtigDepot,
    summe_kest_depot: 0,
    summe_soli_depot: 0,
    summe_kirchensteuer_depot: 0,
    summe_steuer_depot: 0,
  };
}

/**
 * Mandantenaggregation inkl. Freistellungsauftrag und Steuer (KeSt, Soli, KiSt) auf Gesamtebene.
 */
export function calculateMandant(
  depots: { depot_id: string; positionen: FondsPosition[] }[],
  taxOptions: TaxOptions = {},
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

  const freistellungsauftrag = Math.max(taxOptions.freistellungsauftrag ?? 0, 0);
  const steuerpflichtigNachFreistellung = round6(
    Math.max(summeSteuerpflichtigVorFreistellung - freistellungsauftrag, 0),
  );

  const ki = taxOptions.kirchensteuer ?? "none";
  let kestGesamt: number;
  let kirchensteuerGesamt: number;

  if (ki === "8") {
    const k = 0.08;
    kestGesamt = round2(steuerpflichtigNachFreistellung / (4 + k));
    kirchensteuerGesamt = round2(kestGesamt * k);
  } else if (ki === "9") {
    const k = 0.09;
    kestGesamt = round2(steuerpflichtigNachFreistellung / (4 + k));
    kirchensteuerGesamt = round2(kestGesamt * k);
  } else {
    kestGesamt = round2(steuerpflichtigNachFreistellung * 0.25);
    kirchensteuerGesamt = 0;
  }

  const soliAktiv = taxOptions.solidaritaetszuschlag !== false;
  const soliGesamt = soliAktiv ? round2(kestGesamt * 0.055) : 0;
  const summeSteuerGesamt = round2(kestGesamt + soliGesamt + kirchensteuerGesamt);

  const protokoll = [
    `Summe Vorabpauschale gesamt: ${summeVorabpauschaleGesamt.toFixed(2)} EUR`,
    `Steuerpflichtig vor Freistellungsauftrag: ${summeSteuerpflichtigVorFreistellung.toFixed(6)} EUR`,
    `Freistellungsauftrag: ${freistellungsauftrag.toFixed(2)} EUR`,
    `Steuerpflichtig nach Freistellungsauftrag: ${steuerpflichtigNachFreistellung.toFixed(6)} EUR`,
    `Kirchensteuer-Modus: ${ki}`,
    `KeSt gesamt: ${kestGesamt.toFixed(2)} EUR`,
    `Soli gesamt: ${soliGesamt.toFixed(2)} EUR`,
    `KiSt gesamt: ${kirchensteuerGesamt.toFixed(2)} EUR`,
    `Summe Steuer gesamt: ${summeSteuerGesamt.toFixed(2)} EUR`,
  ];

  return {
    depot_ergebnisse: depotErgebnisse,
    summe_vorabpauschale_gesamt: summeVorabpauschaleGesamt,
    summe_steuerpflichtig_vor_freistellung: summeSteuerpflichtigVorFreistellung,
    freistellungsauftrag: round2(freistellungsauftrag),
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
  waehrung: string;
  protokoll: FondsErgebnis["protokoll"];
  grund: string;
  jahresanfangswert?: number;
  basisertrag?: number;
  wertsteigerung?: number;
  wertsteigerung_inkl_ausschuettungen?: number;
  begrenzter_basisertrag?: number;
  vorabpauschale_vor_kuerzung?: number;
}): FondsErgebnis {
  const {
    position,
    basiszins,
    teilfreistellungssatz,
    waehrung,
    protokoll,
    grund,
    jahresanfangswert = 0,
    basisertrag = 0,
    wertsteigerung = 0,
    wertsteigerung_inkl_ausschuettungen = 0,
    begrenzter_basisertrag = 0,
    vorabpauschale_vor_kuerzung = 0,
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
    fondsart: position.fondsart,
    steuerjahr: position.steuerjahr,
    waehrung,
    waehrung_ist_eur: waehrung.toUpperCase() === "EUR",
    verwendeter_basiszins: basiszins,
    teilfreistellungssatz,
    kuerzungsfaktor: 1,
    kuerzungsmonate: 0,
    ist_verkaufsjahr: grund.includes("Verkaufsjahr"),
    jahresanfangswert,
    basisertrag,
    wertsteigerung,
    wertsteigerung_inkl_ausschuettungen,
    begrenzter_basisertrag,
    vorabpauschale_brutto: begrenzter_basisertrag,
    vorabpauschale_vor_kuerzung,
    vorabpauschale_netto: vorabpauschale_vor_kuerzung,
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

/** Kürzungsmonate ab Jahresanfang bis Vormonat des Kaufs (vgl. Spec: kaufmonat − 1). */
export function getKuerzungsmonate(kaufDatum?: string | Date | null): number {
  if (!kaufDatum) return 0;
  const date = new Date(kaufDatum);
  if (Number.isNaN(date.getTime())) return 0;
  const kaufmonat = date.getMonth() + 1;
  return Math.max(kaufmonat - 1, 0);
}

/** Anrechenbare Monate im Steuerjahr bei unterjährigem Erwerb (12 − Kürzungsmonate). */
export function getAnrechenbareMonate(kaufDatum?: string | Date | null): number {
  return 12 - getKuerzungsmonate(kaufDatum);
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
