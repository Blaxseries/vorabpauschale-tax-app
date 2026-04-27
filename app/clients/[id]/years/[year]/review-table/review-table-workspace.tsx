"use client";

import { Fragment, useMemo, useState } from "react";

type PositionStatus =
  | "Extrahiert"
  | "Prüfung erforderlich"
  | "Manuell korrigiert"
  | "Geprüft"
  | "Freigegeben"
  | "Gesperrt";

type MovementSummary = "keine" | "Käufe" | "Verkäufe" | "Käufe und Verkäufe" | "unklar";
type FxStatus =
  | "vollständig"
  | "NAV Anfang fehlt"
  | "NAV Ende fehlt"
  | "FX Anfang fehlt"
  | "FX Ende fehlt"
  | "NAV/FX unklar"
  | "manuell prüfen";
type TaxFundType =
  | "Aktienfonds"
  | "Mischfonds"
  | "Rentenfonds"
  | "Immobilienfonds"
  | "Auslands-Immobilienfonds"
  | "Sonstiger Fonds"
  | "Unklar";
type SourceType = "document" | "api" | "manual" | "normalized" | "unknown";
type Confidence = "high" | "medium" | "low";
type FieldReviewStatus = "ok" | "offen" | "warnung";
type DocumentStatus = "vollständig" | "teilweise vollständig" | "fehlend";
type ReviewState = "freigegeben" | "offene Punkte" | "in Prüfung";
type CalculationState = "freigegeben" | "gesperrt" | "offen";

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
  status: PositionStatus;
  fundName: string;
  isin: string;
  taxFundType: TaxFundType;
  productType: string;
  partialExemption: string;
  unitsStart: number;
  unitsEnd: number;
  movements: MovementSummary;
  distributionsEur: number | null;
  distributionsState: "erfasst" | "nicht erkannt" | "unklar" | "nicht relevant";
  fxStatus: FxStatus;
  note: string;
  details: ReviewDetailField[];
};

type PortfolioReviewBlock = {
  id: string;
  bank: string;
  label: string;
  documentStatus: DocumentStatus;
  positions: ReviewPosition[];
};

type ReviewTableWorkspaceProps = {
  year: string;
};

const statusStyles: Record<PositionStatus, string> = {
  Extrahiert: "bg-blue-50 text-blue-700 border-blue-200",
  "Prüfung erforderlich": "bg-amber-50 text-amber-700 border-amber-200",
  "Manuell korrigiert": "bg-violet-50 text-violet-700 border-violet-200",
  Geprüft: "bg-zinc-100 text-zinc-700 border-zinc-200",
  Freigegeben: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Gesperrt: "bg-red-50 text-red-700 border-red-200",
};

const movementStyles: Record<MovementSummary, string> = {
  keine: "text-zinc-700",
  Käufe: "font-medium text-amber-700",
  Verkäufe: "font-medium text-amber-700",
  "Käufe und Verkäufe": "font-medium text-amber-700",
  unklar: "font-medium text-red-700",
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
  document: "Dokument",
  api: "API",
  manual: "Manuell",
  normalized: "Normalisiert",
  unknown: "Unbekannt",
};

const fxStyles: Record<FxStatus, string> = {
  vollständig: "text-emerald-700",
  "NAV Anfang fehlt": "font-medium text-red-700",
  "NAV Ende fehlt": "font-medium text-red-700",
  "FX Anfang fehlt": "font-medium text-red-700",
  "FX Ende fehlt": "font-medium text-red-700",
  "NAV/FX unklar": "font-medium text-red-700",
  "manuell prüfen": "font-medium text-amber-700",
};

const metaBadgeStyles = {
  neutral: "border-zinc-200 bg-zinc-50 text-zinc-700",
  success: "border-emerald-200 bg-emerald-50 text-emerald-700",
  warning: "border-amber-200 bg-amber-50 text-amber-700",
  danger: "border-red-200 bg-red-50 text-red-700",
} as const;

const initialBlocks: PortfolioReviewBlock[] = [
  {
    id: "pf-ubs-2025",
    bank: "UBS",
    label: "DEP-9104218",
    documentStatus: "teilweise vollständig",
    positions: [
      {
        id: "pos-001",
        status: "Prüfung erforderlich",
        fundName: "Global Equity Opportunities",
        isin: "LU1234567890",
        taxFundType: "Aktienfonds",
        productType: "ETF",
        partialExemption: "30 %",
        unitsStart: 180.5,
        unitsEnd: 194.8,
        movements: "Käufe",
        distributionsEur: 245.31,
        distributionsState: "erfasst",
        fxStatus: "FX Ende fehlt",
        note: "FX Ende fehlt",
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
          {
            key: "3",
            field: "Steuerliche Fondsart",
            value: "Aktienfonds",
            unit: "-",
            sourceType: "normalized",
            confidence: "medium",
            manuallyChanged: false,
            reviewStatus: "ok",
          },
          {
            key: "3b",
            field: "Produkttyp",
            value: "ETF",
            unit: "-",
            sourceType: "document",
            confidence: "high",
            manuallyChanged: false,
            reviewStatus: "ok",
          },
          {
            key: "4",
            field: "Teilfreistellung",
            value: "30",
            unit: "%",
            sourceType: "normalized",
            confidence: "medium",
            manuallyChanged: false,
            reviewStatus: "ok",
          },
          {
            key: "5",
            field: "Anteile 01.01.",
            value: "180.5",
            unit: "Stk.",
            sourceType: "document",
            confidence: "high",
            manuallyChanged: false,
            reviewStatus: "ok",
          },
          {
            key: "6",
            field: "Anteile 31.12.",
            value: "194.8",
            unit: "Stk.",
            sourceType: "document",
            confidence: "high",
            manuallyChanged: false,
            reviewStatus: "ok",
          },
          {
            key: "7",
            field: "NAV/Kurs 31.12.",
            value: "104.21",
            unit: "USD",
            sourceType: "api",
            confidence: "low",
            manuallyChanged: false,
            reviewStatus: "offen",
          },
          {
            key: "8",
            field: "FX-Kurs Ende",
            value: "",
            unit: "USD/EUR",
            sourceType: "unknown",
            confidence: "low",
            manuallyChanged: false,
            reviewStatus: "warnung",
          },
        ],
      },
      {
        id: "pos-002",
        status: "Freigegeben",
        fundName: "Euro Bonds Income",
        isin: "IE0098765432",
        taxFundType: "Rentenfonds",
        productType: "Fonds",
        partialExemption: "0 %",
        unitsStart: 320,
        unitsEnd: 320,
        movements: "keine",
        distributionsEur: 112.4,
        distributionsState: "erfasst",
        fxStatus: "vollständig",
        note: "Freigabe erfolgt",
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
          {
            key: "2",
            field: "ISIN",
            value: "IE0098765432",
            unit: "-",
            sourceType: "document",
            confidence: "high",
            manuallyChanged: false,
            reviewStatus: "ok",
          },
          {
            key: "3",
            field: "Ausschüttungen EUR",
            value: "112.4",
            unit: "EUR",
            sourceType: "normalized",
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
    documentStatus: "vollständig",
    positions: [
      {
        id: "pos-003",
        status: "Extrahiert",
        fundName: "MSCI World ETF",
        isin: "IE00B4L5Y983",
        taxFundType: "Aktienfonds",
        productType: "ETF",
        partialExemption: "30 %",
        unitsStart: 520.2,
        unitsEnd: 540.2,
        movements: "Käufe und Verkäufe",
        distributionsEur: null,
        distributionsState: "unklar",
        fxStatus: "manuell prüfen",
        note: "Ausschüttungsstatus unklar",
        details: [
          {
            key: "1",
            field: "Ausschüttungen brutto",
            value: "",
            unit: "USD",
            sourceType: "document",
            confidence: "low",
            manuallyChanged: false,
            reviewStatus: "offen",
          },
          {
            key: "2",
            field: "Unterjährige Käufe vorhanden",
            value: "ja",
            unit: "-",
            sourceType: "normalized",
            confidence: "medium",
            manuallyChanged: false,
            reviewStatus: "warnung",
          },
        ],
      },
      {
        id: "pos-004",
        status: "Gesperrt",
        fundName: "Asia Growth Opportunities",
        isin: "",
        taxFundType: "Unklar",
        productType: "ETF",
        partialExemption: "30 %",
        unitsStart: 90.1,
        unitsEnd: 92.4,
        movements: "unklar",
        distributionsEur: null,
        distributionsState: "nicht erkannt",
        fxStatus: "NAV/FX unklar",
        note: "ISIN fehlt, NAV/FX unklar",
        details: [
          {
            key: "1",
            field: "ISIN",
            value: "",
            unit: "-",
            sourceType: "unknown",
            confidence: "low",
            manuallyChanged: false,
            reviewStatus: "offen",
          },
          {
            key: "2",
            field: "Kurswährung",
            value: "unklar",
            unit: "-",
            sourceType: "unknown",
            confidence: "low",
            manuallyChanged: false,
            reviewStatus: "offen",
          },
        ],
      },
    ],
  },
];

function deriveCalculable(position: ReviewPosition): boolean {
  const isBlockedByStatus =
    position.status === "Prüfung erforderlich" || position.status === "Gesperrt";
  const hasIsin = position.isin.trim().length > 0;
  const hasTaxFundType = position.taxFundType !== "Unklar";
  const hasUnits = position.unitsStart > 0 && position.unitsEnd > 0;
  const hasDistributionState = position.distributionsState === "erfasst";
  const hasFxData = position.fxStatus === "vollständig";
  const hasMovementState = position.movements !== "unklar";

  return (
    !isBlockedByStatus &&
    hasIsin &&
    hasTaxFundType &&
    hasUnits &&
    hasDistributionState &&
    hasFxData &&
    hasMovementState
  );
}

function deriveBlockReviewStatus(positions: ReviewPosition[]): ReviewState {
  const hasOpen = positions.some(
    (position) =>
      position.status === "Prüfung erforderlich" || position.status === "Extrahiert",
  );
  const allReleased = positions.every((position) => position.status === "Freigegeben");

  if (allReleased) {
    return "freigegeben";
  }
  if (hasOpen) {
    return "offene Punkte";
  }
  return "in Prüfung";
}

function deriveBlockCalculationStatus(positions: ReviewPosition[]): CalculationState {
  const calculableCount = positions.filter(deriveCalculable).length;
  if (calculableCount === positions.length) {
    return "freigegeben";
  }
  if (calculableCount === 0) {
    return "gesperrt";
  }
  return "offen";
}

export function ReviewTableWorkspace({ year }: ReviewTableWorkspaceProps) {
  const [blocks, setBlocks] = useState<PortfolioReviewBlock[]>(initialBlocks);
  const [expandedPositionIds, setExpandedPositionIds] = useState<string[]>([]);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const summary = useMemo(() => {
    const allPositions = blocks.flatMap((block) => block.positions);
    return {
      depotCount: blocks.length,
      positionCount: allPositions.length,
      released: allPositions.filter((position) => position.status === "Freigegeben").length,
      open: allPositions.filter(
        (position) =>
          position.status === "Prüfung erforderlich" || position.status === "Extrahiert",
      ).length,
      blocked: allPositions.filter((position) => position.status === "Gesperrt").length,
    };
  }, [blocks]);

  function toggleExpanded(positionId: string) {
    setExpandedPositionIds((current) =>
      current.includes(positionId)
        ? current.filter((id) => id !== positionId)
        : [...current, positionId],
    );
  }

  function updatePositionStatus(positionId: string, status: PositionStatus) {
    setBlocks((current) =>
      current.map((block) => ({
        ...block,
        positions: block.positions.map((position) =>
          position.id === positionId ? { ...position, status } : position,
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
                status: "Manuell korrigiert",
                note: "Werte wurden manuell angepasst und müssen erneut geprüft werden.",
                details: position.details.map((field, index) =>
                  index === 0 ? { ...field, manuallyChanged: true, sourceType: "manual" } : field,
                ),
              }
            : position,
        ),
      })),
    );
  }

  function getPrimaryAction(position: ReviewPosition): {
    label: string;
    onClick: () => void;
  } {
    if (position.status === "Geprüft") {
      return {
        label: "Freigeben",
        onClick: () => updatePositionStatus(position.id, "Freigegeben"),
      };
    }
    if (position.status === "Freigegeben") {
      return {
        label: "Freigabe zurücknehmen",
        onClick: () => updatePositionStatus(position.id, "Geprüft"),
      };
    }
    if (position.status === "Gesperrt") {
      return {
        label: "Wert korrigieren",
        onClick: () => markManualCorrection(position.id),
      };
    }
    return {
      label: "Prüfen",
      onClick: () => updatePositionStatus(position.id, "Geprüft"),
    };
  }

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className="text-2xl font-semibold text-zinc-900">Prüftabelle Steuerjahr {year}</h2>
        <p className="mt-2 text-sm text-zinc-600">
          Fachliche Gegenprüfung der extrahierten und angereicherten Fondsdaten vor der
          Berechnung der Vorabpauschale.
        </p>
        <div className="mt-4 grid gap-2 text-sm text-zinc-700 md:grid-cols-5">
          <p>
            <span className="font-medium text-zinc-900">Depots:</span> {summary.depotCount}
          </p>
          <p>
            <span className="font-medium text-zinc-900">Fondspositionen:</span>{" "}
            {summary.positionCount}
          </p>
          <p>
            <span className="font-medium text-zinc-900">Freigegeben:</span> {summary.released}
          </p>
          <p>
            <span className="font-medium text-zinc-900">Offene Prüfung:</span> {summary.open}
          </p>
          <p>
            <span className="font-medium text-zinc-900">Gesperrt:</span> {summary.blocked}
          </p>
        </div>
      </section>

      {blocks.map((block) => {
        const reviewStatus = deriveBlockReviewStatus(block.positions);
        const calculationStatus = deriveBlockCalculationStatus(block.positions);
        const openItems = block.positions.filter(
          (position) =>
            position.status === "Prüfung erforderlich" || position.status === "Extrahiert",
        ).length;

        return (
          <section
            key={block.id}
            className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm"
          >
            <div className="border-b border-zinc-200 pb-3">
              <p className="text-sm font-semibold text-zinc-900">
                {block.bank} · {block.label} · Steuerjahr {year}
              </p>
              <div className="mt-2 flex flex-wrap gap-2 text-xs">
                <span
                  className={`rounded-md border px-2 py-1 ${block.documentStatus === "vollständig" ? metaBadgeStyles.success : metaBadgeStyles.warning}`}
                >
                  Dokumente: {block.documentStatus}
                </span>
                <span
                  className={`rounded-md border px-2 py-1 ${reviewStatus === "freigegeben" ? metaBadgeStyles.success : reviewStatus === "offene Punkte" ? metaBadgeStyles.warning : metaBadgeStyles.neutral}`}
                >
                  Prüfung: {reviewStatus}
                </span>
                <span
                  className={`rounded-md border px-2 py-1 ${calculationStatus === "freigegeben" ? metaBadgeStyles.success : calculationStatus === "gesperrt" ? metaBadgeStyles.danger : metaBadgeStyles.warning}`}
                >
                  Berechnung: {calculationStatus}
                </span>
                <span className={`rounded-md border px-2 py-1 ${metaBadgeStyles.neutral}`}>
                  Positionen: {block.positions.length}
                </span>
                <span
                  className={`rounded-md border px-2 py-1 ${openItems === 0 ? metaBadgeStyles.success : metaBadgeStyles.warning}`}
                >
                  Offene Punkte: {openItems}
                </span>
              </div>
            </div>

            <div className="mt-3 overflow-x-auto">
              <table className="min-w-full divide-y divide-zinc-200 text-sm">
                <thead className="bg-zinc-50 text-left text-zinc-600">
                  <tr>
                    <th className="px-3 py-2 font-medium">Status</th>
                    <th className="px-3 py-2 font-medium">Fonds</th>
                    <th className="px-3 py-2 font-medium">ISIN</th>
                    <th className="px-3 py-2 font-medium">Steuerliche Fondsart</th>
                    <th className="px-3 py-2 font-medium">Teilfreistellung</th>
                    <th className="px-3 py-2 font-medium">Anteile</th>
                    <th className="px-3 py-2 font-medium">Bewegungen</th>
                    <th className="px-3 py-2 font-medium">Ausschüttungen</th>
                    <th className="px-3 py-2 font-medium">Kurs/FX</th>
                    <th className="px-3 py-2 font-medium">Berechnungsfähig</th>
                    <th className="px-3 py-2 font-medium">Hinweis</th>
                    <th className="px-3 py-2 font-medium">Aktion</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200">
                  {block.positions.map((position) => {
                    const isExpanded = expandedPositionIds.includes(position.id);
                    const calculable = deriveCalculable(position);
                    const primaryAction = getPrimaryAction(position);

                    return (
                      <Fragment key={position.id}>
                        <tr key={position.id} className="align-top text-zinc-700">
                          <td className="px-3 py-3">
                            <span className={`rounded-md border px-2 py-1 text-xs font-medium ${statusStyles[position.status]}`}>
                              {position.status}
                            </span>
                          </td>
                          <td className="px-3 py-3 font-medium text-zinc-900">{position.fundName}</td>
                          <td className="px-3 py-3">{position.isin || "fehlt"}</td>
                          <td className="px-3 py-3">{position.taxFundType}</td>
                          <td className="px-3 py-3">{position.partialExemption}</td>
                          <td className="px-3 py-3 text-xs">
                            <p>01.01.: {position.unitsStart.toFixed(2)}</p>
                            <p>31.12.: {position.unitsEnd.toFixed(2)}</p>
                          </td>
                          <td className={`px-3 py-3 ${movementStyles[position.movements]}`}>
                            {position.movements}
                          </td>
                          <td className="px-3 py-3">
                            {position.distributionsEur !== null
                              ? `${position.distributionsEur.toFixed(2)} EUR`
                              : position.distributionsState}
                          </td>
                          <td className={`px-3 py-3 ${fxStyles[position.fxStatus]}`}>
                            {position.fxStatus}
                          </td>
                          <td className="px-3 py-3">
                            {calculable ? (
                              <span className="rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700">
                                ja
                              </span>
                            ) : (
                              <span className="rounded-md border border-red-200 bg-red-50 px-2 py-1 text-xs font-medium text-red-700">
                                nein
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-3">{position.note || "nicht geprüft"}</td>
                          <td className="px-3 py-3">
                            <div className="flex flex-nowrap items-center gap-1">
                              <button
                                type="button"
                                onClick={() => toggleExpanded(position.id)}
                                className="rounded-md border border-zinc-300 px-2 py-1 text-xs hover:bg-zinc-100"
                              >
                                Details
                              </button>
                              <button
                                type="button"
                                onClick={primaryAction.onClick}
                                className="rounded-md border border-zinc-300 px-2 py-1 text-xs hover:bg-zinc-100"
                              >
                                {primaryAction.label}
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  setOpenMenuId((current) =>
                                    current === position.id ? null : position.id,
                                  )
                                }
                                className="rounded-md border border-zinc-300 px-2 py-1 text-xs hover:bg-zinc-100"
                              >
                                ⋯
                              </button>
                              {openMenuId === position.id ? (
                                <div className="absolute z-10 mt-24 rounded-md border border-zinc-200 bg-white p-1 shadow-md">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      markManualCorrection(position.id);
                                      setOpenMenuId(null);
                                    }}
                                    className="block w-full rounded px-2 py-1 text-left text-xs text-zinc-700 hover:bg-zinc-100"
                                  >
                                    Wert korrigieren
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      updatePositionStatus(position.id, "Prüfung erforderlich");
                                      setOpenMenuId(null);
                                    }}
                                    className="block w-full rounded px-2 py-1 text-left text-xs text-zinc-700 hover:bg-zinc-100"
                                  >
                                    Prüfung zurücknehmen
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      updatePositionStatus(position.id, "Geprüft");
                                      setOpenMenuId(null);
                                    }}
                                    className="block w-full rounded px-2 py-1 text-left text-xs text-zinc-700 hover:bg-zinc-100"
                                  >
                                    Freigabe zurücknehmen
                                  </button>
                                </div>
                              ) : null}
                            </div>
                          </td>
                        </tr>
                        {isExpanded ? (
                          <tr className="bg-zinc-50">
                            <td colSpan={13} className="px-3 py-3">
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
                                        <td className="px-3 py-2">
                                          {detail.value || "Daten fehlen"}
                                        </td>
                                        <td className="px-3 py-2">{detail.unit}</td>
                                        <td className="px-3 py-2">
                                          {sourceLabel[detail.sourceType]}
                                        </td>
                                        <td className="px-3 py-2">
                                          {confidenceLabel[detail.confidence]}
                                        </td>
                                        <td className="px-3 py-2">
                                          {detail.manuallyChanged ? "ja" : "nein"}
                                        </td>
                                        <td className="px-3 py-2">
                                          {fieldStatusLabel[detail.reviewStatus]}
                                        </td>
                                      </tr>
                                    ))}
                                    <tr className="text-zinc-700">
                                      <td className="px-3 py-2">Produkttyp</td>
                                      <td className="px-3 py-2">{position.productType}</td>
                                      <td className="px-3 py-2">-</td>
                                      <td className="px-3 py-2">Dokument</td>
                                      <td className="px-3 py-2">hoch</td>
                                      <td className="px-3 py-2">nein</td>
                                      <td className="px-3 py-2">Geprüft</td>
                                    </tr>
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
          </section>
        );
      })}
    </div>
  );
}
