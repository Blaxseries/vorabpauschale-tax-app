"use client";

import { Fragment, useMemo, useState } from "react";

type SourceType = "document" | "api" | "manual" | "calculated" | "unknown";
type Confidence = "high" | "medium" | "low";
type FieldReviewStatus = "ok" | "offen" | "warnung";
type RowReviewStatus = "in Prüfung" | "geprüft" | "manuell korrigiert";
type MovementSummary =
  | "keine"
  | "erstmals Vorjahr"
  | "unterjähriger Kauf"
  | "mehrere Käufe"
  | "Verkauf"
  | "Käufe und Verkäufe"
  | "unklar";

type ReviewDetailField = {
  key: string;
  field: string;
  value: string;
  unit: string;
  sourceType: SourceType;
  confidence: Confidence;
  manuallyChanged: boolean;
  reviewStatus: FieldReviewStatus;
};

type ReviewPosition = {
  id: string;
  reviewStatus: RowReviewStatus;
  fundName: string;
  isin: string;
  currency: string;
  unitsStart: number | null;
  movement: MovementSummary;
  unitChange: number | null;
  positionValueStart: number | null;
  navStart: number | null;
  fxStart: number | null;
  valueStartEur: number | null;
  unitsEnd: number | null;
  positionValueEnd: number | null;
  navEnd: number | null;
  fxEnd: number | null;
  valueEndEur: number | null;
  hint: string;
  sourceSummary: {
    units: SourceType;
    nav: SourceType;
    fx: SourceType;
    eur: SourceType;
  };
  productType: string;
  taxFundType: string;
  partialExemption: string;
  distributions: string;
  withholdingTax: string;
  documentSource: string;
  apiSource: string;
  fxSource: string;
  lastChangedAt: string;
  details: ReviewDetailField[];
};

type PortfolioReviewBlock = {
  id: string;
  bank: string;
  label: string;
  openingBasis: "Vorjahresstatement" | "API" | "abgeleitet" | "fehlt";
  closingBasis: "Jahresstatement" | "fehlt";
  transactionsStatus: "vorhanden" | "nicht vorhanden" | "unklar";
  distributionsStatus: "Report vorhanden" | "nicht vorhanden" | "unklar";
  reviewStatus: "in Prüfung" | "teilweise geprüft" | "geprüft";
  positions: ReviewPosition[];
};

type ReviewTableWorkspaceProps = {
  year: string;
};

const fieldStatusLabel: Record<FieldReviewStatus, string> = {
  ok: "Geprüft",
  offen: "Offen",
  warnung: "Hinweis",
};

const confidenceLabel: Record<Confidence, string> = {
  high: "hoch",
  medium: "mittel",
  low: "niedrig",
};

const sourceLabel: Record<SourceType, string> = {
  document: "Statement",
  api: "API",
  manual: "manuell",
  calculated: "abgeleitet",
  unknown: "fehlt",
};

const initialBlocks: PortfolioReviewBlock[] = [
  {
    id: "pf-ubs-2025",
    bank: "UBS",
    label: "DEP-9104218",
    openingBasis: "Vorjahresstatement",
    closingBasis: "Jahresstatement",
    transactionsStatus: "vorhanden",
    distributionsStatus: "nicht vorhanden",
    reviewStatus: "in Prüfung",
    positions: [
      {
        id: "pos-001",
        reviewStatus: "in Prüfung",
        fundName: "Global Equity Opportunities",
        isin: "LU1234567890",
        currency: "USD",
        unitsStart: 180.5,
        movement: "unterjähriger Kauf",
        unitChange: 14.3,
        positionValueStart: 18820.42,
        navStart: 104.27,
        fxStart: 0.915,
        valueStartEur: 17240.35,
        unitsEnd: 194.8,
        positionValueEnd: 20110.54,
        navEnd: null,
        fxEnd: null,
        valueEndEur: null,
        hint: "NAV 31.12. fehlt; FX 31.12. fehlt",
        sourceSummary: { units: "document", nav: "api", fx: "unknown", eur: "unknown" },
        productType: "ETF",
        taxFundType: "Aktienfonds",
        partialExemption: "30 %",
        distributions: "245,31 EUR",
        withholdingTax: "nicht verfügbar",
        documentSource: "UBS Jahresstatement 2025",
        apiSource: "Morningstar NAV API",
        fxSource: "EZB Referenzkurse",
        lastChangedAt: "27.04.2026 16:11",
        details: [
          {
            key: "1",
            field: "Fondsname",
            value: "Global Equity Opportunities",
            unit: "-",
            sourceType: "document",
            confidence: "high",
            manuallyChanged: false,
            reviewStatus: "ok",
          },
          {
            key: "2",
            field: "ISIN",
            value: "LU1234567890",
            unit: "-",
            sourceType: "document",
            confidence: "high",
            manuallyChanged: false,
            reviewStatus: "ok",
          },
        ],
      },
      {
        id: "pos-002",
        reviewStatus: "geprüft",
        fundName: "Euro Bonds Income",
        isin: "IE0098765432",
        currency: "EUR",
        unitsStart: 320,
        movement: "keine",
        unitChange: 0,
        positionValueStart: 32145.22,
        navStart: 100.45,
        fxStart: 1,
        valueStartEur: 32145.22,
        unitsEnd: 320,
        positionValueEnd: 32780.4,
        navEnd: 102.44,
        fxEnd: 1,
        valueEndEur: 32780.4,
        hint: "",
        sourceSummary: { units: "document", nav: "api", fx: "calculated", eur: "calculated" },
        productType: "Fonds",
        taxFundType: "Rentenfonds",
        partialExemption: "0 %",
        distributions: "112,40 EUR",
        withholdingTax: "nicht relevant",
        documentSource: "UBS Jahresstatement 2025",
        apiSource: "Morningstar NAV API",
        fxSource: "nicht relevant",
        lastChangedAt: "26.04.2026 10:05",
        details: [
          {
            key: "1",
            field: "Fondsname",
            value: "Euro Bonds Income",
            unit: "-",
            sourceType: "document",
            confidence: "high",
            manuallyChanged: false,
            reviewStatus: "ok",
          },
        ],
      },
    ],
  },
  {
    id: "pf-db-2025",
    bank: "Deutsche Bank",
    label: "DEP-7781001",
    openingBasis: "abgeleitet",
    closingBasis: "Jahresstatement",
    transactionsStatus: "vorhanden",
    distributionsStatus: "Report vorhanden",
    reviewStatus: "teilweise geprüft",
    positions: [
      {
        id: "pos-003",
        reviewStatus: "in Prüfung",
        fundName: "MSCI World ETF",
        isin: "IE00B4L5Y983",
        currency: "USD",
        unitsStart: 520.2,
        movement: "mehrere Käufe",
        unitChange: 20,
        positionValueStart: 40810.43,
        navStart: 78.45,
        fxStart: 0.929,
        valueStartEur: 37895.12,
        unitsEnd: 540.2,
        positionValueEnd: 45120.91,
        navEnd: 83.52,
        fxEnd: null,
        valueEndEur: null,
        hint: "FX 31.12. fehlt; mehrere Käufe, Tranchendaten prüfen",
        sourceSummary: { units: "document", nav: "api", fx: "unknown", eur: "unknown" },
        productType: "ETF",
        taxFundType: "Aktienfonds",
        partialExemption: "30 %",
        distributions: "unklar",
        withholdingTax: "nicht geprüft",
        documentSource: "DB Transaktionsreport 2025",
        apiSource: "Morningstar NAV API",
        fxSource: "EZB Referenzkurse",
        lastChangedAt: "27.04.2026 15:42",
        details: [
          {
            key: "1",
            field: "Ausschüttungen brutto",
            value: "unklar",
            unit: "-",
            sourceType: "document",
            confidence: "low",
            manuallyChanged: false,
            reviewStatus: "offen",
          },
        ],
      },
    ],
  },
];

function formatNumber(value: number | null): string {
  if (value === null) return "—";
  return value.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatAmount(value: number | null): string {
  if (value === null) return "—";
  return value.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatUnits(value: number | null): string {
  if (value === null) return "—";
  const asText = value.toString();
  const decimals = asText.includes(".") ? asText.split(".")[1].length : 0;
  const precision = Math.min(4, Math.max(2, decimals));
  return value.toLocaleString("de-DE", {
    minimumFractionDigits: precision,
    maximumFractionDigits: precision,
  });
}

function isMovementAttention(value: MovementSummary): boolean {
  return value === "mehrere Käufe" || value === "Käufe und Verkäufe" || value === "unklar";
}

export function ReviewTableWorkspace({ year }: ReviewTableWorkspaceProps) {
  const [blocks, setBlocks] = useState<PortfolioReviewBlock[]>(initialBlocks);
  const [expandedPositionIds, setExpandedPositionIds] = useState<string[]>([]);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [collapsedBlockIds, setCollapsedBlockIds] = useState<string[]>([]);

  const summary = useMemo(() => {
    const allPositions = blocks.flatMap((block) => block.positions);
    const openCount = allPositions.filter((position) => position.hint.trim().length > 0).length;
    return {
      depotCount: blocks.length,
      positionCount: allPositions.length,
      reviewed: allPositions.filter((position) => position.reviewStatus === "geprüft").length,
      open: openCount,
    };
  }, [blocks]);

  function toggleExpanded(positionId: string) {
    setExpandedPositionIds((current) =>
      current.includes(positionId)
        ? current.filter((id) => id !== positionId)
        : [...current, positionId],
    );
  }

  function updateRowStatus(positionId: string, status: RowReviewStatus) {
    setBlocks((current) =>
      current.map((block) => ({
        ...block,
        positions: block.positions.map((position) =>
          position.id === positionId ? { ...position, reviewStatus: status } : position,
        ),
      })),
    );
  }

  function markManualCorrection(positionId: string) {
    setBlocks((current) =>
      current.map((block) => ({
        ...block,
        positions: block.positions.map((position) =>
          position.id === positionId
            ? {
                ...position,
                reviewStatus: "manuell korrigiert",
                hint: "manuell zu prüfen",
                details: position.details.map((field, index) =>
                  index === 0 ? { ...field, manuallyChanged: true, sourceType: "manual" } : field,
                ),
              }
            : position,
        ),
      })),
    );
  }

  function toggleBlock(blockId: string) {
    setCollapsedBlockIds((current) =>
      current.includes(blockId)
        ? current.filter((id) => id !== blockId)
        : [...current, blockId],
    );
  }

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className="text-2xl font-semibold text-zinc-900">Prüftabelle Steuerjahr {year}</h2>
        <p className="mt-2 text-sm text-zinc-600">
          Fachliche Gegenprüfung der extrahierten und angereicherten Depotdaten vor der
          Berechnung.
        </p>
        <div className="mt-4 grid gap-2 text-sm text-zinc-700 md:grid-cols-4">
          <p>
            <span className="font-medium text-zinc-900">Depots:</span> {summary.depotCount}
          </p>
          <p>
            <span className="font-medium text-zinc-900">Fondspositionen:</span>{" "}
            {summary.positionCount}
          </p>
          <p>
            <span className="font-medium text-zinc-900">Geprüft:</span> {summary.reviewed}
          </p>
          <p>
            <span className="font-medium text-zinc-900">Offene Prüfung:</span> {summary.open}
          </p>
        </div>
      </section>

      {blocks.map((block) => {
        const openItems = block.positions.filter((position) => position.hint.trim().length > 0).length;
        const isCollapsed = collapsedBlockIds.includes(block.id);
        return (
          <section
            key={block.id}
            className="rounded-xl border border-zinc-300 bg-white p-4 shadow-sm"
          >
            <div className="border-b border-zinc-200 pb-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-zinc-900">
                  {block.bank} · {block.label} · Steuerjahr {year}
                </p>
                <button
                  type="button"
                  onClick={() => toggleBlock(block.id)}
                  className="inline-flex items-center gap-1 rounded border border-zinc-300 px-2 py-1 text-xs text-zinc-700 hover:bg-zinc-100"
                >
                  <svg viewBox="0 0 20 20" className="h-3.5 w-3.5" fill="none" aria-hidden="true">
                    {isCollapsed ? (
                      <path
                        d="M5 12l5-5 5 5"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    ) : (
                      <path
                        d="M5 8l5 5 5-5"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    )}
                  </svg>
                  {isCollapsed ? "Tabelle ausklappen" : "Tabelle einklappen"}
                </button>
              </div>
              <div className="mt-2 grid gap-1 text-xs text-zinc-600 md:grid-cols-2 lg:grid-cols-6">
                <p>Anfangsbestand: {block.openingBasis}</p>
                <p>Endbestand: {block.closingBasis}</p>
                <p>Transaktionen: {block.transactionsStatus}</p>
                <p>Ausschüttungen: {block.distributionsStatus}</p>
                <p>Status: {block.reviewStatus}</p>
                <p className={openItems > 0 ? "text-amber-700" : "text-zinc-600"}>
                  Offene Werte: {openItems}
                </p>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <button type="button" className="rounded border border-zinc-300 px-2 py-1 text-xs text-zinc-700 hover:bg-zinc-100">Daten aktualisieren</button>
                <button type="button" className="rounded border border-zinc-300 px-2 py-1 text-xs text-zinc-700 hover:bg-zinc-100">Depot prüfen</button>
                <button type="button" className="rounded border border-zinc-300 px-2 py-1 text-xs text-zinc-700 hover:bg-zinc-100">Export Prüftabelle</button>
              </div>
            </div>

            {!isCollapsed ? (
              <div className="mt-3 overflow-x-auto">
              <table className="min-w-[1800px] divide-y divide-zinc-200 text-sm">
                <thead className="bg-zinc-50 text-left text-zinc-600">
                  <tr>
                    <th colSpan={3} className="px-3 py-2 text-xs font-semibold uppercase tracking-wide">
                      Fondsdaten
                    </th>
                    <th colSpan={4} className="px-3 py-2 text-xs font-semibold uppercase tracking-wide">
                      Bestand
                    </th>
                    <th colSpan={4} className="px-3 py-2 text-xs font-semibold uppercase tracking-wide">
                      Jahresbeginn
                    </th>
                    <th colSpan={4} className="px-3 py-2 text-xs font-semibold uppercase tracking-wide">
                      Jahresende
                    </th>
                    <th colSpan={2} className="px-3 py-2 text-xs font-semibold uppercase tracking-wide">
                      Prüfung
                    </th>
                  </tr>
                  <tr>
                    <th className="sticky left-0 z-10 bg-zinc-50 px-3 py-2 font-medium">Fondsname</th>
                    <th className="sticky left-[220px] z-10 bg-zinc-50 px-3 py-2 font-medium">ISIN</th>
                    <th className="sticky left-[360px] z-10 bg-zinc-50 px-3 py-2 font-medium">Währung</th>
                    <th className="px-3 py-2 font-medium">Anteile 01.01.</th>
                    <th className="px-3 py-2 font-medium">Erwerb/Bewegung im Jahr</th>
                    <th className="px-3 py-2 font-medium">Veränderung Anteile</th>
                    <th className="px-3 py-2 font-medium">Anteile 31.12.</th>
                    <th className="px-3 py-2 font-medium">NAV je Anteil 01.01.</th>
                    <th className="px-3 py-2 font-medium">Wert 01.01. FW</th>
                    <th className="px-3 py-2 font-medium">FX 01.01.</th>
                    <th className="px-3 py-2 font-medium">Wert 01.01. EUR</th>
                    <th className="px-3 py-2 font-medium">NAV je Anteil 31.12.</th>
                    <th className="px-3 py-2 font-medium">Wert 31.12. FW</th>
                    <th className="px-3 py-2 font-medium">FX 31.12.</th>
                    <th className="px-3 py-2 font-medium">Wert 31.12. EUR</th>
                    <th className="px-3 py-2 font-medium">Prüfhinweis</th>
                    <th className="px-3 py-2 font-medium">Aktion</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200">
                  {block.positions.map((position) => {
                    const isExpanded = expandedPositionIds.includes(position.id);
                    return (
                      <Fragment key={position.id}>
                        <tr className="align-top text-zinc-700">
                          <td className="sticky left-0 z-[1] w-[220px] bg-white px-3 py-3 font-medium text-zinc-900">
                            <p>{position.fundName}</p>
                            <p className="mt-0.5 text-xs text-zinc-500">{position.reviewStatus}</p>
                          </td>
                          <td className="sticky left-[220px] z-[1] w-[140px] bg-white px-3 py-3">{position.isin || "—"}</td>
                          <td className="sticky left-[360px] z-[1] w-[90px] bg-white px-3 py-3">{position.currency}</td>
                          <td className="px-3 py-3 text-right">
                            <div>{formatUnits(position.unitsStart)}</div>
                            <div className="text-xs text-zinc-500">{sourceLabel[position.sourceSummary.units]}</div>
                          </td>
                          <td className={`px-3 py-3 ${isMovementAttention(position.movement) ? "text-amber-700" : "text-zinc-700"}`}>{position.movement}</td>
                          <td className="px-3 py-3 text-right">{formatUnits(position.unitChange)}</td>
                          <td className="px-3 py-3 text-right">{formatUnits(position.unitsEnd)}</td>
                          <td className="px-3 py-3 text-right">
                            <div>{formatAmount(position.navStart)}</div>
                            <div className="text-xs text-zinc-500">{sourceLabel[position.sourceSummary.nav]}</div>
                          </td>
                          <td className="px-3 py-3 text-right">{formatAmount(position.positionValueStart)}</td>
                          <td className="px-3 py-3 text-right">
                            <div>{formatNumber(position.fxStart)}</div>
                            <div className="text-xs text-zinc-500">{position.fxStart === null ? "fehlt" : "FX/API"}</div>
                          </td>
                          <td className="px-3 py-3 text-right">
                            <div>{formatAmount(position.valueStartEur)}</div>
                            <div className="text-xs text-zinc-500">{sourceLabel[position.sourceSummary.eur]}</div>
                          </td>
                          <td className="px-3 py-3 text-right">
                            <div>{formatAmount(position.navEnd)}</div>
                            <div className="text-xs text-zinc-500">{sourceLabel[position.sourceSummary.nav]}</div>
                          </td>
                          <td className="px-3 py-3 text-right">{formatAmount(position.positionValueEnd)}</td>
                          <td className="px-3 py-3 text-right">
                            <div>{formatNumber(position.fxEnd)}</div>
                            <div className="text-xs text-zinc-500">{position.fxEnd === null ? "fehlt" : "FX/API"}</div>
                          </td>
                          <td className="px-3 py-3 text-right">
                            <div>{formatAmount(position.valueEndEur)}</div>
                            <div className="text-xs text-zinc-500">{sourceLabel[position.sourceSummary.eur]}</div>
                          </td>
                          <td className="px-3 py-3">
                            {position.hint ? (
                              <div className="group relative inline-flex items-center">
                                <span
                                  className={`inline-flex h-5 w-5 items-center justify-center rounded-full ${
                                    position.hint.includes("fehlt")
                                      ? "bg-red-100 text-red-700"
                                      : "bg-amber-100 text-amber-700"
                                  }`}
                                  aria-label="Prüfhinweis vorhanden"
                                >
                                  <svg
                                    viewBox="0 0 20 20"
                                    className="h-3.5 w-3.5"
                                    fill="none"
                                    aria-hidden="true"
                                  >
                                    <path
                                      d="M10 3l7 13H3l7-13z"
                                      stroke="currentColor"
                                      strokeWidth="1.6"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                    />
                                    <path
                                      d="M10 7v4"
                                      stroke="currentColor"
                                      strokeWidth="1.6"
                                      strokeLinecap="round"
                                    />
                                    <circle cx="10" cy="13.5" r="0.8" fill="currentColor" />
                                  </svg>
                                </span>
                                <div className="pointer-events-none absolute left-7 top-1/2 z-20 hidden w-72 -translate-y-1/2 rounded-md border border-zinc-300 bg-white px-3 py-2 text-xs text-zinc-700 shadow-md group-hover:block">
                                  {position.hint}
                                </div>
                              </div>
                            ) : (
                              <span className="text-xs text-zinc-500">—</span>
                            )}
                          </td>
                          <td className="px-3 py-3">
                            <div className="relative flex flex-nowrap items-center gap-1">
                              <button type="button" onClick={() => toggleExpanded(position.id)} className="rounded-md border border-zinc-300 px-2 py-1 text-xs hover:bg-zinc-100">
                                <span className="inline-flex items-center gap-1">
                                  <svg viewBox="0 0 20 20" className="h-3.5 w-3.5" fill="none" aria-hidden="true">
                                    <path
                                      d="M3 10s2.8-4 7-4 7 4 7 4-2.8 4-7 4-7-4-7-4z"
                                      stroke="currentColor"
                                      strokeWidth="1.6"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                    />
                                    <circle cx="10" cy="10" r="1.8" stroke="currentColor" strokeWidth="1.6" />
                                  </svg>
                                  Details
                                </span>
                              </button>
                              <button type="button" onClick={() => setOpenMenuId((current) => (current === position.id ? null : position.id))} className="rounded-md border border-zinc-300 px-2 py-1 text-xs hover:bg-zinc-100">
                                ⋯
                              </button>
                              {openMenuId === position.id ? (
                                <div className="absolute right-0 top-7 z-10 rounded-md border border-zinc-200 bg-white p-1 shadow-md">
                                  <button type="button" onClick={() => { markManualCorrection(position.id); setOpenMenuId(null); }} className="block w-full rounded px-2 py-1 text-left text-xs text-zinc-700 hover:bg-zinc-100">Wert korrigieren</button>
                                  <button type="button" onClick={() => { updateRowStatus(position.id, "geprüft"); setOpenMenuId(null); }} className="block w-full rounded px-2 py-1 text-left text-xs text-zinc-700 hover:bg-zinc-100">Zeile als geprüft markieren</button>
                                  <button type="button" onClick={() => { updateRowStatus(position.id, "in Prüfung"); setOpenMenuId(null); }} className="block w-full rounded px-2 py-1 text-left text-xs text-zinc-700 hover:bg-zinc-100">Prüfung zurücknehmen</button>
                                  <button type="button" onClick={() => setOpenMenuId(null)} className="block w-full rounded px-2 py-1 text-left text-xs text-zinc-700 hover:bg-zinc-100">Quelle anzeigen</button>
                                </div>
                              ) : null}
                            </div>
                          </td>
                        </tr>
                        {isExpanded ? (
                          <tr className="bg-zinc-50">
                            <td colSpan={17} className="px-3 py-3">
                              <div className="overflow-x-auto rounded-md border border-zinc-200 bg-white">
                                <table className="min-w-full divide-y divide-zinc-200 text-xs">
                                  <thead className="bg-zinc-50 text-left text-zinc-600">
                                    <tr>
                                      <th className="px-3 py-2 font-medium">Feld</th>
                                      <th className="px-3 py-2 font-medium">Wert</th>
                                      <th className="px-3 py-2 font-medium">Währung/Einheit</th>
                                      <th className="px-3 py-2 font-medium">Quelle</th>
                                      <th className="px-3 py-2 font-medium">Sicherheit</th>
                                      <th className="px-3 py-2 font-medium">Manuell geändert</th>
                                      <th className="px-3 py-2 font-medium">Prüfstatus</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-zinc-200">
                                    {position.details.map((detail) => (
                                      <tr key={detail.key} className="text-zinc-700">
                                        <td className="px-3 py-2">{detail.field}</td>
                                        <td className="px-3 py-2">{detail.value || "fehlt"}</td>
                                        <td className="px-3 py-2">{detail.unit}</td>
                                        <td className="px-3 py-2">{sourceLabel[detail.sourceType]}</td>
                                        <td className="px-3 py-2">{confidenceLabel[detail.confidence]}</td>
                                        <td className="px-3 py-2">{detail.manuallyChanged ? "ja" : "nein"}</td>
                                        <td className="px-3 py-2">{fieldStatusLabel[detail.reviewStatus]}</td>
                                      </tr>
                                    ))}
                                    <tr className="text-zinc-700"><td className="px-3 py-2">Produkttyp</td><td className="px-3 py-2">{position.productType}</td><td className="px-3 py-2">-</td><td className="px-3 py-2">Dok.</td><td className="px-3 py-2">hoch</td><td className="px-3 py-2">nein</td><td className="px-3 py-2">Geprüft</td></tr>
                                    <tr className="text-zinc-700"><td className="px-3 py-2">Steuerliche Fondsart</td><td className="px-3 py-2">{position.taxFundType}</td><td className="px-3 py-2">-</td><td className="px-3 py-2">Calc</td><td className="px-3 py-2">mittel</td><td className="px-3 py-2">nein</td><td className="px-3 py-2">Geprüft</td></tr>
                                    <tr className="text-zinc-700"><td className="px-3 py-2">Teilfreistellung</td><td className="px-3 py-2">{position.partialExemption}</td><td className="px-3 py-2">%</td><td className="px-3 py-2">Calc</td><td className="px-3 py-2">mittel</td><td className="px-3 py-2">nein</td><td className="px-3 py-2">Geprüft</td></tr>
                                    <tr className="text-zinc-700"><td className="px-3 py-2">Ausschüttungen</td><td className="px-3 py-2">{position.distributions}</td><td className="px-3 py-2">-</td><td className="px-3 py-2">Dok.</td><td className="px-3 py-2">mittel</td><td className="px-3 py-2">nein</td><td className="px-3 py-2">In Prüfung</td></tr>
                                    <tr className="text-zinc-700"><td className="px-3 py-2">Quellensteuer</td><td className="px-3 py-2">{position.withholdingTax}</td><td className="px-3 py-2">-</td><td className="px-3 py-2">Dok.</td><td className="px-3 py-2">niedrig</td><td className="px-3 py-2">nein</td><td className="px-3 py-2">In Prüfung</td></tr>
                                    <tr className="text-zinc-700"><td className="px-3 py-2">Dokumentenquelle</td><td className="px-3 py-2">{position.documentSource}</td><td className="px-3 py-2">-</td><td className="px-3 py-2">Dok.</td><td className="px-3 py-2">hoch</td><td className="px-3 py-2">nein</td><td className="px-3 py-2">Geprüft</td></tr>
                                    <tr className="text-zinc-700"><td className="px-3 py-2">API-Quelle</td><td className="px-3 py-2">{position.apiSource}</td><td className="px-3 py-2">-</td><td className="px-3 py-2">API</td><td className="px-3 py-2">mittel</td><td className="px-3 py-2">nein</td><td className="px-3 py-2">In Prüfung</td></tr>
                                    <tr className="text-zinc-700"><td className="px-3 py-2">Wechselkursquelle</td><td className="px-3 py-2">{position.fxSource}</td><td className="px-3 py-2">-</td><td className="px-3 py-2">API</td><td className="px-3 py-2">mittel</td><td className="px-3 py-2">nein</td><td className="px-3 py-2">In Prüfung</td></tr>
                                    <tr className="text-zinc-700"><td className="px-3 py-2">Änderungszeitpunkt</td><td className="px-3 py-2">{position.lastChangedAt}</td><td className="px-3 py-2">-</td><td className="px-3 py-2">System</td><td className="px-3 py-2">hoch</td><td className="px-3 py-2">-</td><td className="px-3 py-2">Protokolliert</td></tr>
                                  </tbody>
                                </table>
                              </div>
                            </td>
                          </tr>
                        ) : null}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
              </div>
            ) : null}
          </section>
        );
      })}
    </div>
  );
}
