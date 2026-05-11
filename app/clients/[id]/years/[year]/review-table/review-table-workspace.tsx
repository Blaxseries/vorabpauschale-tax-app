"use client";

import { Fragment, useEffect, useMemo, useState } from "react";

import { FundPositionDossier, type FundPositionDossierRow } from "@/components/fund-position-dossier";
import { supabase } from "@/lib/supabase";

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
  fund_type: string;
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
  fund_type: "",
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

function getHint(position: FundPositionRow): string {
  const issues: string[] = [];
  if (position.price_start === null) issues.push("price_start fehlt");
  if (position.price_end === null) issues.push("price_end fehlt");
  if (position.units_end === null) issues.push("Anteile 31.12. fehlen");
  return issues.join("; ");
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

export function ReviewTableWorkspace({ clientId, year }: ReviewTableWorkspaceProps) {
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [taxYearId, setTaxYearId] = useState<string | null>(null);
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
    setTaxYearId(taxYear.id);

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
    void loadData();
  }, [clientId, year]);

  const summary = useMemo(() => {
    const positions = blocks.flatMap((block) => block.positions);
    return {
      depotCount: blocks.length,
      positionCount: positions.length,
      reviewed: positions.filter((p) => mapReviewStatus(p.review_status) === "geprüft").length,
      open: positions.filter((p) => getHint(p).length > 0).length,
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
    const { error } = await supabase
      .from("fund_positions")
      .update({ review_status: toDbReviewStatus(next), reviewed_at: new Date().toISOString() })
      .eq("id", position.id);
    if (error) {
      setErrorMessage(`Status konnte nicht aktualisiert werden: ${error.message}`);
      return;
    }
    await loadData();
  }

  async function handleSetStatus(position: FundPositionRow, status: ReviewStatus) {
    const { error } = await supabase
      .from("fund_positions")
      .update({ review_status: toDbReviewStatus(status), reviewed_at: new Date().toISOString() })
      .eq("id", position.id);
    if (error) {
      setErrorMessage(`Status konnte nicht aktualisiert werden: ${error.message}`);
      return;
    }
    await loadData();
  }

  async function handleApproveDepot(block: Block) {
    if (block.positions.length === 0) return;
    const ids = block.positions.map((position) => position.id);
    const { error } = await supabase
      .from("fund_positions")
      .update({ review_status: "geprüft", reviewed_at: new Date().toISOString() })
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

    const payload: Record<string, unknown> = {
      portfolio_id: modalPortfolioId,
      isin: form.isin.trim() || null,
      fund_name: form.fund_name.trim() || null,
      fund_type: form.fund_type.trim() || null,
      currency: cur,
      units_start: toNullableNumber(form.units_start),
      units_end: toNullableNumber(form.units_end),
      price_start: toNullableNumber(form.price_start),
      price_end: toNullableNumber(form.price_end),
      distributions: toNullableNumber(form.distributions) ?? 0,
      purchase_date: form.purchase_date.trim() || null,
      data_source: "manuell",
      ezb_rate: ezbDefault,
      reviewed_at: new Date().toISOString(),
      reviewed_by: "manual-ui",
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

  return (
    <div className="space-y-3">
      <section className="rounded-xl border border-zinc-300 bg-white p-6 shadow-sm">
        <h2 className="text-3xl font-semibold tracking-tight text-zinc-900">Prüftabelle Steuerjahr {year}</h2>
        <p className="mt-2 text-sm text-zinc-600">
          Fachliche Gegenprüfung der extrahierten und angereicherten Depotdaten vor der Berechnung.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-5 text-sm text-zinc-700">
          <p><span className="font-medium text-zinc-900">Depots</span> {summary.depotCount}</p>
          <p><span className="font-medium text-zinc-900">Positionen</span> {summary.positionCount}</p>
          <p><span className="font-medium text-zinc-900">Geprüft</span> {summary.reviewed}</p>
          <p><span className="font-medium text-zinc-900">Offen</span> {summary.open}</p>
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
        const openItems = block.positions.filter((position) => getHint(position).length > 0).length;

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
                <span className="text-zinc-600">Offene Werte: {openItems}</span>
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
                <table className="min-w-[1200px] divide-y divide-zinc-200 text-sm">
                  <thead className="bg-zinc-50 text-left text-zinc-600">
                    <tr>
                      <th className="px-3 py-2 font-medium">Fondsname</th>
                      <th className="px-3 py-2 font-medium">ISIN</th>
                      <th className="px-3 py-2 font-medium">Währung</th>
                      <th className="px-3 py-2 font-medium text-right">Anteile 01.01.</th>
                      <th className="px-3 py-2 font-medium text-right">Anteile 31.12.</th>
                      <th className="px-3 py-2 font-medium text-right">NAV 01.01.</th>
                      <th className="px-3 py-2 font-medium text-right">NAV 31.12.</th>
                      <th className="px-3 py-2 font-medium text-right">Ausschüttungen</th>
                      <th className="px-3 py-2 font-medium">Prüfstatus</th>
                      <th className="px-3 py-2 font-medium">Hinweis</th>
                      <th className="px-3 py-2 font-medium">Aktion</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200">
                    {block.positions.map((position, index) => {
                      const status = mapReviewStatus(position.review_status);
                      const hint = getHint(position);
                      const isExpanded = expandedPositionIds.includes(position.id);
                      return (
                        <Fragment key={position.id}>
                          <tr className={`align-top text-zinc-700 [font-variant-numeric:tabular-nums] ${index % 2 === 1 ? "bg-zinc-50/50" : "bg-white"}`}>
                            <td className="px-3 py-2.5 font-medium text-zinc-900">{position.fund_name ?? "—"}</td>
                            <td className="px-3 py-2.5">{position.isin ?? "—"}</td>
                            <td className="px-3 py-2.5">{position.currency ?? "EUR"}</td>
                            <td className="px-3 py-2.5 text-right">{formatUnits(position.units_start)}</td>
                            <td className="px-3 py-2.5 text-right">
                              {position.units_end === null ? <span title="Pflichtfeld fehlt">⚠</span> : null} {formatUnits(position.units_end)}
                            </td>
                            <td className="px-3 py-2.5 text-right">
                              {position.price_start === null ? <span title="Pflichtfeld fehlt">⚠</span> : null} {formatNumber(position.price_start)}
                            </td>
                            <td className="px-3 py-2.5 text-right">
                              {position.price_end === null ? <span title="Pflichtfeld fehlt">⚠</span> : null} {formatNumber(position.price_end)}
                            </td>
                            <td className="px-3 py-2.5 text-right">{formatNumber(position.distributions)}</td>
                            <td className="px-3 py-2.5">
                              <select
                                value={status}
                                onChange={(event) => void handleSetStatus(position, event.target.value as ReviewStatus)}
                                className="rounded border border-zinc-300 bg-white px-2 py-1 text-xs text-zinc-700"
                              >
                                <option value="offen">offen</option>
                                <option value="in Prüfung">in Prüfung</option>
                                <option value="geprüft">geprüft</option>
                              </select>
                            </td>
                            <td className="px-3 py-2.5">
                              {hint ? (
                                <span className="text-xs text-zinc-700">⚠ {hint}</span>
                              ) : (
                                <span className="text-xs text-zinc-500">—</span>
                              )}
                            </td>
                            <td className="px-3 py-2.5">
                              <div className="relative flex items-center gap-1">
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
                                  className="rounded border border-zinc-300 px-2 py-1 text-xs hover:bg-zinc-100"
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
                                  className="rounded border border-zinc-300 px-2 py-1 text-xs hover:bg-zinc-100"
                                >
                                  ⋯
                                </button>
                                {openMenuId === position.id ? (
                                  <div className="absolute right-0 top-7 z-10 rounded-md border border-zinc-200 bg-white p-1 shadow-md">
                                    <button
                                      type="button"
                                      onClick={() => void handleCycleStatus(position)}
                                      className="block w-full rounded px-2 py-1 text-left text-xs text-zinc-700 hover:bg-zinc-100"
                                    >
                                      Status wechseln
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => openDossierForEdit(position)}
                                      className="block w-full rounded px-2 py-1 text-left text-xs text-zinc-700 hover:bg-zinc-100"
                                    >
                                      Bearbeiten
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => void handleDelete(position)}
                                      className="block w-full rounded px-2 py-1 text-left text-xs text-red-700 hover:bg-red-50"
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
                              <td colSpan={11} className="bg-zinc-50 px-3 py-4">
                                <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
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
                        <td colSpan={11} className="px-3 py-4 text-center text-zinc-500">
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
              <label className="text-sm text-zinc-700">Fondsart
                <input value={form.fund_type} onChange={(event) => setForm((c) => ({ ...c, fund_type: event.target.value }))} className="mt-1 w-full rounded border border-zinc-300 px-3 py-2" />
              </label>
              <label className="text-sm text-zinc-700">Währung *
                <input value={form.currency} onChange={(event) => setForm((c) => ({ ...c, currency: event.target.value }))} className="mt-1 w-full rounded border border-zinc-300 px-3 py-2 uppercase" />
              </label>
                </div>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-zinc-900">Bestandsdaten</h4>
                <div className="mt-2 grid gap-3 md:grid-cols-2">
              <label className="text-sm text-zinc-700">Anteile 01.01. *
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
              <label className="text-sm text-zinc-700">Kurs 01.01.
                <input value={form.price_start} onChange={(event) => setForm((c) => ({ ...c, price_start: event.target.value }))} className="mt-1 w-full rounded border border-zinc-300 px-3 py-2" />
              </label>
              <label className="text-sm text-zinc-700">Kurs 31.12. *
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
