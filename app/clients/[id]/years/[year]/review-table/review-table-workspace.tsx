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

type PositionDraft = {
  isin: string;
  currency: string;
  unitsStart: string;
  movement: MovementSummary;
  unitsEnd: string;
  navStart: string;
  valueStartEur: string;
  navEnd: string;
  valueEndEur: string;
  positionValueStart: string;
  fxStart: string;
  positionValueEnd: string;
  fxEnd: string;
  taxFundType: string;
  partialExemption: string;
  distributions: string;
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

function formatNumber(value: number | null, min = 2, max = 2): string {
  if (value === null) return "—";
  return value.toLocaleString("de-DE", { minimumFractionDigits: min, maximumFractionDigits: max });
}

function formatAmount(value: number | null): string {
  return formatNumber(value, 2, 2);
}

function formatNav(value: number | null): string {
  if (value === null) return "—";
  const text = value.toString();
  const decimals = text.includes(".") ? text.split(".")[1].length : 0;
  const precision = Math.min(4, Math.max(2, decimals));
  return formatNumber(value, precision, precision);
}

function formatFx(value: number | null): string {
  return formatNumber(value, 4, 4);
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

function sourceForMain(value: SourceType): string {
  if (value === "unknown") return "fehlt";
  if (value === "document") return "Statement";
  if (value === "api") return "API";
  if (value === "manual") return "manuell";
  if (value === "calculated") return "abgeleitet";
  return "fehlt";
}

function rowStatusLabel(status: RowReviewStatus, hint: string): "geprüft" | "in Prüfung" | "offen" | "kritisch" {
  if (hint.includes("fehlt")) return "kritisch";
  if (status === "geprüft") return "geprüft";
  if (status === "manuell korrigiert") return "offen";
  return "in Prüfung";
}

function toDraft(position: ReviewPosition): PositionDraft {
  return {
    isin: position.isin,
    currency: position.currency,
    unitsStart: position.unitsStart?.toString() ?? "",
    movement: position.movement,
    unitsEnd: position.unitsEnd?.toString() ?? "",
    navStart: position.navStart?.toString() ?? "",
    valueStartEur: position.valueStartEur?.toString() ?? "",
    navEnd: position.navEnd?.toString() ?? "",
    valueEndEur: position.valueEndEur?.toString() ?? "",
    positionValueStart: position.positionValueStart?.toString() ?? "",
    fxStart: position.fxStart?.toString() ?? "",
    positionValueEnd: position.positionValueEnd?.toString() ?? "",
    fxEnd: position.fxEnd?.toString() ?? "",
    taxFundType: position.taxFundType,
    partialExemption: position.partialExemption,
    distributions: position.distributions,
  };
}

function parseNullableNumber(input: string): number | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  const normalized = trimmed.replace(/\./g, "").replace(",", ".");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

export function ReviewTableWorkspace({ year }: ReviewTableWorkspaceProps) {
  const [blocks, setBlocks] = useState<PortfolioReviewBlock[]>(initialBlocks);
  const [expandedPositionIds, setExpandedPositionIds] = useState<string[]>([]);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [collapsedBlockIds, setCollapsedBlockIds] = useState<string[]>([]);
  const [editingPositionId, setEditingPositionId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, PositionDraft>>({});

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

  function startEditing(position: ReviewPosition) {
    setEditingPositionId(position.id);
    setDrafts((current) => ({
      ...current,
      [position.id]: current[position.id] ?? toDraft(position),
    }));
  }

  function cancelEditing() {
    setEditingPositionId(null);
  }

  function updateDraft(
    positionId: string,
    key: keyof PositionDraft,
    value: PositionDraft[keyof PositionDraft],
  ) {
    setDrafts((current) => ({
      ...current,
      [positionId]: {
        ...(current[positionId] ?? ({} as PositionDraft)),
        [key]: value,
      },
    }));
  }

  function saveDraft(positionId: string) {
    const draft = drafts[positionId];
    if (!draft) return;

    setBlocks((current) =>
      current.map((block) => ({
        ...block,
        positions: block.positions.map((position) => {
          if (position.id !== positionId) return position;
          return {
            ...position,
            isin: draft.isin.trim(),
            currency: draft.currency.trim().toUpperCase(),
            unitsStart: parseNullableNumber(draft.unitsStart),
            movement: draft.movement,
            unitsEnd: parseNullableNumber(draft.unitsEnd),
            navStart: parseNullableNumber(draft.navStart),
            valueStartEur: parseNullableNumber(draft.valueStartEur),
            navEnd: parseNullableNumber(draft.navEnd),
            valueEndEur: parseNullableNumber(draft.valueEndEur),
            positionValueStart: parseNullableNumber(draft.positionValueStart),
            fxStart: parseNullableNumber(draft.fxStart),
            positionValueEnd: parseNullableNumber(draft.positionValueEnd),
            fxEnd: parseNullableNumber(draft.fxEnd),
            taxFundType: draft.taxFundType.trim() || "Unklar",
            partialExemption: draft.partialExemption.trim() || "unklar",
            distributions: draft.distributions.trim() || "unklar",
            reviewStatus: "manuell korrigiert",
            hint: position.hint.trim().length > 0 ? position.hint : "manuell korrigiert",
            details: position.details.map((field, index) =>
              index === 0 ? { ...field, manuallyChanged: true, sourceType: "manual" } : field,
            ),
          };
        }),
      })),
    );
    setEditingPositionId(null);
  }

  function toggleBlock(blockId: string) {
    setCollapsedBlockIds((current) =>
      current.includes(blockId)
        ? current.filter((id) => id !== blockId)
        : [...current, blockId],
    );
  }

  return (
    <div className="space-y-3">
      <section className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className="text-2xl font-semibold text-zinc-900">Prüftabelle Steuerjahr {year}</h2>
        <p className="mt-2 text-sm text-zinc-600">
          Fachliche Gegenprüfung der extrahierten und angereicherten Depotdaten vor der
          Berechnung.
        </p>
        <p className="mt-3 text-sm text-zinc-700">
          Depots: {summary.depotCount} · Fondspositionen: {summary.positionCount} · Geprüft:{" "}
          {summary.reviewed} · Offene Prüfung: {summary.open}
        </p>
      </section>

      {blocks.map((block) => {
        const openItems = block.positions.filter((position) => position.hint.trim().length > 0).length;
        const isCollapsed = collapsedBlockIds.includes(block.id);
        return (
          <section
            key={block.id}
            className="rounded-xl border border-zinc-300 bg-white p-4 shadow-sm"
          >
            <div className="border-b border-zinc-200 pb-2">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-zinc-900 tracking-tight">
                  {block.bank} · {block.label} · Steuerjahr {year}
                </p>
              </div>
              <p className="mt-1 text-xs text-zinc-600">
                Anfangsbestand: {block.openingBasis} · Endbestand: {block.closingBasis} ·
                Transaktionen: {block.transactionsStatus} · Ausschüttungen:{" "}
                {block.distributionsStatus} · Status: {block.reviewStatus} · Offene Werte: {openItems}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <button type="button" className="rounded border border-zinc-300 px-2 py-1 text-[11px] text-zinc-700 hover:bg-zinc-100">Daten aktualisieren</button>
                <button type="button" className="rounded border border-zinc-300 px-2 py-1 text-[11px] text-zinc-700 hover:bg-zinc-100">Depot prüfen</button>
                <button type="button" className="rounded border border-zinc-300 px-2 py-1 text-[11px] text-zinc-700 hover:bg-zinc-100">Export Prüftabelle</button>
                <button
                  type="button"
                  onClick={() => toggleBlock(block.id)}
                  className="inline-flex items-center gap-1 rounded border border-zinc-300 px-2 py-1 text-[11px] text-zinc-700 hover:bg-zinc-100"
                >
                  <svg viewBox="0 0 20 20" className="h-3.5 w-3.5" fill="none" aria-hidden="true">
                    {isCollapsed ? (
                      <path d="M5 12l5-5 5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    ) : (
                      <path d="M5 8l5 5 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    )}
                  </svg>
                  {isCollapsed ? "Tabelle ausklappen" : "Tabelle einklappen"}
                </button>
              </div>
            </div>

            {!isCollapsed ? (
              <div className="mt-3 overflow-x-auto">
              <table className="min-w-[1420px] divide-y divide-zinc-200 text-sm">
                <thead className="bg-zinc-50 text-left text-zinc-600">
                  <tr>
                    <th
                      colSpan={3}
                      className="px-3 py-2 text-center text-xs font-semibold uppercase tracking-wide text-zinc-700"
                    >
                      Fondsdaten
                    </th>
                    <th
                      colSpan={3}
                      className="border-l border-zinc-200 px-3 py-2 text-center text-xs font-semibold uppercase tracking-wide text-zinc-700"
                    >
                      Bestand
                    </th>
                    <th
                      colSpan={2}
                      className="border-l border-zinc-200 px-3 py-2 text-center text-xs font-semibold uppercase tracking-wide text-zinc-700"
                    >
                      Jahresbeginn
                    </th>
                    <th
                      colSpan={2}
                      className="border-l border-zinc-200 px-3 py-2 text-center text-xs font-semibold uppercase tracking-wide text-zinc-700"
                    >
                      Jahresende
                    </th>
                    <th
                      colSpan={2}
                      className="border-l border-zinc-200 px-3 py-2 text-center text-xs font-semibold uppercase tracking-wide text-zinc-700"
                    >
                      Prüfung
                    </th>
                  </tr>
                  <tr>
                    <th className="sticky left-0 z-10 w-[260px] bg-zinc-50 px-3 py-2 font-medium">Fondsname</th>
                    <th className="sticky left-[260px] z-10 w-[150px] bg-zinc-50 px-3 py-2 font-medium">ISIN</th>
                    <th className="sticky left-[410px] z-10 w-[90px] bg-zinc-50 px-3 py-2 font-medium">Währung</th>
                    <th className="border-l border-zinc-200 px-3 py-2 font-medium">Anteile 01.01.</th>
                    <th className="px-3 py-2 font-medium">Bewegung im Jahr</th>
                    <th className="px-3 py-2 font-medium">Anteile 31.12.</th>
                    <th className="border-l border-zinc-200 px-3 py-2 font-medium">NAV 01.01.</th>
                    <th className="px-3 py-2 font-medium">Wert 01.01. EUR</th>
                    <th className="border-l border-zinc-200 px-3 py-2 font-medium">NAV 31.12.</th>
                    <th className="px-3 py-2 font-medium">Wert 31.12. EUR</th>
                    <th className="border-l border-zinc-200 px-3 py-2 font-medium">Prüfhinweis</th>
                    <th className="px-3 py-2 font-medium">Aktion</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200">
                  {block.positions.map((position) => {
                    const isExpanded = expandedPositionIds.includes(position.id);
                    const isEditing = editingPositionId === position.id;
                    const draft = drafts[position.id] ?? toDraft(position);
                    return (
                      <Fragment key={position.id}>
                        <tr className="align-top text-zinc-700 [font-variant-numeric:tabular-nums]">
                          <td className="sticky left-0 z-[1] w-[260px] bg-white px-3 py-2.5 font-medium text-zinc-900">
                            <p>{position.fundName}</p>
                            <p
                              className={`mt-0.5 text-[11px] ${
                                rowStatusLabel(position.reviewStatus, position.hint) === "kritisch"
                                  ? "text-red-700"
                                  : rowStatusLabel(position.reviewStatus, position.hint) === "offen"
                                    ? "text-amber-700"
                                    : "text-zinc-500"
                              }`}
                            >
                              {rowStatusLabel(position.reviewStatus, position.hint)}
                            </p>
                          </td>
                          <td className="sticky left-[260px] z-[1] w-[150px] bg-white px-3 py-2.5 font-mono text-[12px]">{position.isin || "—"}</td>
                          <td className="sticky left-[410px] z-[1] w-[90px] bg-white px-3 py-2.5">{position.currency}</td>
                          <td className="border-l border-zinc-100 px-3 py-2.5 text-right">
                            <div>{formatUnits(position.unitsStart)}</div>
                            <div className="text-[11px] text-zinc-500">{sourceForMain(position.sourceSummary.units)}</div>
                          </td>
                          <td className={`px-3 py-2.5 ${isMovementAttention(position.movement) ? "text-amber-700" : "text-zinc-700"}`}>{position.movement}</td>
                          <td className="px-3 py-2.5 text-right">
                            <div>{formatUnits(position.unitsEnd)}</div>
                            <div className="text-[11px] text-zinc-500">{sourceForMain(position.sourceSummary.units)}</div>
                          </td>
                          <td className="border-l border-zinc-100 px-3 py-2.5 text-right">
                            <div>{formatNav(position.navStart)}</div>
                            <div className="text-[11px] text-zinc-500">{sourceForMain(position.sourceSummary.nav)}</div>
                          </td>
                          <td className="px-3 py-2.5 text-right">
                            <div>{formatAmount(position.valueStartEur)}</div>
                            <div className="text-[11px] text-zinc-500">{sourceForMain(position.sourceSummary.eur)}</div>
                          </td>
                          <td className="border-l border-zinc-100 px-3 py-2.5 text-right">
                            <div>{formatNav(position.navEnd)}</div>
                            <div className="text-[11px] text-zinc-500">{sourceForMain(position.sourceSummary.nav)}</div>
                          </td>
                          <td className="px-3 py-2.5 text-right">
                            <div>{formatAmount(position.valueEndEur)}</div>
                            <div className="text-[11px] text-zinc-500">{sourceForMain(position.sourceSummary.eur)}</div>
                          </td>
                          <td className="border-l border-zinc-100 px-3 py-2.5">
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
                          <td className="px-3 py-2.5">
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
                                  <button type="button" onClick={() => { startEditing(position); setOpenMenuId(null); }} className="block w-full rounded px-2 py-1 text-left text-xs text-zinc-700 hover:bg-zinc-100">Wert korrigieren</button>
                                  <button type="button" onClick={() => { updateRowStatus(position.id, "geprüft"); setOpenMenuId(null); }} className="block w-full rounded px-2 py-1 text-left text-xs text-zinc-700 hover:bg-zinc-100">als geprüft markieren</button>
                                  <button type="button" onClick={() => { updateRowStatus(position.id, "in Prüfung"); setOpenMenuId(null); }} className="block w-full rounded px-2 py-1 text-left text-xs text-zinc-700 hover:bg-zinc-100">Prüfung zurücknehmen</button>
                                  <button type="button" onClick={() => setOpenMenuId(null)} className="block w-full rounded px-2 py-1 text-left text-xs text-zinc-700 hover:bg-zinc-100">Quelle anzeigen</button>
                                </div>
                              ) : null}
                            </div>
                          </td>
                        </tr>
                        {isExpanded ? (
                          <tr className="bg-zinc-50/70">
                            <td colSpan={12} className="px-4 py-2.5">
                              {isEditing ? (
                                <div className="mb-2 rounded-md border border-zinc-200 bg-zinc-50 p-3">
                                  <p className="mb-2 text-xs font-medium text-zinc-700">
                                    Erfassungsmodus (manuelle Korrektur)
                                  </p>
                                  <div className="grid gap-2 md:grid-cols-4">
                                    <label className="text-xs text-zinc-700">ISIN<input value={draft.isin} onChange={(event) => updateDraft(position.id, "isin", event.target.value)} className="mt-1 w-full rounded border border-zinc-300 bg-white px-2 py-1 text-xs" /></label>
                                    <label className="text-xs text-zinc-700">Währung<input value={draft.currency} onChange={(event) => updateDraft(position.id, "currency", event.target.value)} className="mt-1 w-full rounded border border-zinc-300 bg-white px-2 py-1 text-xs uppercase" /></label>
                                    <label className="text-xs text-zinc-700">Anteile 01.01.<input value={draft.unitsStart} onChange={(event) => updateDraft(position.id, "unitsStart", event.target.value)} className="mt-1 w-full rounded border border-zinc-300 bg-white px-2 py-1 text-xs" /></label>
                                    <label className="text-xs text-zinc-700">Anteile 31.12.<input value={draft.unitsEnd} onChange={(event) => updateDraft(position.id, "unitsEnd", event.target.value)} className="mt-1 w-full rounded border border-zinc-300 bg-white px-2 py-1 text-xs" /></label>
                                    <label className="text-xs text-zinc-700">Bewegung im Jahr
                                      <select value={draft.movement} onChange={(event) => updateDraft(position.id, "movement", event.target.value as MovementSummary)} className="mt-1 w-full rounded border border-zinc-300 bg-white px-2 py-1 text-xs">
                                        <option value="keine">keine</option>
                                        <option value="erstmals Vorjahr">erstmals Vorjahr</option>
                                        <option value="unterjähriger Kauf">unterjähriger Kauf</option>
                                        <option value="mehrere Käufe">mehrere Käufe</option>
                                        <option value="Verkauf">Verkauf</option>
                                        <option value="Käufe und Verkäufe">Käufe und Verkäufe</option>
                                        <option value="unklar">unklar</option>
                                      </select>
                                    </label>
                                    <label className="text-xs text-zinc-700">NAV 01.01.<input value={draft.navStart} onChange={(event) => updateDraft(position.id, "navStart", event.target.value)} className="mt-1 w-full rounded border border-zinc-300 bg-white px-2 py-1 text-xs" /></label>
                                    <label className="text-xs text-zinc-700">NAV 31.12.<input value={draft.navEnd} onChange={(event) => updateDraft(position.id, "navEnd", event.target.value)} className="mt-1 w-full rounded border border-zinc-300 bg-white px-2 py-1 text-xs" /></label>
                                    <label className="text-xs text-zinc-700">Wert 01.01. EUR<input value={draft.valueStartEur} onChange={(event) => updateDraft(position.id, "valueStartEur", event.target.value)} className="mt-1 w-full rounded border border-zinc-300 bg-white px-2 py-1 text-xs" /></label>
                                    <label className="text-xs text-zinc-700">Wert 31.12. EUR<input value={draft.valueEndEur} onChange={(event) => updateDraft(position.id, "valueEndEur", event.target.value)} className="mt-1 w-full rounded border border-zinc-300 bg-white px-2 py-1 text-xs" /></label>
                                    <label className="text-xs text-zinc-700">Wert 01.01. FW<input value={draft.positionValueStart} onChange={(event) => updateDraft(position.id, "positionValueStart", event.target.value)} className="mt-1 w-full rounded border border-zinc-300 bg-white px-2 py-1 text-xs" /></label>
                                    <label className="text-xs text-zinc-700">Wert 31.12. FW<input value={draft.positionValueEnd} onChange={(event) => updateDraft(position.id, "positionValueEnd", event.target.value)} className="mt-1 w-full rounded border border-zinc-300 bg-white px-2 py-1 text-xs" /></label>
                                    <label className="text-xs text-zinc-700">FX 01.01.<input value={draft.fxStart} onChange={(event) => updateDraft(position.id, "fxStart", event.target.value)} className="mt-1 w-full rounded border border-zinc-300 bg-white px-2 py-1 text-xs" /></label>
                                    <label className="text-xs text-zinc-700">FX 31.12.<input value={draft.fxEnd} onChange={(event) => updateDraft(position.id, "fxEnd", event.target.value)} className="mt-1 w-full rounded border border-zinc-300 bg-white px-2 py-1 text-xs" /></label>
                                    <label className="text-xs text-zinc-700">Steuerliche Fondsart<input value={draft.taxFundType} onChange={(event) => updateDraft(position.id, "taxFundType", event.target.value)} className="mt-1 w-full rounded border border-zinc-300 bg-white px-2 py-1 text-xs" /></label>
                                    <label className="text-xs text-zinc-700">Teilfreistellung<input value={draft.partialExemption} onChange={(event) => updateDraft(position.id, "partialExemption", event.target.value)} className="mt-1 w-full rounded border border-zinc-300 bg-white px-2 py-1 text-xs" /></label>
                                    <label className="text-xs text-zinc-700">Ausschüttungen<input value={draft.distributions} onChange={(event) => updateDraft(position.id, "distributions", event.target.value)} className="mt-1 w-full rounded border border-zinc-300 bg-white px-2 py-1 text-xs" /></label>
                                  </div>
                                  <div className="mt-2 flex items-center gap-2">
                                    <button type="button" onClick={() => saveDraft(position.id)} className="rounded border border-zinc-300 bg-white px-2 py-1 text-xs text-zinc-700 hover:bg-zinc-100">Speichern</button>
                                    <button type="button" onClick={cancelEditing} className="rounded border border-zinc-300 bg-white px-2 py-1 text-xs text-zinc-700 hover:bg-zinc-100">Abbrechen</button>
                                  </div>
                                </div>
                              ) : null}
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
                                      <tr key={detail.key} className="text-zinc-700 [font-variant-numeric:tabular-nums]">
                                        <td className="px-3 py-1.5">{detail.field}</td>
                                        <td className="px-3 py-1.5">{detail.value || "fehlt"}</td>
                                        <td className="px-3 py-1.5">{detail.unit}</td>
                                        <td className="px-3 py-1.5">{sourceLabel[detail.sourceType]}</td>
                                        <td className="px-3 py-1.5">{confidenceLabel[detail.confidence]}</td>
                                        <td className="px-3 py-1.5">{detail.manuallyChanged ? "ja" : "nein"}</td>
                                        <td className="px-3 py-1.5">{fieldStatusLabel[detail.reviewStatus]}</td>
                                      </tr>
                                    ))}
                                    <tr className="text-zinc-700 [font-variant-numeric:tabular-nums]"><td className="px-3 py-1.5">Produkttyp</td><td className="px-3 py-1.5">{position.productType}</td><td className="px-3 py-1.5">-</td><td className="px-3 py-1.5">Statement</td><td className="px-3 py-1.5">hoch</td><td className="px-3 py-1.5">nein</td><td className="px-3 py-1.5">Geprüft</td></tr>
                                    <tr className="text-zinc-700 [font-variant-numeric:tabular-nums]"><td className="px-3 py-1.5">Steuerliche Fondsart</td><td className="px-3 py-1.5">{position.taxFundType}</td><td className="px-3 py-1.5">-</td><td className="px-3 py-1.5">abgeleitet</td><td className="px-3 py-1.5">mittel</td><td className="px-3 py-1.5">nein</td><td className="px-3 py-1.5">Geprüft</td></tr>
                                    <tr className="text-zinc-700 [font-variant-numeric:tabular-nums]"><td className="px-3 py-1.5">Teilfreistellung</td><td className="px-3 py-1.5">{position.partialExemption}</td><td className="px-3 py-1.5">%</td><td className="px-3 py-1.5">abgeleitet</td><td className="px-3 py-1.5">mittel</td><td className="px-3 py-1.5">nein</td><td className="px-3 py-1.5">Geprüft</td></tr>
                                    <tr className="text-zinc-700 [font-variant-numeric:tabular-nums]"><td className="px-3 py-1.5">Anteile 31.12.</td><td className="px-3 py-1.5">{formatUnits(position.unitsEnd)}</td><td className="px-3 py-1.5">Stück</td><td className="px-3 py-1.5">{sourceForMain(position.sourceSummary.units)}</td><td className="px-3 py-1.5">mittel</td><td className="px-3 py-1.5">nein</td><td className="px-3 py-1.5">In Prüfung</td></tr>
                                    <tr className="text-zinc-700 [font-variant-numeric:tabular-nums]"><td className="px-3 py-1.5">Veränderung Anteile</td><td className="px-3 py-1.5">{formatUnits(position.unitChange)}</td><td className="px-3 py-1.5">Stück</td><td className="px-3 py-1.5">{sourceForMain(position.sourceSummary.units)}</td><td className="px-3 py-1.5">mittel</td><td className="px-3 py-1.5">nein</td><td className="px-3 py-1.5">In Prüfung</td></tr>
                                    <tr className="text-zinc-700 [font-variant-numeric:tabular-nums]"><td className="px-3 py-1.5">Bewegung im Jahr</td><td className="px-3 py-1.5">{position.movement}</td><td className="px-3 py-1.5">-</td><td className="px-3 py-1.5">Statement</td><td className="px-3 py-1.5">mittel</td><td className="px-3 py-1.5">nein</td><td className="px-3 py-1.5">In Prüfung</td></tr>
                                    <tr className="text-zinc-700 [font-variant-numeric:tabular-nums]"><td className="px-3 py-1.5">NAV 01.01.</td><td className="px-3 py-1.5">{formatNav(position.navStart)}</td><td className="px-3 py-1.5">{position.currency}</td><td className="px-3 py-1.5">{sourceForMain(position.sourceSummary.nav)}</td><td className="px-3 py-1.5">mittel</td><td className="px-3 py-1.5">nein</td><td className="px-3 py-1.5">In Prüfung</td></tr>
                                    <tr className="text-zinc-700 [font-variant-numeric:tabular-nums]"><td className="px-3 py-1.5">Wert 01.01. FW</td><td className="px-3 py-1.5">{formatAmount(position.positionValueStart)}</td><td className="px-3 py-1.5">{position.currency}</td><td className="px-3 py-1.5">{sourceForMain(position.sourceSummary.units)}</td><td className="px-3 py-1.5">mittel</td><td className="px-3 py-1.5">nein</td><td className="px-3 py-1.5">In Prüfung</td></tr>
                                    <tr className="text-zinc-700 [font-variant-numeric:tabular-nums]"><td className="px-3 py-1.5">FX 01.01.</td><td className="px-3 py-1.5">{formatFx(position.fxStart)}</td><td className="px-3 py-1.5">-</td><td className="px-3 py-1.5">{position.fxStart === null ? "fehlt" : "FX/API"}</td><td className="px-3 py-1.5">mittel</td><td className="px-3 py-1.5">nein</td><td className="px-3 py-1.5">In Prüfung</td></tr>
                                    <tr className="text-zinc-700 [font-variant-numeric:tabular-nums]"><td className="px-3 py-1.5">Wert 01.01. EUR</td><td className="px-3 py-1.5">{formatAmount(position.valueStartEur)}</td><td className="px-3 py-1.5">EUR</td><td className="px-3 py-1.5">{sourceForMain(position.sourceSummary.eur)}</td><td className="px-3 py-1.5">mittel</td><td className="px-3 py-1.5">nein</td><td className="px-3 py-1.5">In Prüfung</td></tr>
                                    <tr className="text-zinc-700 [font-variant-numeric:tabular-nums]"><td className="px-3 py-1.5">NAV 31.12.</td><td className="px-3 py-1.5">{formatNav(position.navEnd)}</td><td className="px-3 py-1.5">{position.currency}</td><td className="px-3 py-1.5">{sourceForMain(position.sourceSummary.nav)}</td><td className="px-3 py-1.5">mittel</td><td className="px-3 py-1.5">nein</td><td className="px-3 py-1.5">In Prüfung</td></tr>
                                    <tr className="text-zinc-700 [font-variant-numeric:tabular-nums]"><td className="px-3 py-1.5">Wert 31.12. FW</td><td className="px-3 py-1.5">{formatAmount(position.positionValueEnd)}</td><td className="px-3 py-1.5">{position.currency}</td><td className="px-3 py-1.5">{sourceForMain(position.sourceSummary.units)}</td><td className="px-3 py-1.5">mittel</td><td className="px-3 py-1.5">nein</td><td className="px-3 py-1.5">In Prüfung</td></tr>
                                    <tr className="text-zinc-700 [font-variant-numeric:tabular-nums]"><td className="px-3 py-1.5">FX 31.12.</td><td className="px-3 py-1.5">{formatFx(position.fxEnd)}</td><td className="px-3 py-1.5">-</td><td className="px-3 py-1.5">{position.fxEnd === null ? "fehlt" : "FX/API"}</td><td className="px-3 py-1.5">mittel</td><td className="px-3 py-1.5">nein</td><td className="px-3 py-1.5">In Prüfung</td></tr>
                                    <tr className="text-zinc-700 [font-variant-numeric:tabular-nums]"><td className="px-3 py-1.5">Wert 31.12. EUR</td><td className="px-3 py-1.5">{formatAmount(position.valueEndEur)}</td><td className="px-3 py-1.5">EUR</td><td className="px-3 py-1.5">{sourceForMain(position.sourceSummary.eur)}</td><td className="px-3 py-1.5">mittel</td><td className="px-3 py-1.5">nein</td><td className="px-3 py-1.5">In Prüfung</td></tr>
                                    <tr className="text-zinc-700 [font-variant-numeric:tabular-nums]"><td className="px-3 py-1.5">Ausschüttungen</td><td className="px-3 py-1.5">{position.distributions}</td><td className="px-3 py-1.5">-</td><td className="px-3 py-1.5">Statement</td><td className="px-3 py-1.5">mittel</td><td className="px-3 py-1.5">nein</td><td className="px-3 py-1.5">In Prüfung</td></tr>
                                    <tr className="text-zinc-700 [font-variant-numeric:tabular-nums]"><td className="px-3 py-1.5">Quellensteuer</td><td className="px-3 py-1.5">{position.withholdingTax}</td><td className="px-3 py-1.5">-</td><td className="px-3 py-1.5">Statement</td><td className="px-3 py-1.5">niedrig</td><td className="px-3 py-1.5">nein</td><td className="px-3 py-1.5">In Prüfung</td></tr>
                                    <tr className="text-zinc-700 [font-variant-numeric:tabular-nums]"><td className="px-3 py-1.5">Dokumentenquelle</td><td className="px-3 py-1.5">{position.documentSource}</td><td className="px-3 py-1.5">-</td><td className="px-3 py-1.5">Statement</td><td className="px-3 py-1.5">hoch</td><td className="px-3 py-1.5">nein</td><td className="px-3 py-1.5">Geprüft</td></tr>
                                    <tr className="text-zinc-700 [font-variant-numeric:tabular-nums]"><td className="px-3 py-1.5">API-Quelle</td><td className="px-3 py-1.5">{position.apiSource}</td><td className="px-3 py-1.5">-</td><td className="px-3 py-1.5">API</td><td className="px-3 py-1.5">mittel</td><td className="px-3 py-1.5">nein</td><td className="px-3 py-1.5">In Prüfung</td></tr>
                                    <tr className="text-zinc-700 [font-variant-numeric:tabular-nums]"><td className="px-3 py-1.5">Wechselkursquelle</td><td className="px-3 py-1.5">{position.fxSource}</td><td className="px-3 py-1.5">-</td><td className="px-3 py-1.5">FX/API</td><td className="px-3 py-1.5">mittel</td><td className="px-3 py-1.5">nein</td><td className="px-3 py-1.5">In Prüfung</td></tr>
                                    <tr className="text-zinc-700 [font-variant-numeric:tabular-nums]"><td className="px-3 py-1.5">Änderungszeitpunkt</td><td className="px-3 py-1.5">{position.lastChangedAt}</td><td className="px-3 py-1.5">-</td><td className="px-3 py-1.5">abgeleitet</td><td className="px-3 py-1.5">hoch</td><td className="px-3 py-1.5">-</td><td className="px-3 py-1.5">Protokolliert</td></tr>
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
