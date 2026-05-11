"use client";

import { useEffect, useMemo, useState } from "react";

import {
  type FondsPosition,
  type MandantErgebnis,
  calculateMandant,
  getTeilfreistellungssatz,
} from "@/lib/calculate-vorabpauschale";
import {
  TAX_FUND_TYPE_SELECT,
  parseTaxFundTypeKey,
  resolveEzbEndStrict,
} from "@/lib/fund-position-metadata";
import { supabase } from "@/lib/supabase";
import {
  resolvePartialExemptionRate,
  rowToValidationInput,
  validateFundPosition,
} from "@/lib/validate-fund-position";

type PortfolioMeta = {
  id: string;
  bankName: string;
  depotNumber: string;
};

type CalculationSummaryProps = {
  clientId: string;
  year: string;
};

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const normalized = value.replace(/\./g, "").replace(",", ".");
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function asBoolean(value: unknown): boolean {
  return value === true;
}

function mapReviewStatusGeprueft(status: string | null | undefined): boolean {
  const n = (status ?? "").trim().toLowerCase();
  return n === "geprüft" || n === "geprueft" || n === "gepruft" || n === "approved";
}

function formatEur(value: number): string {
  return value.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function parseStoredErrors(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((item): item is string => typeof item === "string");
}

function taxFundTypeDisplayLabel(fondsart: string): string {
  const hit = TAX_FUND_TYPE_SELECT.find((o) => o.key === fondsart);
  return hit?.label ?? fondsart;
}

type DisplayRow = {
  id: string;
  fundName: string;
  isin: string;
  taxFundTypeLabel: string;
  teilfreistellung: number | null;
  vorabpauschale: number | null;
  steuerpflichtig: number | null;
};

type ExcludedRow = {
  id: string;
  portfolioId: string;
  fundName: string;
  isin: string;
  errors: string[];
};

/**
 * EZB-Felder: Semantik „1 EUR = x Fremdwährungseinheiten“ → EUR-Betrag = Fremdwährungsbetrag / x.
 * Der Berechnungskern erhält nur EUR (kurs_jahresanfang / kurs_jahresende / ausschuettungen).
 */
function buildFundRow(raw: Record<string, unknown>, portfolioId: string, yearNum: number): FondsPosition | null {
  const fundName = asString(raw.fund_name) || "Unbenannter Fonds";
  const isin = asString(raw.isin);
  const currency = (asString(raw.currency) || "EUR").toUpperCase();
  const startPrice = asNumber(raw.price_start);
  const endPrice = asNumber(raw.price_end);
  const unitsEnd = asNumber(raw.units_end);
  const distributionsFcy = asNumber(raw.distributions) ?? 0;

  if (!isin || startPrice === null || endPrice === null || unitsEnd === null) return null;

  const taxKey = parseTaxFundTypeKey(asString(raw.tax_fund_type));
  const fondsart = taxKey ?? "sonstige";
  const teilfreistellung =
    resolvePartialExemptionRate(asString(raw.tax_fund_type), asNumber(raw.partial_exemption_rate)) ??
    getTeilfreistellungssatz(fondsart);

  const ezbRow = {
    ezb_kurs_jahresende: asNumber(raw.ezb_kurs_jahresende),
    ezb_kurs: asNumber(raw.ezb_kurs),
    ezb_rate: asNumber(raw.ezb_rate),
  };

  let kursJahresanfangEur: number;
  let kursJahresendeEur: number;
  let ausschuettungenEur: number;

  if (currency === "EUR") {
    kursJahresanfangEur = startPrice;
    kursJahresendeEur = endPrice;
    ausschuettungenEur = distributionsFcy;
  } else {
    const ezbEnd = resolveEzbEndStrict(ezbRow);
    if (ezbEnd === null) return null;

    const ezbStartExplicit = asNumber(raw.ezb_kurs_jahresanfang);
    const ezbStart =
      ezbStartExplicit !== null && Number.isFinite(ezbStartExplicit) && ezbStartExplicit > 0
        ? ezbStartExplicit
        : // MVP-Fallback: NAV 01.01. mit Jahresendkurs umgerechnet — später Stichtagskurs 01.01.
          ezbEnd;

    kursJahresanfangEur = startPrice / ezbStart;
    kursJahresendeEur = endPrice / ezbEnd;
    // MVP: Ausschüttungen mit Jahresendkurs (gleiche Kette wie NAV 31.12.) — später nach Zahlungsdatum.
    ausschuettungenEur = distributionsFcy / ezbEnd;
  }

  if (
    !Number.isFinite(kursJahresanfangEur) ||
    !Number.isFinite(kursJahresendeEur) ||
    !Number.isFinite(ausschuettungenEur)
  ) {
    return null;
  }

  return {
    depot_id: portfolioId,
    isin,
    fondsname: fundName,
    fondsart,
    teilfreistellungssatz: teilfreistellung,
    anzahl_anteile: unitsEnd,
    kurs_jahresanfang: kursJahresanfangEur,
    kurs_jahresende: kursJahresendeEur,
    ausschuettungen: ausschuettungenEur,
    waehrung: currency,
    kauf_datum: asString(raw.purchase_date) || null,
    verkauf_datum: asString(raw.verkauf_datum) || null,
    ist_verkaufsjahr: false,
    steuerjahr: yearNum,
  };
}

export function CalculationSummary({ clientId, year }: CalculationSummaryProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [result, setResult] = useState<MandantErgebnis | null>(null);
  const [portfolioMetaById, setPortfolioMetaById] = useState<Record<string, PortfolioMeta>>({});
  const [portfolioIds, setPortfolioIds] = useState<string[]>([]);
  const [displayRowsByDepot, setDisplayRowsByDepot] = useState<Record<string, DisplayRow[]>>({});
  const [excludedRows, setExcludedRows] = useState<ExcludedRow[]>([]);
  const [hasEligiblePositions, setHasEligiblePositions] = useState(false);
  const [collapsedDepotIds, setCollapsedDepotIds] = useState<string[]>([]);

  const yearNum = Number(year);

  useEffect(() => {
    let isActive = true;

    async function loadCalculationData() {
      setIsLoading(true);
      setErrorMessage(null);

      const { data: taxYear, error: taxYearError } = await supabase
        .from("tax_years")
        .select("id")
        .eq("client_id", clientId)
        .eq("year", yearNum)
        .maybeSingle<{ id: string }>();

      if (!isActive) return;
      if (taxYearError || !taxYear) {
        setErrorMessage("Steuerjahr konnte für die Berechnung nicht geladen werden.");
        setIsLoading(false);
        return;
      }

      const { data: portfolios, error: portfoliosError } = await supabase
        .from("portfolios")
        .select("id, bank_name, account_number")
        .eq("tax_year_id", taxYear.id)
        .returns<Array<{ id: string; bank_name: string; account_number: string }>>();

      if (!isActive) return;
      if (portfoliosError) {
        setErrorMessage("Depots konnten für die Berechnung nicht geladen werden.");
        setIsLoading(false);
        return;
      }

      const pIds = portfolios.map((portfolio) => portfolio.id);
      const metaMap: Record<string, PortfolioMeta> = {};
      for (const portfolio of portfolios) {
        metaMap[portfolio.id] = {
          id: portfolio.id,
          bankName: portfolio.bank_name || "Unbekannte Bank",
          depotNumber: portfolio.account_number || "—",
        };
      }
      setPortfolioMetaById(metaMap);
      setPortfolioIds(pIds);

      if (pIds.length === 0) {
        setResult(null);
        setDisplayRowsByDepot({});
        setExcludedRows([]);
        setHasEligiblePositions(false);
        setIsLoading(false);
        return;
      }

      const { data: fundPositions, error: fundPositionsError } = await supabase
        .from("fund_positions")
        .select("*")
        .in("portfolio_id", pIds)
        .returns<Record<string, unknown>[]>();

      if (!isActive) return;
      if (fundPositionsError) {
        setErrorMessage("Fondspositionen konnten nicht geladen werden.");
        setIsLoading(false);
        return;
      }

      const excluded: ExcludedRow[] = [];
      const depotsForCalculation: Array<{ depot_id: string; positionen: FondsPosition[] }> = [];
      const calculatedDisplayRowsByDepot: Record<string, DisplayRow[]> = {};

      for (const portfolioId of pIds) {
        const positions = fundPositions.filter((position) => asString(position.portfolio_id) === portfolioId);
        const mapped: FondsPosition[] = [];
        calculatedDisplayRowsByDepot[portfolioId] = [];

        for (const raw of positions) {
          const positionId = asString(raw.id) || crypto.randomUUID();
          const fundName = asString(raw.fund_name) || "Unbenannter Fonds";
          const isin = asString(raw.isin) || "—";

          const input = rowToValidationInput({
            portfolio_id: asString(raw.portfolio_id),
            isin: asString(raw.isin),
            fund_name: asString(raw.fund_name),
            tax_fund_type: asString(raw.tax_fund_type),
            partial_exemption_rate: asNumber(raw.partial_exemption_rate),
            units_end: asNumber(raw.units_end),
            price_start: asNumber(raw.price_start),
            price_end: asNumber(raw.price_end),
            currency: asString(raw.currency),
            distributions: asNumber(raw.distributions),
            ezb_kurs_jahresende: asNumber(raw.ezb_kurs_jahresende),
            ezb_kurs: asNumber(raw.ezb_kurs),
            ezb_rate: asNumber(raw.ezb_rate),
            review_status: asString(raw.review_status),
            product_type: asString(raw.product_type),
          });

          const v = validateFundPosition(input);
          const reviewed = mapReviewStatusGeprueft(asString(raw.review_status));
          const dbReady = asBoolean(raw.calculation_ready);
          const eligible = reviewed && dbReady && v.calculationReady;

          const storedErrors = parseStoredErrors(raw.validation_errors);
          const errorLines = storedErrors.length > 0 ? storedErrors : v.errors;

          if (!eligible) {
            excluded.push({
              id: positionId,
              portfolioId,
              fundName,
              isin,
              errors: errorLines.length > 0 ? errorLines : ["Position ist nicht berechnungsfähig."],
            });
            continue;
          }

          const built = buildFundRow(raw, portfolioId, yearNum);
          if (!built) {
            excluded.push({
              id: positionId,
              portfolioId,
              fundName,
              isin,
              errors: ["Interne Aufbereitung der Position fehlgeschlagen (fehlende Kurs- oder FX-Daten)."],
            });
            continue;
          }

          mapped.push(built);
        }

        depotsForCalculation.push({ depot_id: portfolioId, positionen: mapped });
      }

      const totalEligible = depotsForCalculation.reduce((s, d) => s + d.positionen.length, 0);
      setHasEligiblePositions(totalEligible > 0);
      setExcludedRows(excluded);

      if (totalEligible === 0) {
        setResult(null);
        setDisplayRowsByDepot({});
        setIsLoading(false);
        return;
      }

      const mandantResult = calculateMandant(depotsForCalculation, {
        freistellungsauftrag: 0,
        kirchensteuer: "none",
        solidaritaetszuschlag: true,
      });

      for (const depot of mandantResult.depot_ergebnisse) {
        calculatedDisplayRowsByDepot[depot.depot_id] = depot.fonds_ergebnisse.map((entry) => ({
          id: `${depot.depot_id}-${entry.isin}-${entry.fondsname}`,
          fundName: entry.fondsname,
          isin: entry.isin,
          taxFundTypeLabel: taxFundTypeDisplayLabel(entry.fondsart),
          teilfreistellung: entry.teilfreistellungssatz,
          vorabpauschale: entry.vorabpauschale,
          steuerpflichtig: entry.steuerpflichtig,
        }));
      }

      setResult(mandantResult);
      setDisplayRowsByDepot(calculatedDisplayRowsByDepot);
      setIsLoading(false);
    }

    void loadCalculationData();
    return () => {
      isActive = false;
    };
  }, [clientId, yearNum]);

  const calculatedPositionCount = useMemo(() => {
    if (!result) return 0;
    return result.depot_ergebnisse.reduce((sum, depot) => sum + depot.fonds_ergebnisse.length, 0);
  }, [result]);

  function toggleDepot(depotId: string) {
    setCollapsedDepotIds((current) =>
      current.includes(depotId) ? current.filter((id) => id !== depotId) : [...current, depotId],
    );
  }

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-zinc-300 bg-white p-6 shadow-sm">
        <h2 className="text-2xl font-semibold tracking-tight text-zinc-900">Vorabpauschale {year}</h2>
        <p className="mt-1 text-sm text-zinc-600">
          Es werden nur Positionen mit Prüfstatus „geprüft“, gesetztem Berechnungsflag und vollständiger Validierung berücksichtigt.
        </p>
        {isLoading ? (
          <p className="mt-4 text-sm text-zinc-600">Berechnung wird vorbereitet...</p>
        ) : errorMessage ? (
          <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {errorMessage}
          </p>
        ) : !hasEligiblePositions ? (
          <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-3 text-sm text-amber-950">
            <p className="font-medium">Keine berechnungsfähigen Positionen</p>
            <p className="mt-1 text-amber-900">
              Es sind keine Fondspositionen für die Berechnung freigegeben. Bitte in der Prüftabelle alle Pflichtfelder ergänzen, den Status auf „geprüft“ setzen und speichern bzw. den Statuswechsel ausführen, bis die Position als berechnungsfähig gilt.
            </p>
          </div>
        ) : result ? (
          <div className="mt-4 grid gap-3 text-sm md:grid-cols-2 lg:grid-cols-5">
            <div className="rounded-md border border-zinc-300 bg-zinc-50 px-3 py-2">
              <p className="text-xs uppercase tracking-wide text-zinc-500">Vorabpauschale</p>
              <p className="font-semibold text-zinc-900">{formatEur(result.summe_vorabpauschale_gesamt)} EUR</p>
            </div>
            <div className="rounded-md border border-zinc-300 bg-zinc-50 px-3 py-2">
              <p className="text-xs uppercase tracking-wide text-zinc-500">KeSt gesamt</p>
              <p className="font-semibold text-zinc-900">{formatEur(result.kest_gesamt)} EUR</p>
            </div>
            <div className="rounded-md border border-zinc-300 bg-zinc-50 px-3 py-2">
              <p className="text-xs uppercase tracking-wide text-zinc-500">Soli gesamt</p>
              <p className="font-semibold text-zinc-900">{formatEur(result.soli_gesamt)} EUR</p>
            </div>
            <div className="rounded-md border border-zinc-300 bg-zinc-50 px-3 py-2">
              <p className="text-xs uppercase tracking-wide text-zinc-500">KiSt gesamt</p>
              <p className="font-semibold text-zinc-900">{formatEur(result.kirchensteuer_gesamt)} EUR</p>
            </div>
            <div className="rounded-md border border-zinc-300 bg-zinc-50 px-3 py-2">
              <p className="text-xs uppercase tracking-wide text-zinc-500">Positionen (berechnet)</p>
              <p className="font-semibold text-zinc-900">{calculatedPositionCount}</p>
            </div>
          </div>
        ) : null}
      </section>

      {excludedRows.length > 0 ? (
        <section className="rounded-xl border border-zinc-300 bg-zinc-50 p-4 shadow-sm">
          <h3 className="text-sm font-semibold text-zinc-900">Nicht berechnungsfähige Positionen</h3>
          <ul className="mt-3 space-y-3 text-sm text-zinc-800">
            {excludedRows.map((row) => (
              <li key={row.id} className="rounded-md border border-zinc-200 bg-white px-3 py-2">
                <p className="font-medium text-zinc-900">
                  {row.fundName}{" "}
                  <span className="font-normal text-zinc-600">({row.isin})</span>
                </p>
                <ul className="mt-1 list-inside list-disc text-zinc-700">
                  {row.errors.map((e) => (
                    <li key={e}>{e}</li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {portfolioIds.map((portfolioId) => {
        const meta = portfolioMetaById[portfolioId];
        const rows = displayRowsByDepot[portfolioId] ?? [];
        const depot = result?.depot_ergebnisse.find((entry) => entry.depot_id === portfolioId);
        const hasCalculatedRows = rows.length > 0;
        const isCollapsed = collapsedDepotIds.includes(portfolioId);

        return (
          <section key={portfolioId} className="rounded-xl border border-zinc-300 bg-white shadow-sm">
            <div className="border-b border-zinc-300 bg-zinc-100 px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-sm font-semibold text-zinc-900">
                  {meta?.bankName ?? "Unbekannte Bank"} · Depot {meta?.depotNumber ?? portfolioId}
                </h3>
                <div className="flex items-center gap-2">
                  <p className="text-xs font-medium text-zinc-700">
                    Zwischensumme: {formatEur(depot?.summe_vorabpauschale_depot ?? 0)} EUR
                  </p>
                  <button
                    type="button"
                    onClick={() => toggleDepot(portfolioId)}
                    className="inline-flex items-center gap-1 rounded border border-zinc-300 bg-white px-2 py-1 text-xs text-zinc-700 hover:bg-zinc-100"
                    aria-label={isCollapsed ? "Depot ausklappen" : "Depot einklappen"}
                  >
                    <svg viewBox="0 0 20 20" className="h-3.5 w-3.5" fill="none" aria-hidden="true">
                      {isCollapsed ? (
                        <path d="M6 8l4 4 4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                      ) : (
                        <path d="M6 12l4-4 4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                      )}
                    </svg>
                    {isCollapsed ? "Ausklappen" : "Einklappen"}
                  </button>
                </div>
              </div>
              {!hasEligiblePositions ? null : !hasCalculatedRows ? (
                <p className="mt-1 text-xs text-zinc-700">
                  In diesem Depot sind keine berechnungsfähigen Positionen enthalten.
                </p>
              ) : null}
            </div>
            {!isCollapsed && hasEligiblePositions ? (
            <div className="overflow-x-auto">
              <p className="border-b border-zinc-200 bg-zinc-50 px-4 py-2 text-xs text-zinc-600">
                KeSt und Soli je Fonds werden nicht ausgewiesen; Freistellungsauftrag und Endbesteuerung gelten auf
                Gesamtebene (siehe Karten oben bzw. Abschnitt Gesamtsumme).
              </p>
              <table className="min-w-full divide-y divide-zinc-200 text-sm">
                <thead className="bg-zinc-50 text-left text-zinc-600">
                  <tr>
                    <th className="w-[24%] px-4 py-2 font-medium">Fondsname</th>
                    <th className="w-[14%] px-4 py-2 font-medium">ISIN</th>
                    <th className="w-[14%] px-4 py-2 font-medium">Steuerliche Fondsart</th>
                    <th className="w-[12%] px-4 py-2 text-right font-medium">Vorabpauschale</th>
                    <th className="w-[10%] px-4 py-2 text-right font-medium">Teilfreistellung</th>
                    <th className="w-[26%] px-4 py-2 text-right font-medium">Steuerpflichtig (Pos., nach TF)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200">
                  {rows.map((row, index) => (
                    <tr
                      key={row.id}
                      className={`${index % 2 === 1 ? "bg-zinc-50/60" : "bg-white"} text-zinc-700`}
                    >
                      <td className="px-4 py-2">{row.fundName}</td>
                      <td className="px-4 py-2">{row.isin}</td>
                      <td className="px-4 py-2">{row.taxFundTypeLabel}</td>
                      <td className="px-4 py-2 text-right">{`${formatEur(row.vorabpauschale ?? 0)} EUR`}</td>
                      <td className="px-4 py-2 text-right">
                        {row.teilfreistellung === null
                          ? "—"
                          : `${(row.teilfreistellung * 100).toFixed(0)} %`}
                      </td>
                      <td className="px-4 py-2 text-right">{`${formatEur(row.steuerpflichtig ?? 0)} EUR`}</td>
                    </tr>
                  ))}
                  {rows.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-4 text-sm text-zinc-500">
                        Keine berechnungsfähigen Fondspositionen in diesem Depot.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
                {hasCalculatedRows ? (
                <tfoot className="border-t border-zinc-300 bg-zinc-50">
                  <tr>
                    <td className="px-4 py-2 text-right font-semibold text-zinc-900" colSpan={3}>
                      Zwischensumme Depot
                    </td>
                    <td className="px-4 py-2 text-right font-semibold text-zinc-900">
                      {formatEur(depot?.summe_vorabpauschale_depot ?? 0)} EUR
                    </td>
                    <td className="px-4 py-2 text-right text-zinc-500">—</td>
                    <td className="px-4 py-2 text-right font-semibold text-zinc-900">
                      {formatEur(depot?.summe_steuerpflichtig_depot ?? 0)} EUR
                    </td>
                  </tr>
                </tfoot>
                ) : null}
              </table>
            </div>
            ) : null}
          </section>
        );
      })}

      {result && hasEligiblePositions ? (
        <section className="rounded-xl border border-zinc-900 bg-zinc-50 p-5 shadow-sm">
          <h3 className="text-base font-semibold text-zinc-900">Gesamtsumme Steuerjahr {year}</h3>
          <div className="mt-3 grid gap-2 text-sm text-zinc-800 sm:grid-cols-2 lg:grid-cols-3">
            <p><span className="font-medium">Vorabpauschale:</span> {formatEur(result.summe_vorabpauschale_gesamt)} EUR</p>
            <p>
              <span className="font-medium">Steuerpflichtig (nach Freistellungsauftrag):</span>{" "}
              {formatEur(result.steuerpflichtig_nach_freistellung)} EUR
            </p>
            <p className="text-zinc-600">
              <span className="font-medium">Summe steuerpflichtig (Pos., vor Freistellungsauftrag):</span>{" "}
              {formatEur(result.summe_steuerpflichtig_vor_freistellung)} EUR
            </p>
            <p><span className="font-medium">KeSt:</span> {formatEur(result.kest_gesamt)} EUR</p>
            <p><span className="font-medium">Soli:</span> {formatEur(result.soli_gesamt)} EUR</p>
            <p><span className="font-medium">KiSt:</span> {formatEur(result.kirchensteuer_gesamt)} EUR</p>
            <p><span className="font-medium">Gesamtsteuer:</span> {formatEur(result.summe_steuer_gesamt)} EUR</p>
          </div>
        </section>
      ) : null}
    </div>
  );
}
