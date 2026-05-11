"use client";

import { useEffect, useMemo, useState } from "react";

import { getAnrechenbareMonate, getBasiszins } from "@/lib/calculate-vorabpauschale";
import {
  PRODUCT_TYPE_SUGGESTIONS,
  TAX_FUND_TYPE_SELECT,
  formatDataOrigin,
  parseTaxFundTypeKey,
  resolveEzbEnd,
  resolveEzbStart,
  teilfreistellungAnteilTextForTaxType,
  toEurFromLocal,
  type TaxFundTypeKey,
} from "@/lib/fund-position-metadata";
import {
  resolvePartialExemptionRate,
  rowToValidationInput,
  validateFundPosition,
} from "@/lib/validate-fund-position";
import { supabase } from "@/lib/supabase";

export type FundPositionDossierRow = {
  id: string;
  portfolio_id: string;
  isin: string | null;
  fund_name: string | null;
  fund_type?: string | null;
  product_type?: string | null;
  tax_fund_type?: string | null;
  partial_exemption_rate?: number | null;
  currency: string | null;
  units_start: number | null;
  units_end: number | null;
  purchase_date: string | null;
  price_start: number | null;
  price_end: number | null;
  nav_start_local: number | null;
  nav_end_local: number | null;
  distributions: number | null;
  review_status: string | null;
  data_source: string | null;
  nav_data_source: string | null;
  ezb_data_source: string | null;
  ezb_rate: number | null;
  ezb_kurs: number | null;
  ezb_kurs_jahresanfang: number | null;
  ezb_kurs_jahresende: number | null;
  advisor_note: string | null;
  calculation_ready?: boolean | null;
  validation_errors?: unknown;
  created_at: string | null;
  updated_at: string | null;
  reviewed_at: string | null;
  reviewed_by: string | null;
  statement_upload_id: string | null;
};

type FundPositionDossierProps = {
  position: FundPositionDossierRow;
  taxYear: number;
  depotBank: string;
  depotLabel: string;
  startInEditMode?: boolean;
  onSaved: () => void;
  onExitEditMode?: () => void;
};

function formatNum(
  value: number | null | undefined,
  minFraction = 2,
  maxFraction = 6,
): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return value.toLocaleString("de-DE", {
    minimumFractionDigits: minFraction,
    maximumFractionDigits: maxFraction,
  });
}

function formatUnitsDisplay(value: number | null): string {
  if (value === null) return "—";
  const s = value.toString();
  const decimals = s.includes(".") ? s.split(".")[1].length : 0;
  const f = Math.min(4, Math.max(2, decimals));
  return value.toLocaleString("de-DE", { minimumFractionDigits: f, maximumFractionDigits: f });
}

function formatPercentDisplay(rate: number): string {
  return `${(rate * 100).toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} %`;
}

function toNullableNumber(input: string): number | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed.replace(/\./g, "").replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
}

function mapReviewStatusLabel(status: string | null): "offen" | "in Prüfung" | "geprüft" {
  const normalized = (status ?? "").toLowerCase();
  if (
    normalized === "approved" ||
    normalized === "geprüft" ||
    normalized === "geprueft" ||
    normalized === "gepruft"
  )
    return "geprüft";
  if (
    normalized === "in prüfung" ||
    normalized === "in_pruefung" ||
    normalized === "inpruefung" ||
    normalized === "reviewing"
  )
    return "in Prüfung";
  return "offen";
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
      <h4 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{title}</h4>
      <dl className="mt-3 grid gap-x-4 gap-y-2 text-sm sm:grid-cols-[minmax(160px,220px)_1fr] sm:items-baseline">
        {children}
      </dl>
    </div>
  );
}

function DRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <>
      <dt className="text-zinc-600">{label}</dt>
      <dd className="font-medium text-zinc-900 [font-variant-numeric:tabular-nums]">{value}</dd>
    </>
  );
}

function defaultTaxFundKey(raw: string | null | undefined): TaxFundTypeKey {
  return parseTaxFundTypeKey(raw) ?? "sonstige";
}

export function FundPositionDossier({
  position,
  taxYear,
  depotBank,
  depotLabel,
  startInEditMode = false,
  onSaved,
  onExitEditMode,
}: FundPositionDossierProps) {
  const [isEditing, setIsEditing] = useState(startInEditMode);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Parent signalisiert Bearbeitungsmodus
    if (startInEditMode) setIsEditing(true);
  }, [startInEditMode]);

  const basiszins = useMemo(() => getBasiszins(taxYear), [taxYear]);

  const currency = (position.currency ?? "EUR").toUpperCase();

  const ezbStart = resolveEzbStart(position);
  const ezbEnd = resolveEzbEnd(position);

  const navStartLocal = position.nav_start_local ?? position.price_start;
  const navEndLocal = position.nav_end_local ?? position.price_end;

  const navStartEur =
    currency === "EUR"
      ? navStartLocal
      : toEurFromLocal(navStartLocal, currency, ezbStart);
  const navEndEur =
    currency === "EUR" ? navEndLocal : toEurFromLocal(navEndLocal, currency, ezbEnd);

  const taxFundKey = defaultTaxFundKey(position.tax_fund_type);
  const tfRateNumeric = resolvePartialExemptionRate(position.tax_fund_type, position.partial_exemption_rate);
  const tfRaw = teilfreistellungAnteilTextForTaxType(position.tax_fund_type, position.partial_exemption_rate);
  const tfJaNein =
    tfRateNumeric > 0 ? `Ja, Satz ${tfRaw}` : `Nein (Satz ${tfRaw})`;

  const anrechenbar = getAnrechenbareMonate(position.purchase_date);
  const unterjaehrig = Boolean(position.purchase_date);

  const navQuelle = formatDataOrigin(position.nav_data_source ?? position.data_source);
  const ezbQuelle = formatDataOrigin(position.ezb_data_source ?? position.data_source);

  const [form, setForm] = useState({
    productType: position.product_type?.trim() ?? "",
    taxFundKey,
    partialExemptionOverride: "",
    purchaseDate: (position.purchase_date ?? "").slice(0, 10),
    priceStart: position.price_start?.toString() ?? "",
    priceEnd: position.price_end?.toString() ?? "",
    navStartLocal: position.nav_start_local?.toString() ?? "",
    navEndLocal: position.nav_end_local?.toString() ?? "",
    ezbStart: (position.ezb_kurs_jahresanfang ?? position.ezb_kurs ?? position.ezb_rate)?.toString() ?? "",
    ezbEnd: (position.ezb_kurs_jahresende ?? position.ezb_kurs ?? position.ezb_rate)?.toString() ?? "",
    distributions: position.distributions?.toString() ?? "0",
    advisorNote: position.advisor_note ?? "",
  });

  useEffect(() => {
    const key = defaultTaxFundKey(position.tax_fund_type);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Formular bei neuer Serverzeile zurücksetzen
    setForm({
      productType: position.product_type?.trim() ?? "",
      taxFundKey: key,
      partialExemptionOverride:
        position.partial_exemption_rate !== null &&
        position.partial_exemption_rate !== undefined &&
        Number.isFinite(position.partial_exemption_rate)
          ? String(position.partial_exemption_rate)
          : "",
      purchaseDate: (position.purchase_date ?? "").slice(0, 10),
      priceStart: position.price_start?.toString() ?? "",
      priceEnd: position.price_end?.toString() ?? "",
      navStartLocal: position.nav_start_local?.toString() ?? "",
      navEndLocal: position.nav_end_local?.toString() ?? "",
      ezbStart: (position.ezb_kurs_jahresanfang ?? position.ezb_kurs ?? position.ezb_rate)?.toString() ?? "",
      ezbEnd: (position.ezb_kurs_jahresende ?? position.ezb_kurs ?? position.ezb_rate)?.toString() ?? "",
      distributions: position.distributions?.toString() ?? "0",
      advisorNote: position.advisor_note ?? "",
    });
  }, [position]);

  async function handleSave() {
    setIsSaving(true);
    setSaveError(null);

    const priceStart = toNullableNumber(form.priceStart);
    const priceEnd = toNullableNumber(form.priceEnd);
    const navSL = toNullableNumber(form.navStartLocal);
    const navEL = toNullableNumber(form.navEndLocal);
    const ezbS = toNullableNumber(form.ezbStart);
    const ezbE = toNullableNumber(form.ezbEnd);
    const dist = toNullableNumber(form.distributions) ?? 0;
    const partialOverride = toNullableNumber(form.partialExemptionOverride);
    const primaryEzb = ezbE ?? ezbS ?? 1;

    const mergedForValidate: FundPositionDossierRow = {
      ...position,
      product_type: form.productType.trim() || null,
      tax_fund_type: form.taxFundKey,
      partial_exemption_rate: partialOverride,
      purchase_date: form.purchaseDate.trim() || null,
      price_start: priceStart,
      price_end: priceEnd,
      nav_start_local: navSL,
      nav_end_local: navEL,
      ezb_kurs_jahresanfang: ezbS,
      ezb_kurs_jahresende: ezbE,
      ezb_kurs: primaryEzb,
      ezb_rate: primaryEzb,
      distributions: dist,
      advisor_note: form.advisorNote.trim() || null,
    };

    const validation = validateFundPosition(rowToValidationInput(mergedForValidate));

    const { error } = await supabase
      .from("fund_positions")
      .update({
        product_type: form.productType.trim() || null,
        tax_fund_type: form.taxFundKey,
        partial_exemption_rate: partialOverride,
        purchase_date: form.purchaseDate.trim() || null,
        price_start: priceStart,
        price_end: priceEnd,
        nav_start_local: navSL,
        nav_end_local: navEL,
        ezb_kurs_jahresanfang: ezbS,
        ezb_kurs_jahresende: ezbE,
        ezb_kurs: primaryEzb,
        ezb_rate: primaryEzb,
        distributions: dist,
        advisor_note: form.advisorNote.trim() || null,
        calculation_ready: validation.calculationReady,
        validation_errors: validation.errors,
      })
      .eq("id", position.id);

    setIsSaving(false);
    if (error) {
      setSaveError(error.message);
      return;
    }

    setIsEditing(false);
    onExitEditMode?.();
    onSaved();
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-zinc-500">
            Vorabpauschale — Rohdaten und Parameter
          </p>
          <p className="text-sm text-zinc-600">
            Depot {depotBank} · {depotLabel} · Steuerjahr {taxYear}
          </p>
        </div>
        {!isEditing ? (
          <button
            type="button"
            onClick={() => setIsEditing(true)}
            className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50"
          >
            Bearbeiten
          </button>
        ) : (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                setIsEditing(false);
                onExitEditMode?.();
              }}
              className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-50"
              disabled={isSaving}
            >
              Abbrechen
            </button>
            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={isSaving}
              className="rounded-md bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60"
            >
              {isSaving ? "Speichern…" : "Speichern"}
            </button>
          </div>
        )}
      </div>

      {saveError ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{saveError}</p>
      ) : null}

      {isEditing ? (
        <div className="rounded-lg border border-zinc-200 bg-zinc-50/80 p-4">
          <p className="text-sm font-medium text-zinc-900">Bearbeiten</p>
          <div className="mt-3 grid gap-4 md:grid-cols-2">
            <label className="block text-sm text-zinc-700">
              Produktart (z. B. ETF, Fonds)
              <input
                list="product-type-suggestions"
                value={form.productType}
                onChange={(e) => setForm((f) => ({ ...f, productType: e.target.value }))}
                className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm"
                placeholder="ETF, Fonds, …"
              />
              <datalist id="product-type-suggestions">
                {PRODUCT_TYPE_SUGGESTIONS.map((s) => (
                  <option key={s} value={s} />
                ))}
              </datalist>
            </label>
            <label className="block text-sm text-zinc-700">
              Steuerliche Fondsart
              <select
                value={form.taxFundKey}
                onChange={(e) =>
                  setForm((f) => ({ ...f, taxFundKey: e.target.value as TaxFundTypeKey }))
                }
                className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm"
              >
                {TAX_FUND_TYPE_SELECT.map((o) => (
                  <option key={o.key} value={o.key}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm text-zinc-700 md:col-span-2">
              Teilfreistellung manuell (optional, 0–1; leer = aus steuerlicher Fondsart)
              <input
                value={form.partialExemptionOverride}
                onChange={(e) => setForm((f) => ({ ...f, partialExemptionOverride: e.target.value }))}
                className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm"
                placeholder="z. B. 0,3"
              />
            </label>
            <label className="block text-sm text-zinc-700">
              Kaufdatum (bei unterjährigem Erwerb)
              <input
                type="date"
                value={form.purchaseDate}
                onChange={(e) => setForm((f) => ({ ...f, purchaseDate: e.target.value }))}
                className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm"
              />
            </label>
            <div />
            <label className="block text-sm text-zinc-700">
              NAV 01.01. ({currency})
              <input
                value={form.priceStart}
                onChange={(e) => setForm((f) => ({ ...f, priceStart: e.target.value }))}
                className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm"
              />
            </label>
            <label className="block text-sm text-zinc-700">
              NAV 31.12. ({currency})
              <input
                value={form.priceEnd}
                onChange={(e) => setForm((f) => ({ ...f, priceEnd: e.target.value }))}
                className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm"
              />
            </label>
            <label className="block text-sm text-zinc-700">
              NAV 01.01. (lokal, optional)
              <input
                value={form.navStartLocal}
                onChange={(e) => setForm((f) => ({ ...f, navStartLocal: e.target.value }))}
                className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm"
              />
            </label>
            <label className="block text-sm text-zinc-700">
              NAV 31.12. (lokal, optional)
              <input
                value={form.navEndLocal}
                onChange={(e) => setForm((f) => ({ ...f, navEndLocal: e.target.value }))}
                className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm"
              />
            </label>
            <label className="block text-sm text-zinc-700">
              EZB-Kurs 01.01. (falls Fremdwährung)
              <input
                value={form.ezbStart}
                onChange={(e) => setForm((f) => ({ ...f, ezbStart: e.target.value }))}
                className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm"
              />
            </label>
            <label className="block text-sm text-zinc-700">
              EZB-Kurs 31.12. (falls Fremdwährung)
              <input
                value={form.ezbEnd}
                onChange={(e) => setForm((f) => ({ ...f, ezbEnd: e.target.value }))}
                className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm"
              />
            </label>
            <label className="block text-sm text-zinc-700 md:col-span-2">
              Ausschüttungen im Jahr (EUR)
              <input
                value={form.distributions}
                onChange={(e) => setForm((f) => ({ ...f, distributions: e.target.value }))}
                className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm"
              />
            </label>
            <label className="block text-sm text-zinc-700 md:col-span-2">
              Hinweis / Notiz für den Steuerberater
              <textarea
                value={form.advisorNote}
                onChange={(e) => setForm((f) => ({ ...f, advisorNote: e.target.value }))}
                rows={3}
                className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm"
              />
            </label>
          </div>
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <Section title="Fondsinformationen">
          <DRow label="Fondsname" value={position.fund_name ?? "—"} />
          <DRow label="ISIN" value={position.isin ?? "—"} />
          <DRow label="Produktart" value={position.product_type?.trim() ? position.product_type : "—"} />
          <DRow
            label="Steuerliche Fondsart"
            value={
              TAX_FUND_TYPE_SELECT.find((o) => o.key === taxFundKey)?.label ??
              (position.tax_fund_type?.trim() ? position.tax_fund_type : "—")
            }
          />
          <DRow
            label="Teilfreistellung (Satz)"
            value={
              position.partial_exemption_rate !== null &&
              position.partial_exemption_rate !== undefined &&
              Number.isFinite(position.partial_exemption_rate)
                ? `${formatPercentDisplay(Math.max(0, Math.min(1, position.partial_exemption_rate)))} (manuell)`
                : `${tfRaw} (aus Fondsart)`
            }
          />
          <DRow label="Währung" value={currency} />
        </Section>

        <Section title="Bestandsinformationen">
          <DRow label="Anteile 01.01." value={formatUnitsDisplay(position.units_start)} />
          <DRow label="Anteile 31.12." value={formatUnitsDisplay(position.units_end)} />
          <DRow
            label="Kaufdatum"
            value={
              position.purchase_date
                ? new Date(position.purchase_date).toLocaleDateString("de-DE")
                : "— (ganzjährig unterstellt)"
            }
          />
          <DRow
            label="Verbleibende Monate (Ansatz)"
            value={
              unterjaehrig
                ? `${anrechenbar} (automatisch aus Kaufdatum)`
                : "12 (ganzjähriger Bestand unterstellt)"
            }
          />
        </Section>

        <Section title="Kursdaten">
          <DRow label={`NAV 01.01. in ${currency}`} value={formatNum(navStartLocal)} />
          <DRow
            label="NAV 01.01. in EUR"
            value={navStartEur !== null ? formatNum(navStartEur) : "—"}
          />
          <DRow label={`NAV 31.12. in ${currency}`} value={formatNum(navEndLocal)} />
          <DRow label="NAV 31.12. in EUR" value={navEndEur !== null ? formatNum(navEndEur) : "—"} />
          <DRow
            label="EZB-Kurs 01.01."
            value={currency === "EUR" ? "1 (EUR)" : formatNum(ezbStart, 4, 6)}
          />
          <DRow
            label="EZB-Kurs 31.12."
            value={currency === "EUR" ? "1 (EUR)" : formatNum(ezbEnd, 4, 6)}
          />
        </Section>

        <Section title="Steuerrelevante Parameter">
          <DRow
            label="Ausschüttungen im Jahr"
            value={`${formatNum(position.distributions, 2, 2)} EUR`}
          />
          <DRow label="Basiszins des Jahres" value={formatPercentDisplay(basiszins)} />
          <DRow label="Teilfreistellung (für Berechnung)" value={tfJaNein} />
        </Section>

        <Section title="Datenherkunft">
          <DRow label="Quelle der Kursdaten" value={navQuelle} />
          <DRow label="Quelle EZB-Kurs" value={ezbQuelle} />
          <DRow
            label="Letzte Aktualisierung"
            value={
              position.updated_at
                ? new Date(position.updated_at).toLocaleString("de-DE")
                : "—"
            }
          />
        </Section>

        <Section title="Prüfstatus">
          <DRow label="Status" value={mapReviewStatusLabel(position.review_status)} />
          <DRow
            label="Berechnungsfähig"
            value={
              position.calculation_ready ? (
                <span className="text-emerald-800">Ja</span>
              ) : (
                <span className="text-zinc-600">Nein</span>
              )
            }
          />
          <DRow
            label="Hinweis / Notiz"
            value={
              position.advisor_note?.trim() ? (
                <span className="whitespace-pre-wrap font-normal">{position.advisor_note}</span>
              ) : (
                "—"
              )
            }
          />
        </Section>
      </div>
    </div>
  );
}
