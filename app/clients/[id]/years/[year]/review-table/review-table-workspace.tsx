"use client";

import { Fragment, useEffect, useMemo, useState } from "react";

import { FundPositionDossier, type FundPositionDossierRow } from "@/components/fund-position-dossier";
import { TAX_FUND_TYPE_SELECT, teilfreistellungAnteilTextForTaxType } from "@/lib/fund-position-metadata";
import { supabase } from "@/lib/supabase";
import {
  fundPositionIssueBadges,
  rowToValidationInput,
  validateFundPosition,
} from "@/lib/validate-fund-position";

type ReviewStatus = "offen" | "in Prüfung" | "geprüft";
type FundPositionRow = FundPositionDossierRow;

type PortfolioRow = {
  id: string;
  bank_name: string;
  account_number: string;
};

type Block = {
  id: string;
  bank: string;
  label: string;
  positions: FundPositionRow[];
};

type PositionForm = {
  isin: string;
  fund_name: string;
  product_type: string;
  tax_fund_type: string;
  currency: string;
  units_start: string;
  units_end: string;
  price_start: string;
  price_end: string;
  distributions: string;
  purchase_date: string;
};

type ReviewTableWorkspaceProps = {
  clientId: string;
  year: string;
};

const EMPTY_FORM: PositionForm = {
  isin: "",
  fund_name: "",
  product_type: "",
  tax_fund_type: "sonstige",
  currency: "EUR",
  units_start: "",
  units_end: "",
  price_start: "",
  price_end: "",
  distributions: "0",
  purchase_date: "",
};

function mapReviewStatus(status: string | null): ReviewStatus {
  const normalized = (status ?? "").toLowerCase();
  if (normalized === "approved" || normalized === "geprüft" || normalized === "geprueft" || normalized === "gepruft")
    return "geprüft";
  if (normalized === "in prüfung" || normalized === "in_pruefung" || normalized === "inpruefung" || normalized === "reviewing")
    return "in Prüfung";
  return "offen";
}

function nextStatus(current: ReviewStatus): ReviewStatus {
  if (current === "offen") return "in Prüfung";
  if (current === "in Prüfung") return "geprüft";
  return "offen";
}

function toDbReviewStatus(status: ReviewStatus): string {
  return status;
}

function formatNumber(value: number | null, minimum = 2, maximum = 2): string {
  if (value === null) return "—";
  return value.toLocaleString("de-DE", {
    minimumFractionDigits: minimum,
    maximumFractionDigits: maximum,
  });
}

function formatUnits(value: number | null): string {
  if (value === null) return "—";
  const decimals = value.toString().includes(".") ? value.toString().split(".")[1].length : 0;
  const precision = Math.min(4, Math.max(2, decimals));
  return value.toLocaleString("de-DE", { minimumFractionDigits: precision, maximumFractionDigits: precision });
}

function positionValidation(position: FundPositionRow) {
  return validateFundPosition(rowToValidationInput(position));
}

function getDepotReviewStatus(
  positions: FundPositionRow[],
): "geprüft" | "teilweise geprüft" | "in Prüfung" {
  if (positions.length === 0) return "in Prüfung";
  const reviewedCount = positions.filter(
    (item) => mapReviewStatus(item.review_status) === "geprüft",
  ).length;
  if (reviewedCount === positions.length) return "geprüft";
  if (reviewedCount > 0) return "teilweise geprüft";
  return "in Prüfung";
}

function toNullableNumber(input: string): number | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed.replace(/\./g, "").replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
}

function taxFundTypeLabel(raw: string | null | undefined): string {
  const key = (raw ?? "").trim().toLowerCase().replace(/\s+/g, "_");
  const hit = TAX_FUND_TYPE_SELECT.find((o) => o.key === key);
  return hit?.label ?? (raw?.trim() ? raw : "—");
}

function formatCurrencyFx(position: FundPositionRow): string {
  const cur = (position.currency ?? "EUR").toUpperCase();
  if (cur === "EUR") return "EUR";
  const fx =
    position.ezb_kurs_jahresende ??
    position.ezb_kurs ??
    position.ezb_rate;
  if (typeof fx === "number" && Number.isFinite(fx) && fx > 0) {
    return `${cur} / ${fx.toLocaleString("de-DE", { minimumFractionDigits: 4, maximumFractionDigits: 6 })}`;
  }
  return `${cur} / —`;
}

function canBulkApproveDepot(block: Block): { ok: true } | { ok: false; message: string } {
  for (const position of block.positions) {
    const v = validateFundPosition(
      rowToValidationInput({ ...position, review_status: "geprüft" }),
    );
    if (!v.calculationReady) {
      const name = position.fund_name?.trim() || position.isin?.trim() || "Unbenannte Position";
      return {
        ok: false,
        message: `Depotfreigabe nicht möglich: Bei „${name}“ fehlen noch Pflichtangaben (${v.errors[0] ?? "Details in der Akte"}).`,
      };
    }
  }
  return { ok: true };
}

export function ReviewTableWorkspace({ clientId, year }: ReviewTableWorkspaceProps) {
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [collapsedBlockIds, setCollapsedBlockIds] = useState<string[]>([]);
  const [expandedPositionIds, setExpandedPositionIds] = useState<string[]>([]);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [modalMode, setModalMode] = useState<"add" | null>(null);
  const [modalPortfolioId, setModalPortfolioId] = useState<string | null>(null);
  const [dossierEditId, setDossierEditId] = useState<string | null>(null);
  const [form, setForm] = useState<PositionForm>(EMPTY_FORM);

  async function loadData() {
    setIsLoading(true);
    setErrorMessage(null);

    const { data: taxYear, error: taxYearError } = await supabase
      .from("tax_years")
      .select("id")
      .eq("client_id", clientId)
      .eq("year", Number(year))
      .maybeSingle<{ id: string }>();

    if (taxYearError || !taxYear) {
      setErrorMessage("Steuerjahr konnte nicht geladen werden.");
      setIsLoading(false);
      return;
    }
    const { data: portfolios, error: portfoliosError } = await supabase
      .from("portfolios")
      .select("id, bank_name, account_number")
      .eq("tax_year_id", taxYear.id)
      .returns<PortfolioRow[]>();

    if (portfoliosError) {
      setErrorMessage("Depots konnten nicht geladen werden.");
      setIsLoading(false);
      return;
    }

    const portfolioIds = portfolios.map((item) => item.id);
    const { data: fundPositions, error: fundPositionsError } = await supabase
      .from("fund_positions")
      .select("*")
      .in("portfolio_id", portfolioIds)
      .returns<FundPositionRow[]>();

    if (fundPositionsError) {
      setErrorMessage(
        `Fondspositionen konnten nicht geladen werden${fundPositionsError.message ? ` (${fundPositionsError.message})` : ""}.`,
      );
      setIsLoading(false);
      return;
    }

    const nextBlocks: Block[] = portfolios.map((portfolio) => ({
      id: portfolio.id,
      bank: portfolio.bank_name,
      label: portfolio.account_number,
      positions: fundPositions.filter((position) => position.portfolio_id === portfolio.id),
    }));

    setBlocks(nextBlocks);
    setIsLoading(false);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- async loadData aktualisiert Zustand nach Supabase
    void loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- bewusst nur bei clientId/Jahr neu laden
  }, [clientId, year]);

  const summary = useMemo(() => {
    const positions = blocks.flatMap((block) => block.positions);
    return {
      depotCount: blocks.length,
      positionCount: positions.length,
      reviewed: positions.filter((p) => mapReviewStatus(p.review_status) === "geprüft").length,
      calculationReady: positions.filter((p) => positionValidation(p).calculationReady).length,
    };
  }, [blocks]);

  function toggleBlock(blockId: string) {
    setCollapsedBlockIds((current) =>
      current.includes(blockId) ? current.filter((id) => id !== blockId) : [...current, blockId],
    );
  }

  function toggleExpanded(positionId: string) {
    setExpandedPositionIds((current) =>
      current.includes(positionId) ? current.filter((id) => id !== positionId) : [...current, positionId],
    );
  }

  async function handleCycleStatus(position: FundPositionRow) {
    const next = nextStatus(mapReviewStatus(position.review_status));
    const nextDb = toDbReviewStatus(next);
    const v = validateFundPosition(rowToValidationInput({ ...position, review_status: nextDb }));
    const { error } = await supabase
      .from("fund_positions")
      .update({
        review_status: nextDb,
        reviewed_at: new Date().toISOString(),
        calculation_ready: v.calculationReady,
        validation_errors: v.errors,
      })
      .eq("id", position.id);
    if (error) {
      setErrorMessage(`Status konnte nicht aktualisiert werden: ${error.message}`);
      return;
    }
    await loadData();
  }

  async function handleSetStatus(position: FundPositionRow, status: ReviewStatus) {
    const nextDb = toDbReviewStatus(status);
    const v = validateFundPosition(rowToValidationInput({ ...position, review_status: nextDb }));
    const { error } = await supabase
      .from("fund_positions")
      .update({
        review_status: nextDb,
        reviewed_at: new Date().toISOString(),
        calculation_ready: v.calculationReady,
        validation_errors: v.errors,
      })
      .eq("id", position.id);
    if (error) {
      setErrorMessage(`Status konnte nicht aktualisiert werden: ${error.message}`);
      return;
    }
    await loadData();
  }

  async function handleApproveDepot(block: Block) {
    if (block.positions.length === 0) return;
    const gate = canBulkApproveDepot(block);
    if (!gate.ok) {
      setErrorMessage(gate.message);
      return;
    }
    const ids = block.positions.map((position) => position.id);
    const now = new Date().toISOString();
    const { error } = await supabase
      .from("fund_positions")
      .update({
        review_status: "geprüft",
        reviewed_at: now,
        calculation_ready: true,
        validation_errors: [],
      })
      .in("id", ids);
    if (error) {
      setErrorMessage(`Depotfreigabe fehlgeschlagen: ${error.message}`);
      return;
    }
    await loadData();
  }

  function openAddModal(portfolioId: string) {
    setModalMode("add");
    setModalPortfolioId(portfolioId);
    setForm(EMPTY_FORM);
  }

  function closeModal() {
    if (isSaving) return;
    setModalMode(null);
    setModalPortfolioId(null);
    setForm(EMPTY_FORM);
  }

  function openDossierForEdit(position: FundPositionRow) {
    setExpandedPositionIds((current) =>
      current.includes(position.id) ? current : [...current, position.id],
    );
    setDossierEditId(position.id);
    setOpenMenuId(null);
  }

  async function saveModal() {
    if (modalMode !== "add" || !modalPortfolioId) return;
    setIsSaving(true);
    setErrorMessage(null);

    const cur = form.currency.trim().toUpperCase() || "EUR";
    const ezbDefault = cur === "EUR" ? 1 : null;
    const now = new Date().toISOString();

    const unitsEnd = toNullableNumber(form.units_end);
    const priceStart = toNullableNumber(form.price_start);
    const priceEnd = toNullableNumber(form.price_end);

    const draftRow: FundPositionRow = {
      id: "draft",
      portfolio_id: modalPortfolioId,
      isin: form.isin.trim() || null,
      fund_name: form.fund_name.trim() || null,
      product_type: form.product_type.trim() || null,
      tax_fund_type: form.tax_fund_type.trim() || "sonstige",
      partial_exemption_rate: null,
      currency: cur,
      units_start: toNullableNumber(form.units_start),
      units_end: unitsEnd,
      purchase_date: form.purchase_date.trim() || null,
      price_start: priceStart,
      price_end: priceEnd,
      nav_start_local: null,
      nav_end_local: null,
      distributions: toNullableNumber(form.distributions) ?? 0,
      review_status: "offen",
      data_source: "manuell",
      nav_data_source: null,
      ezb_data_source: null,
      ezb_rate: ezbDefault,
      ezb_kurs: ezbDefault,
      ezb_kurs_jahresanfang: ezbDefault,
      ezb_kurs_jahresende: ezbDefault,
      advisor_note: null,
      calculation_ready: false,
      validation_errors: [],
      created_at: null,
      updated_at: null,
      reviewed_at: now,
      reviewed_by: "manual-ui",
      statement_upload_id: null,
    };

    const validation = validateFundPosition(rowToValidationInput(draftRow));

    const payload: Record<string, unknown> = {
      portfolio_id: modalPortfolioId,
      isin: form.isin.trim() || null,
      fund_name: form.fund_name.trim() || null,
      product_type: form.product_type.trim() || null,
      tax_fund_type: form.tax_fund_type.trim() || "sonstige",
      currency: cur,
      units_start: toNullableNumber(form.units_start),
      units_end: unitsEnd,
      price_start: priceStart,
      price_end: priceEnd,
      distributions: toNullableNumber(form.distributions) ?? 0,
      purchase_date: form.purchase_date.trim() || null,
      data_source: "manuell",
      ezb_rate: ezbDefault,
      ezb_kurs: ezbDefault,
      ezb_kurs_jahresanfang: ezbDefault,
      ezb_kurs_jahresende: ezbDefault,
      reviewed_at: now,
      reviewed_by: "manual-ui",
      review_status: "offen",
      calculation_ready: validation.calculationReady,
      validation_errors: validation.errors,
    };

    const { error } = await supabase.from("fund_positions").insert(payload);
    if (error) {
      setErrorMessage(`Fonds konnte nicht angelegt werden: ${error.message}`);
      setIsSaving(false);
      return;
    }

    setIsSaving(false);
    closeModal();
    await loadData();
  }

  async function handleDelete(position: FundPositionRow) {
    const ok = window.confirm("Sind Sie sicher?");
    if (!ok) return;
    const { error } = await supabase.from("fund_positions").delete().eq("id", position.id);
    if (error) {
      setErrorMessage(`Position konnte nicht gelöscht werden: ${error.message}`);
      return;
    }
    await loadData();
  }

  if (isLoading) {
    return (
      <section className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
        <p className="text-sm text-zinc-600">Prüftabelle wird geladen...</p>
      </section>
    );
  }

  const tableColSpan = 12;

  return (
    <div className="space-y-3">
      <section className="rounded-xl border border-zinc-300 bg-white p-6 shadow-sm">
        <h2 className="text-3xl font-semibold tracking-tight text-zinc-900">Prüftabelle Steuerjahr {year}</h2>
        <p className="mt-2 text-sm text-zinc-600">
          Manuelle Kontrolle der Fondspositionen. In die Vorabpauschale fließen nur geprüfte und vollständig validierte Positionen ein.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-5 text-sm text-zinc-700">
          <p><span className="font-medium text-zinc-900">Depots</span> {summary.depotCount}</p>
          <p><span className="font-medium text-zinc-900">Positionen</span> {summary.positionCount}</p>
          <p><span className="font-medium text-zinc-900">Geprüft</span> {summary.reviewed}</p>
          <p><span className="font-medium text-zinc-900">Berechnungsfähig</span> {summary.calculationReady}</p>
        </div>
        {errorMessage ? (
          <p className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {errorMessage}
          </p>
        ) : null}
      </section>

      {blocks.map((block) => {
        const isCollapsed = collapsedBlockIds.includes(block.id);
        const depotStatus = getDepotReviewStatus(block.positions);
        const allReviewed = depotStatus === "geprüft";
        const notReadyCount = block.positions.filter((p) => !positionValidation(p).calculationReady).length;

        return (
          <section
            key={block.id}
            className="rounded-xl border border-zinc-300 bg-white p-4 shadow-sm"
          >
            <div className="border-b border-zinc-300 bg-zinc-100/80 px-3 py-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold tracking-tight text-zinc-900">{block.bank}</p>
                <div className="flex items-center gap-2">
                  <p className="text-xs text-zinc-700">Depot {block.label} · Steuerjahr {year}</p>
                  <button
                    type="button"
                    onClick={() => toggleBlock(block.id)}
                    className="inline-flex items-center rounded border border-zinc-300 bg-white p-1 text-zinc-700 hover:bg-zinc-100"
                    aria-label={isCollapsed ? "Depot ausklappen" : "Depot einklappen"}
                  >
                    <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" aria-hidden="true">
                      {isCollapsed ? (
                        <path d="M7 8l3 3 3-3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                      ) : (
                        <path d="M7 12l3-3 3 3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                      )}
                    </svg>
                  </button>
                </div>
              </div>
              <div className="mt-2 flex items-center gap-2 text-xs">
                <span
                  className={`rounded border px-2 py-0.5 ${
                    allReviewed
                      ? "border-emerald-700 text-emerald-800"
                      : depotStatus === "teilweise geprüft"
                        ? "border-zinc-400 text-zinc-700"
                        : "border-zinc-300 text-zinc-500"
                  }`}
                >
                  {allReviewed ? "geprüft ✓" : depotStatus}
                </span>
                <span className="text-zinc-600">Positionen: {block.positions.length}</span>
                <span className="text-zinc-600">Noch nicht berechnungsfähig: {notReadyCount}</span>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => void loadData()}
                  className="rounded border border-zinc-400 bg-white px-2 py-1 text-[11px] text-zinc-800 hover:bg-zinc-100"
                >
                  Daten aktualisieren
                </button>
                <button
                  type="button"
                  onClick={() => void handleApproveDepot(block)}
                  className="rounded border border-zinc-400 bg-white px-2 py-1 text-[11px] text-zinc-800 hover:bg-zinc-100"
                >
                  Depot freigeben
                </button>
                <button
                  type="button"
                  onClick={() => openAddModal(block.id)}
                  className="rounded border border-zinc-400 bg-white px-2 py-1 text-[11px] text-zinc-800 hover:bg-zinc-100"
                >
                  Fonds hinzufügen
                </button>
              </div>
            </div>

            {!isCollapsed ? (
              <div className="mt-3 overflow-x-auto">
                <table className="min-w-[1100px] divide-y divide-zinc-200 text-xs">
                  <thead className="bg-zinc-50 text-left text-zinc-600">
                    <tr>
                      <th className="px-2 py-2 font-medium">Fonds / ISIN</th>
                      <th className="px-2 py-2 font-medium">Produktart</th>
                      <th className="px-2 py-2 font-medium">Steuerliche Fondsart</th>
                      <th className="px-2 py-2 font-medium">Teilfreistellung</th>
                      <th className="px-2 py-2 font-medium text-right">Bestand 31.12.</th>
                      <th className="px-2 py-2 font-medium text-right">NAV 01.01.</th>
                      <th className="px-2 py-2 font-medium text-right">NAV 31.12.</th>
                      <th className="px-2 py-2 font-medium text-right">Ausschüttungen</th>
                      <th className="px-2 py-2 font-medium">Währung / FX</th>
                      <th className="px-2 py-2 font-medium">Prüfstatus</th>
                      <th className="px-2 py-2 font-medium">Berechnungsfähig</th>
                      <th className="px-2 py-2 font-medium">Aktion</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200">
                    {block.positions.map((position, index) => {
                      const status = mapReviewStatus(position.review_status);
                      const val = positionValidation(position);
                      const badges = fundPositionIssueBadges(rowToValidationInput(position));
                      const isExpanded = expandedPositionIds.includes(position.id);
                      return (
                        <Fragment key={position.id}>
                          <tr className={`align-top text-zinc-700 [font-variant-numeric:tabular-nums] ${index % 2 === 1 ? "bg-zinc-50/50" : "bg-white"}`}>
                            <td className="max-w-[200px] px-2 py-2">
                              <p className="font-medium leading-snug text-zinc-900">{position.fund_name?.trim() || "—"}</p>
                              <p className="mt-0.5 text-[11px] text-zinc-500">{position.isin?.trim() || "—"}</p>
                            </td>
                            <td className="px-2 py-2">{position.product_type?.trim() || "—"}</td>
                            <td className="px-2 py-2">{taxFundTypeLabel(position.tax_fund_type)}</td>
                            <td className="px-2 py-2">
                              {teilfreistellungAnteilTextForTaxType(position.tax_fund_type, position.partial_exemption_rate)}
                            </td>
                            <td className="px-2 py-2 text-right">{formatUnits(position.units_end)}</td>
                            <td className="px-2 py-2 text-right">{formatNumber(position.price_start)}</td>
                            <td className="px-2 py-2 text-right">{formatNumber(position.price_end)}</td>
                            <td className="px-2 py-2 text-right">{formatNumber(position.distributions)}</td>
                            <td className="px-2 py-2 whitespace-nowrap">{formatCurrencyFx(position)}</td>
                            <td className="px-2 py-2">
                              <select
                                value={status}
                                onChange={(event) => void handleSetStatus(position, event.target.value as ReviewStatus)}
                                className="max-w-[120px] rounded border border-zinc-300 bg-white px-1.5 py-1 text-[11px] text-zinc-700"
                              >
                                <option value="offen">offen</option>
                                <option value="in Prüfung">in Prüfung</option>
                                <option value="geprüft">geprüft</option>
                              </select>
                            </td>
                            <td className="max-w-[140px] px-2 py-2">
                              {val.calculationReady ? (
                                <span className="text-emerald-800">Ja</span>
                              ) : (
                                <div className="space-y-1">
                                  <span className="text-zinc-600">Nein</span>
                                  {badges.length > 0 ? (
                                    <div className="flex flex-wrap gap-1">
                                      {badges.map((b) => (
                                        <span
                                          key={b}
                                          className="inline-block rounded border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-900"
                                        >
                                          {b}
                                        </span>
                                      ))}
                                    </div>
                                  ) : null}
                                </div>
                              )}
                            </td>
                            <td className="px-2 py-2">
                              <div className="relative flex flex-wrap items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => {
                                    const wasExpanded = expandedPositionIds.includes(position.id);
                                    toggleExpanded(position.id);
                                    if (wasExpanded) {
                                      setDossierEditId((current) =>
                                        current === position.id ? null : current,
                                      );
                                    }
                                  }}
                                  className="rounded border border-zinc-300 px-2 py-1 text-[11px] hover:bg-zinc-100"
                                >
                                  Akte
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setOpenMenuId((current) =>
                                      current === position.id ? null : position.id,
                                    )
                                  }
                                  className="rounded border border-zinc-300 px-2 py-1 text-[11px] hover:bg-zinc-100"
                                >
                                  ⋯
                                </button>
                                {openMenuId === position.id ? (
                                  <div className="absolute right-0 top-7 z-10 rounded-md border border-zinc-200 bg-white p-1 shadow-md">
                                    <button
                                      type="button"
                                      onClick={() => void handleCycleStatus(position)}
                                      className="block w-full rounded px-2 py-1 text-left text-[11px] text-zinc-700 hover:bg-zinc-100"
                                    >
                                      Status wechseln
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => openDossierForEdit(position)}
                                      className="block w-full rounded px-2 py-1 text-left text-[11px] text-zinc-700 hover:bg-zinc-100"
                                    >
                                      Bearbeiten
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => void handleDelete(position)}
                                      className="block w-full rounded px-2 py-1 text-left text-[11px] text-red-700 hover:bg-red-50"
                                    >
                                      Löschen
                                    </button>
                                  </div>
                                ) : null}
                              </div>
                            </td>
                          </tr>
                          {isExpanded ? (
                            <tr>
                              <td colSpan={tableColSpan} className="border-t border-zinc-200 bg-zinc-50 px-2 py-2">
                                <div className="max-h-[min(70vh,560px)] overflow-y-auto rounded-lg border border-zinc-200 bg-white p-3 shadow-sm">
                                  <FundPositionDossier
                                    key={`${position.id}-${dossierEditId === position.id ? "e" : "v"}`}
                                    position={position}
                                    taxYear={Number(year)}
                                    depotBank={block.bank}
                                    depotLabel={block.label}
                                    startInEditMode={dossierEditId === position.id}
                                    onSaved={() => void loadData()}
                                    onExitEditMode={() =>
                                      setDossierEditId((current) =>
                                        current === position.id ? null : current,
                                      )
                                    }
                                  />
                                </div>
                              </td>
                            </tr>
                          ) : null}
                        </Fragment>
                      );
                    })}
                    {block.positions.length === 0 ? (
                      <tr>
                        <td colSpan={tableColSpan} className="px-3 py-4 text-center text-zinc-500">
                          Keine Fondspositionen für dieses Depot vorhanden.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            ) : null}
          </section>
        );
      })}

      {modalMode === "add" ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-3xl rounded-xl border border-zinc-300 bg-white p-5 shadow-lg">
            <h3 className="text-lg font-semibold text-zinc-900">Fonds hinzufügen</h3>
            <div className="mt-4 space-y-4">
              <div>
                <h4 className="text-sm font-semibold text-zinc-900">Fondsdaten</h4>
                <div className="mt-2 grid gap-3 md:grid-cols-2">
                  <label className="text-sm text-zinc-700">ISIN *
                    <input value={form.isin} onChange={(event) => setForm((c) => ({ ...c, isin: event.target.value }))} className="mt-1 w-full rounded border border-zinc-300 px-3 py-2" />
                  </label>
                  <label className="text-sm text-zinc-700">Fondsname *
                    <input value={form.fund_name} onChange={(event) => setForm((c) => ({ ...c, fund_name: event.target.value }))} className="mt-1 w-full rounded border border-zinc-300 px-3 py-2" />
                  </label>
                  <label className="text-sm text-zinc-700">Produktart
                    <input value={form.product_type} onChange={(event) => setForm((c) => ({ ...c, product_type: event.target.value }))} className="mt-1 w-full rounded border border-zinc-300 px-3 py-2" placeholder="ETF, Fonds, …" />
                  </label>
                  <label className="text-sm text-zinc-700">Steuerliche Fondsart *
                    <select
                      value={form.tax_fund_type}
                      onChange={(event) => setForm((c) => ({ ...c, tax_fund_type: event.target.value }))}
                      className="mt-1 w-full rounded border border-zinc-300 px-3 py-2"
                    >
                      {TAX_FUND_TYPE_SELECT.map((o) => (
                        <option key={o.key} value={o.key}>{o.label}</option>
                      ))}
                    </select>
                  </label>
                  <label className="text-sm text-zinc-700">Währung *
                    <input value={form.currency} onChange={(event) => setForm((c) => ({ ...c, currency: event.target.value }))} className="mt-1 w-full rounded border border-zinc-300 px-3 py-2 uppercase" />
                  </label>
                </div>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-zinc-900">Bestandsdaten</h4>
                <div className="mt-2 grid gap-3 md:grid-cols-2">
                  <label className="text-sm text-zinc-700">Anteile 01.01.
                    <input value={form.units_start} onChange={(event) => setForm((c) => ({ ...c, units_start: event.target.value }))} className="mt-1 w-full rounded border border-zinc-300 px-3 py-2" />
                  </label>
                  <label className="text-sm text-zinc-700">Anteile 31.12. *
                    <input value={form.units_end} onChange={(event) => setForm((c) => ({ ...c, units_end: event.target.value }))} className="mt-1 w-full rounded border border-zinc-300 px-3 py-2" />
                  </label>
                  <label className="text-sm text-zinc-700">Ausschüttungen
                    <input value={form.distributions} onChange={(event) => setForm((c) => ({ ...c, distributions: event.target.value }))} className="mt-1 w-full rounded border border-zinc-300 px-3 py-2" />
                  </label>
                  <label className="text-sm text-zinc-700">Kaufdatum (optional)
                    <input type="date" value={form.purchase_date} onChange={(event) => setForm((c) => ({ ...c, purchase_date: event.target.value }))} className="mt-1 w-full rounded border border-zinc-300 px-3 py-2" />
                  </label>
                </div>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-zinc-900">Kursdaten</h4>
                <div className="mt-2 grid gap-3 md:grid-cols-2">
                  <label className="text-sm text-zinc-700">NAV / Kurs 01.01. *
                    <input value={form.price_start} onChange={(event) => setForm((c) => ({ ...c, price_start: event.target.value }))} className="mt-1 w-full rounded border border-zinc-300 px-3 py-2" />
                  </label>
                  <label className="text-sm text-zinc-700">NAV / Kurs 31.12. *
                    <input value={form.price_end} onChange={(event) => setForm((c) => ({ ...c, price_end: event.target.value }))} className="mt-1 w-full rounded border border-zinc-300 px-3 py-2" />
                  </label>
                </div>
              </div>
            </div>
            <div className="mt-4 flex items-center justify-end gap-2">
              <button type="button" onClick={closeModal} className="rounded border border-zinc-300 px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-100">Abbrechen</button>
              <button type="button" onClick={() => void saveModal()} disabled={isSaving} className="rounded bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-60">
                {isSaving ? "Speichert..." : "Speichern"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
