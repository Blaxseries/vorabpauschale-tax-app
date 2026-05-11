"use client";

import { useEffect, useMemo, useState } from "react";

import {
  type FondsPosition,
  type MandantErgebnis,
  calculateMandant,
  getTeilfreistellungssatz,
} from "@/lib/calculate-vorabpauschale";
import { supabase } from "@/lib/supabase";

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

function toFundType(value: string): FondsPosition["fondsart"] {
  const normalized = value.toLowerCase();
  if (normalized.includes("aktien")) return "aktien";
  if (normalized.includes("misch")) return "misch";
  if (normalized.includes("immobilien") && normalized.includes("ausland")) return "immobilien_ausland";
  if (normalized.includes("immobilien")) return "immobilien";
  return "sonstige";
}

function formatEur(value: number): string {
  return value.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

type DisplayRow = {
  id: string;
  fundName: string;
  isin: string;
  fundType: string;
  teilfreistellung: number | null;
  vorabpauschale: number | null;
  steuerpflichtig: number | null;
  kest: number | null;
  soli: number | null;
  skipped: boolean;
  skipReason: string | null;
};

export function CalculationSummary({ clientId, year }: CalculationSummaryProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [result, setResult] = useState<MandantErgebnis | null>(null);
  const [portfolioMetaById, setPortfolioMetaById] = useState<Record<string, PortfolioMeta>>({});
  const [portfolioIds, setPortfolioIds] = useState<string[]>([]);
  const [displayRowsByDepot, setDisplayRowsByDepot] = useState<Record<string, DisplayRow[]>>({});
  const [collapsedDepotIds, setCollapsedDepotIds] = useState<string[]>([]);

  useEffect(() => {
    let isActive = true;

    async function loadCalculationData() {
      setIsLoading(true);
      setErrorMessage(null);
      setWarnings([]);

      const { data: taxYear, error: taxYearError } = await supabase
        .from("tax_years")
        .select("id")
        .eq("client_id", clientId)
        .eq("year", Number(year))
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

      const portfolioIds = portfolios.map((portfolio) => portfolio.id);
      const metaMap: Record<string, PortfolioMeta> = {};
      for (const portfolio of portfolios) {
        metaMap[portfolio.id] = {
          id: portfolio.id,
          bankName: portfolio.bank_name || "Unbekannte Bank",
          depotNumber: portfolio.account_number || "—",
        };
      }
      setPortfolioMetaById(metaMap);
      setPortfolioIds(portfolios.map((portfolio) => portfolio.id));

      if (portfolioIds.length === 0) {
        setResult(
          calculateMandant([], 0),
        );
        setIsLoading(false);
        return;
      }

      const { data: fundPositions, error: fundPositionsError } = await supabase
        .from("fund_positions")
        .select("*")
        .in("portfolio_id", portfolioIds)
        .returns<Record<string, unknown>[]>();

      if (!isActive) return;
      if (fundPositionsError) {
        setErrorMessage("Fondspositionen konnten nicht geladen werden.");
        setIsLoading(false);
        return;
      }

      const depotsForCalculation: Array<{ depot_id: string; positionen: FondsPosition[] }> = [];
      const localWarnings: string[] = [];
      const rawDisplayRowsByDepot: Record<string, DisplayRow[]> = {};

      for (const portfolioId of portfolioIds) {
        const positions = fundPositions.filter((position) => asString(position.portfolio_id) === portfolioId);
        const mapped: FondsPosition[] = [];
        rawDisplayRowsByDepot[portfolioId] = [];

        for (const raw of positions) {
          const positionId = asString(raw.id) || crypto.randomUUID();
          const fundName = asString(raw.fund_name) || "Unbenannter Fonds";
          const isin = asString(raw.isin);
          const currency = asString(raw.currency) || "EUR";
          const startPrice = asNumber(raw.price_start);
          const endPrice = asNumber(raw.price_end);
          const unitsEnd = asNumber(raw.units_end);
          const unitsStart = asNumber(raw.units_start);
          const quantity = unitsStart ?? unitsEnd;

          const taxFundTypeText =
            asString(raw.tax_fund_type) || asString(raw.fondsart) || "sonstige";

          const pushSkipped = (reason: string) => {
            console.warn("[Berechnung] Position übersprungen", {
              portfolio_id: portfolioId,
              position_id: positionId,
              fund_name: fundName,
              isin: isin || null,
              reason,
            });
            localWarnings.push(`${fundName} (${isin || "ohne ISIN"}): ${reason}`);
            rawDisplayRowsByDepot[portfolioId].push({
              id: positionId,
              fundName,
              isin: isin || "—",
              fundType: taxFundTypeText,
              teilfreistellung: null,
              vorabpauschale: null,
              steuerpflichtig: null,
              kest: null,
              soli: null,
              skipped: true,
              skipReason: reason,
            });
          };

          if (!isin) {
            pushSkipped("ISIN fehlt.");
            continue;
          }
          if (unitsEnd === null) {
            pushSkipped("Anteile 31.12. fehlen.");
            continue;
          }
          if (startPrice === null) {
            pushSkipped("NAV 01.01. fehlt.");
            continue;
          }
          if (endPrice === null) {
            pushSkipped("NAV 31.12. fehlt.");
            continue;
          }
          if (quantity === null) {
            pushSkipped("Anteile fehlen.");
            continue;
          }

          const distributions = asNumber(raw.distributions) ?? 0;
          const ezb =
            asNumber(raw.ezb_kurs_jahresende) ??
            asNumber(raw.ezb_kurs) ??
            asNumber(raw.ezb_rate) ??
            1;
          const teilfreistellungRaw = asNumber(raw.partial_exemption_rate);
          const fondsart = toFundType(taxFundTypeText);
          const teilfreistellung =
            teilfreistellungRaw !== null ? Math.max(0, Math.min(1, teilfreistellungRaw)) : getTeilfreistellungssatz(fondsart);

          mapped.push({
            depot_id: portfolioId,
            isin,
            fondsname: fundName,
            fondsart,
            teilfreistellungssatz: teilfreistellung,
            anzahl_anteile: quantity,
            kurs_jahresanfang: startPrice,
            kurs_jahresende: endPrice,
            ausschuettungen: distributions,
            waehrung: currency,
            ezb_kurs: ezb,
            kauf_datum: asString(raw.kauf_datum) || asString(raw.purchase_date) || null,
            verkauf_datum: asString(raw.verkauf_datum) || null,
            ist_verkaufsjahr: false,
            steuerjahr: Number(year),
          });
        }

        depotsForCalculation.push({ depot_id: portfolioId, positionen: mapped });
      }

      const mandantResult = calculateMandant(depotsForCalculation, 0);
      const calculatedDisplayRowsByDepot: Record<string, DisplayRow[]> = {};
      for (const depot of mandantResult.depot_ergebnisse) {
        calculatedDisplayRowsByDepot[depot.depot_id] = depot.fonds_ergebnisse.map((entry) => ({
          id: `${depot.depot_id}-${entry.isin}-${entry.fondsname}`,
          fundName: entry.fondsname,
          isin: entry.isin,
          fundType: "—",
          teilfreistellung: entry.teilfreistellungssatz,
          vorabpauschale: entry.vorabpauschale,
          steuerpflichtig: entry.steuerpflichtig,
          kest: entry.kest,
          soli: entry.soli,
          skipped: false,
          skipReason: null,
        }));
      }

      const mergedRowsByDepot: Record<string, DisplayRow[]> = {};
      for (const portfolioId of portfolioIds) {
        const validRows = calculatedDisplayRowsByDepot[portfolioId] ?? [];
        const skippedRows = rawDisplayRowsByDepot[portfolioId] ?? [];
        mergedRowsByDepot[portfolioId] = [...validRows, ...skippedRows];
      }

      setWarnings(localWarnings);
      setResult(mandantResult);
      setDisplayRowsByDepot(mergedRowsByDepot);
      setIsLoading(false);
    }

    void loadCalculationData();
    return () => {
      isActive = false;
    };
  }, [clientId, year]);

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
          Berechnungsübersicht für geprüfte Fondspositionen im Steuerjahr {year}.
        </p>
        {isLoading ? (
          <p className="mt-4 text-sm text-zinc-600">Berechnung wird vorbereitet...</p>
        ) : errorMessage ? (
          <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {errorMessage}
          </p>
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
              <p className="text-xs uppercase tracking-wide text-zinc-500">Positionen</p>
              <p className="font-semibold text-zinc-900">{calculatedPositionCount}</p>
              <p className="text-xs text-zinc-500">Übersprungen: {warnings.length}</p>
            </div>
          </div>
        ) : null}
      </section>

      {warnings.length > 0 ? (
        <section className="rounded-xl border border-zinc-300 bg-zinc-50 p-4 shadow-sm">
          <h3 className="text-sm font-semibold text-zinc-900">Übersprungene Positionen</h3>
          <ul className="mt-2 space-y-1 text-sm text-zinc-700">
            {warnings.map((warning) => (
              <li key={warning}>- {warning}</li>
            ))}
          </ul>
        </section>
      ) : null}

      {portfolioIds.map((portfolioId) => {
        const meta = portfolioMetaById[portfolioId];
        const rows = displayRowsByDepot[portfolioId] ?? [];
        const depot = result?.depot_ergebnisse.find((entry) => entry.depot_id === portfolioId);
        const hasCalculatedRows = rows.some((row) => !row.skipped);
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
              {!hasCalculatedRows ? (
                <p className="mt-1 text-xs text-zinc-700">
                  ⚠ Keine berechenbaren Positionen vorhanden (alle Positionen übersprungen).
                </p>
              ) : null}
            </div>
            {!isCollapsed ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-zinc-200 text-sm">
                <thead className="bg-zinc-50 text-left text-zinc-600">
                  <tr>
                    <th className="w-[24%] px-4 py-2 font-medium">Fondsname</th>
                    <th className="w-[14%] px-4 py-2 font-medium">ISIN</th>
                    <th className="w-[14%] px-4 py-2 font-medium">Fondsart</th>
                    <th className="w-[12%] px-4 py-2 text-right font-medium">Vorabpauschale</th>
                    <th className="w-[10%] px-4 py-2 text-right font-medium">Teilfreistellung</th>
                    <th className="w-[12%] px-4 py-2 text-right font-medium">Steuerpflichtig</th>
                    <th className="w-[7%] px-4 py-2 text-right font-medium">KeSt</th>
                    <th className="w-[7%] px-4 py-2 text-right font-medium">Soli</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200">
                  {rows.map((row, index) => (
                    <tr
                      key={row.id}
                      className={`${index % 2 === 1 ? "bg-zinc-50/60" : "bg-white"} ${
                        row.skipped ? "text-zinc-500" : "text-zinc-700"
                      }`}
                    >
                      <td className="px-4 py-2">{row.fundName}</td>
                      <td className="px-4 py-2">{row.isin}</td>
                      <td className="px-4 py-2">
                        {row.fundType === "—" || row.fundType.trim().length === 0 ? (
                          <span className="text-zinc-400">Nicht klassifiziert</span>
                        ) : (
                          row.fundType
                        )}
                      </td>
                      <td className="px-4 py-2 text-right">
                        {row.skipped ? `⚠ ${row.skipReason}` : `${formatEur(row.vorabpauschale ?? 0)} EUR`}
                      </td>
                      <td className="px-4 py-2 text-right">
                        {row.teilfreistellung === null || row.fundType === "—" || row.fundType.trim().length === 0
                          ? "—"
                          : `${(row.teilfreistellung * 100).toFixed(0)} %`}
                      </td>
                      <td className="px-4 py-2 text-right">{row.steuerpflichtig === null ? "—" : `${formatEur(row.steuerpflichtig)} EUR`}</td>
                      <td className="px-4 py-2 text-right">{row.kest === null ? "—" : `${formatEur(row.kest)} EUR`}</td>
                      <td className="px-4 py-2 text-right">{row.soli === null ? "—" : `${formatEur(row.soli)} EUR`}</td>
                    </tr>
                  ))}
                  {rows.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-4 text-sm text-zinc-500">
                        Keine Fondspositionen in diesem Depot gefunden.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
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
                    <td className="px-4 py-2 text-right font-semibold text-zinc-900">
                      {formatEur(depot?.summe_kest_depot ?? 0)} EUR
                    </td>
                    <td className="px-4 py-2 text-right font-semibold text-zinc-900">
                      {formatEur(depot?.summe_soli_depot ?? 0)} EUR
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
            ) : null}
          </section>
        );
      })}

      {result ? (
        <section className="rounded-xl border border-zinc-900 bg-zinc-50 p-5 shadow-sm">
          <h3 className="text-base font-semibold text-zinc-900">Gesamtsumme Steuerjahr {year}</h3>
          <div className="mt-3 grid gap-2 text-sm text-zinc-800 md:grid-cols-2 lg:grid-cols-5">
            <p><span className="font-medium">Vorabpauschale:</span> {formatEur(result.summe_vorabpauschale_gesamt)} EUR</p>
            <p><span className="font-medium">Steuerpflichtig:</span> {formatEur(result.steuerpflichtig_nach_freistellung)} EUR</p>
            <p><span className="font-medium">KeSt:</span> {formatEur(result.kest_gesamt)} EUR</p>
            <p><span className="font-medium">Soli:</span> {formatEur(result.soli_gesamt)} EUR</p>
            <p><span className="font-medium">KiSt:</span> {formatEur(result.kirchensteuer_gesamt)} EUR</p>
          </div>
        </section>
      ) : null}
    </div>
  );
}
