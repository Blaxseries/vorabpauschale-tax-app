"use client";

import { useEffect, useState } from "react";

import { getAnrechenbareMonate } from "@/lib/calculate-vorabpauschale";
import {
  PRODUCT_TYPE_SUGGESTIONS,
  TAX_FUND_TYPE_SELECT,
  foreignUnitsPerOneEur,
  formatDataOrigin,
  parseTaxFundTypeKey,
  resolveEzbEndStrict,
  resolveEzbStartStrict,
  teilfreistellungAnteilTextForTaxType,
  toEurFromLocal,
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

function parseValidationErrors(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((item): item is string => typeof item === "string");
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
      <h4 className="text-sm font-semibold text-zinc-900">{title}</h4>
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

  const currency = (position.currency ?? "EUR").toUpperCase();
  const isEur = currency === "EUR";

  const navStartLocal = position.nav_start_local ?? position.price_start;
  const navEndLocal = position.nav_end_local ?? position.price_end;

  const ezbStartStrict = resolveEzbStartStrict(position);
  const ezbEndStrict = resolveEzbEndStrict(position);

  const navStartEur =
    isEur ? navStartLocal : toEurFromLocal(navStartLocal, currency, ezbStartStrict);
  const navEndEur = isEur ? navEndLocal : toEurFromLocal(navEndLocal, currency, ezbEndStrict);

  const steuerlicheFondsartLabel = (() => {
    const k = parseTaxFundTypeKey(position.tax_fund_type);
    if (k) return TAX_FUND_TYPE_SELECT.find((o) => o.key === k)?.label ?? k;
    if (position.tax_fund_type?.trim()) return position.tax_fund_type.trim();
    return "—";
  })();

  const tfRateNumeric = resolvePartialExemptionRate(position.tax_fund_type, position.partial_exemption_rate);
  const tfRaw = teilfreistellungAnteilTextForTaxType(position.tax_fund_type, position.partial_exemption_rate);
  const teilfreistellungKopf =
    position.partial_exemption_rate !== null &&
    position.partial_exemption_rate !== undefined &&
    Number.isFinite(position.partial_exemption_rate)
      ? `${formatPercentDisplay(Math.max(0, Math.min(1, position.partial_exemption_rate)))} (manuell)`
      : tfRateNumeric === null
        ? "—"
        : tfRaw;

  const anrechenbar = getAnrechenbareMonate(position.purchase_date);
  const unterjaehrig = Boolean(position.purchase_date);

  const ezbQuelle = formatDataOrigin(position.ezb_data_source ?? position.data_source);

  const validationList = parseValidationErrors(position.validation_errors);

  function foreignPerOneEurInputFromDb(ezbEurPerForeign: number | null | undefined): string {
    if (typeof ezbEurPerForeign !== "number" || !Number.isFinite(ezbEurPerForeign) || ezbEurPerForeign <= 0) {
      return "";
    }
    const x = foreignUnitsPerOneEur(ezbEurPerForeign);
    if (x === null) return "";
    return String(x);
  }

  const [form, setForm] = useState({
    productType: position.product_type?.trim() ?? "",
    taxFundKey: parseTaxFundTypeKey(position.tax_fund_type) ?? "",
    partialExemptionOverride: "",
    purchaseDate: (position.purchase_date ?? "").slice(0, 10),
    priceStart: position.price_start?.toString() ?? "",
    priceEnd: position.price_end?.toString() ?? "",
    distributions: position.distributions?.toString() ?? "0",
    currency: (position.currency ?? "EUR").trim().toUpperCase() || "EUR",
    ezbJahresende: foreignPerOneEurInputFromDb(position.ezb_kurs_jahresende),
    advisorNote: position.advisor_note ?? "",
  });

  const formCurrency = (form.currency.trim() || "EUR").toUpperCase();
  const formIsEur = formCurrency === "EUR";

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Formular bei neuer Serverzeile zurücksetzen
    setForm({
      productType: position.product_type?.trim() ?? "",
      taxFundKey: parseTaxFundTypeKey(position.tax_fund_type) ?? "",
      partialExemptionOverride:
        position.partial_exemption_rate !== null &&
        position.partial_exemption_rate !== undefined &&
        Number.isFinite(position.partial_exemption_rate)
          ? String(position.partial_exemption_rate)
          : "",
      purchaseDate: (position.purchase_date ?? "").slice(0, 10),
      priceStart: position.price_start?.toString() ?? "",
      priceEnd: position.price_end?.toString() ?? "",
      distributions: position.distributions?.toString() ?? "0",
      currency: (position.currency ?? "EUR").trim().toUpperCase() || "EUR",
      ezbJahresende: foreignPerOneEurInputFromDb(position.ezb_kurs_jahresende),
      advisorNote: position.advisor_note ?? "",
    });
  }, [position]);

  async function handleSave() {
    setIsSaving(true);
    setSaveError(null);

    const cur = (form.currency.trim() || "EUR").toUpperCase();
    const eur = cur === "EUR";

    const priceStart = toNullableNumber(form.priceStart);
    const priceEnd = toNullableNumber(form.priceEnd);
    const dist = toNullableNumber(form.distributions) ?? 0;
    const partialOverride = toNullableNumber(form.partialExemptionOverride);
    const taxFundDb = form.taxFundKey.trim() || null;
    const xForeignPerEur = !eur ? toNullableNumber(form.ezbJahresende) : null;
    const ezbJe =
      eur ? 1 : xForeignPerEur !== null && xForeignPerEur > 0 ? 1 / xForeignPerEur : null;

    const ezbJahresendeVal = eur ? 1 : ezbJe;
    const ezbJa =
      eur
        ? 1
        : typeof position.ezb_kurs_jahresanfang === "number" &&
            Number.isFinite(position.ezb_kurs_jahresanfang) &&
            position.ezb_kurs_jahresanfang > 0
          ? position.ezb_kurs_jahresanfang
          : ezbJe !== null && ezbJe > 0
            ? ezbJe
            : null;
    const ezbKursVal = eur ? 1 : (ezbJe !== null ? ezbJe : position.ezb_kurs);
    const ezbRateVal = eur ? 1 : (ezbJe !== null ? ezbJe : position.ezb_rate);

    const mergedForValidate: FundPositionDossierRow = {
      ...position,
      currency: cur,
      product_type: form.productType.trim() || null,
      tax_fund_type: taxFundDb,
      partial_exemption_rate: partialOverride,
      purchase_date: form.purchaseDate.trim() || null,
      price_start: priceStart,
      price_end: priceEnd,
      distributions: dist,
      advisor_note: form.advisorNote.trim() || null,
      ezb_kurs_jahresanfang: ezbJa,
      ezb_kurs_jahresende: ezbJahresendeVal,
      ezb_kurs: ezbKursVal,
      ezb_rate: ezbRateVal,
    };

    const validation = validateFundPosition(rowToValidationInput(mergedForValidate));

    const { error } = await supabase
      .from("fund_positions")
      .update({
        currency: cur,
        product_type: form.productType.trim() || null,
        tax_fund_type: taxFundDb,
        partial_exemption_rate: partialOverride,
        purchase_date: form.purchaseDate.trim() || null,
        price_start: priceStart,
        price_end: priceEnd,
        distributions: dist,
        advisor_note: form.advisorNote.trim() || null,
        ezb_kurs_jahresanfang: ezbJa,
        ezb_kurs_jahresende: ezbJahresendeVal,
        ezb_kurs: ezbKursVal,
        ezb_rate: ezbRateVal,
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

  const ezbEndForLabel = ezbEndStrict;
  const foreignPerEur =
    ezbEndForLabel !== null ? foreignUnitsPerOneEur(ezbEndForLabel) : null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-zinc-200 pb-4">
        <div>
          <p className="text-xs font-medium text-zinc-500">Fondsakte · Steuerjahr {taxYear}</p>
          <p className="text-sm text-zinc-600">
            Depot {depotBank} · {depotLabel}
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

      {/* Kopfbereich */}
      <div className="rounded-lg border border-zinc-200 bg-zinc-50/80 p-4">
        <dl className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
          <div className="sm:col-span-2 lg:col-span-2">
            <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500">Fondsname</dt>
            <dd className="mt-0.5 text-base font-semibold text-zinc-900">{position.fund_name?.trim() || "—"}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500">ISIN</dt>
            <dd className="mt-0.5 font-mono text-zinc-900">{position.isin?.trim() || "—"}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500">Produktart</dt>
            <dd className="mt-0.5 text-zinc-900">{position.product_type?.trim() || "—"}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500">Steuerliche Fondsart</dt>
            <dd className="mt-0.5 text-zinc-900">{steuerlicheFondsartLabel}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500">Teilfreistellung</dt>
            <dd className="mt-0.5 text-zinc-900">{teilfreistellungKopf}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500">Prüfstatus</dt>
            <dd className="mt-0.5 text-zinc-900">{mapReviewStatusLabel(position.review_status)}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500">Berechnungsfähig</dt>
            <dd className="mt-0.5">
              {position.calculation_ready ? (
                <span className="font-medium text-emerald-800">Ja</span>
              ) : (
                <span className="font-medium text-zinc-700">Nein</span>
              )}
            </dd>
          </div>
        </dl>
      </div>

      {saveError ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{saveError}</p>
      ) : null}

      {isEditing ? (
        <div className="rounded-lg border border-zinc-200 bg-zinc-50/80 p-4">
          <p className="text-sm font-semibold text-zinc-900">Bearbeiten</p>
          <div className="mt-3 grid gap-4 md:grid-cols-2">
            <label className="block text-sm text-zinc-700">
              Produktart
              <input
                list="product-type-suggestions"
                value={form.productType}
                onChange={(e) => setForm((f) => ({ ...f, productType: e.target.value }))}
                className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm"
                placeholder="z. B. ETF, Fonds"
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
                onChange={(e) => setForm((f) => ({ ...f, taxFundKey: e.target.value }))}
                className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm"
              >
                <option value="">Bitte wählen …</option>
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
              Währung (ISO)
              <input
                value={form.currency}
                onChange={(e) =>
                  setForm((f) => ({ ...f, currency: e.target.value.toUpperCase() }))
                }
                className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm font-mono uppercase"
                placeholder="EUR"
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
            <label className="block text-sm text-zinc-700">
              NAV / Rücknahmepreis 01.01. ({formCurrency})
              <input
                value={form.priceStart}
                onChange={(e) => setForm((f) => ({ ...f, priceStart: e.target.value }))}
                className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm"
              />
            </label>
            <label className="block text-sm text-zinc-700">
              NAV / Rücknahmepreis 31.12. ({formCurrency})
              <input
                value={form.priceEnd}
                onChange={(e) => setForm((f) => ({ ...f, priceEnd: e.target.value }))}
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
            {!formIsEur ? (
              <label className="block text-sm text-zinc-700 md:col-span-2">
                EZB-Referenzkurs 31.12. (1 EUR = x Fremdwährung)
                <input
                  value={form.ezbJahresende}
                  onChange={(e) => setForm((f) => ({ ...f, ezbJahresende: e.target.value }))}
                  className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm"
                  placeholder="z. B. 0,86"
                />
                <p className="mt-1 text-xs text-zinc-500">
                  Wird später per API befüllt; aktuell manuell. Eingabe: Anzahl {formCurrency} für 1 EUR (entspricht
                  der fachlichen Lesart „1 EUR = x {formCurrency}“).
                </p>
              </label>
            ) : null}
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

      <Section title="Fonds & steuerliche Einordnung">
        <DRow label="Produktart" value={position.product_type?.trim() || "—"} />
        <DRow label="Steuerliche Fondsart" value={steuerlicheFondsartLabel} />
        <DRow
          label="Teilfreistellung"
          value={
            position.partial_exemption_rate !== null &&
            position.partial_exemption_rate !== undefined &&
            Number.isFinite(position.partial_exemption_rate)
              ? `${formatPercentDisplay(Math.max(0, Math.min(1, position.partial_exemption_rate)))} (manuell)`
              : tfRateNumeric === null
                ? "—"
                : `${tfRaw} (aus steuerlicher Fondsart)`
          }
        />
        <DRow label="Währung" value={currency} />
      </Section>

      <Section title="Berechnungswerte">
        <DRow label="Anteile 31.12." value={formatUnitsDisplay(position.units_end)} />
        <DRow
          label={`NAV / Rücknahmepreis 01.01. (${currency})`}
          value={formatNum(navStartLocal)}
        />
        <DRow
          label={`NAV / Rücknahmepreis 31.12. (${currency})`}
          value={formatNum(navEndLocal)}
        />
        <DRow
          label="Ausschüttungen im Jahr"
          value={`${formatNum(position.distributions, 2, 2)} EUR`}
        />
        <DRow
          label="Kaufdatum"
          value={
            position.purchase_date
              ? new Date(position.purchase_date).toLocaleDateString("de-DE")
              : "—"
          }
        />
        <DRow
          label="Verbleibende Monate"
          value={
            unterjaehrig
              ? `${anrechenbar} (aus Kaufdatum)`
              : "12 (ganzjähriger Bestand)"
          }
        />
        {isEur ? (
          <DRow
            label="Währung"
            value={<span className="font-normal text-zinc-800">EUR – keine Umrechnung erforderlich</span>}
          />
        ) : null}
      </Section>

      {!isEur ? (
        <Section title="Fremdwährung">
          <DRow label="Währung" value={currency} />
          <DRow
            label="Hinweis"
            value={<span className="font-normal text-zinc-800">Umrechnung in EUR erforderlich</span>}
          />
          <DRow
            label="EZB-Referenzkurs 31.12."
            value={
              ezbEndForLabel !== null && foreignPerEur !== null ? (
                <span>
                  1 EUR ={" "}
                  {foreignPerEur.toLocaleString("de-DE", {
                    minimumFractionDigits: 4,
                    maximumFractionDigits: 6,
                  })}{" "}
                  {currency}
                </span>
              ) : (
                "—"
              )
            }
          />
          <div className="sm:col-span-2">
            <dt className="text-zinc-600">Umrechnung</dt>
            <dd className="mt-1 text-sm font-normal text-zinc-800">
              [{currency}-Wert] ÷ EZB-Referenzkurs = EUR-Wert
            </dd>
          </div>
          <DRow label="Quelle des FX-Kurses" value={ezbQuelle} />
          <DRow label={`NAV 01.01. in ${currency}`} value={formatNum(navStartLocal)} />
          <DRow label="NAV 01.01. in EUR" value={navStartEur !== null ? formatNum(navStartEur) : "—"} />
          <DRow label={`NAV 31.12. in ${currency}`} value={formatNum(navEndLocal)} />
          <DRow label="NAV 31.12. in EUR" value={navEndEur !== null ? formatNum(navEndEur) : "—"} />
        </Section>
      ) : null}

      <Section title="Prüfung">
        <DRow label="Prüfstatus" value={mapReviewStatusLabel(position.review_status)} />
        <DRow
          label="Berechnungsfähig"
          value={
            position.calculation_ready ? (
              <span className="text-emerald-800">Ja</span>
            ) : (
              <span className="text-zinc-700">Nein</span>
            )
          }
        />
        <div className="sm:col-span-2">
          <dt className="text-zinc-600">Validierung</dt>
          <dd className="mt-1">
            {validationList.length > 0 ? (
              <ul className="list-inside list-disc space-y-0.5 text-sm font-normal text-zinc-800">
                {validationList.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            ) : (
              <span className="text-zinc-500">Keine gespeicherten Hinweise</span>
            )}
          </dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="text-zinc-600">Hinweis / Notiz</dt>
          <dd className="mt-1 whitespace-pre-wrap font-normal text-zinc-900">
            {position.advisor_note?.trim() ? position.advisor_note : "—"}
          </dd>
        </div>
      </Section>

      <details className="rounded-lg border border-zinc-200 bg-white shadow-sm">
        <summary className="cursor-pointer select-none px-4 py-3 text-sm font-semibold text-zinc-900 hover:bg-zinc-50">
          Technische Details
        </summary>
        <div className="border-t border-zinc-100 px-4 pb-4 pt-2">
          <dl className="grid gap-x-4 gap-y-2 text-sm sm:grid-cols-[minmax(180px,220px)_1fr] sm:items-baseline">
            <DRow label="Legacy Fondsart (fund_type)" value={position.fund_type?.trim() || "—"} />
            <DRow label="ezb_kurs" value={formatNum(position.ezb_kurs, 4, 8)} />
            <DRow label="ezb_rate" value={formatNum(position.ezb_rate, 4, 8)} />
            <DRow label="ezb_kurs_jahresanfang" value={formatNum(position.ezb_kurs_jahresanfang, 4, 8)} />
            <DRow label="ezb_kurs_jahresende" value={formatNum(position.ezb_kurs_jahresende, 4, 8)} />
            <DRow label="nav_start_local" value={formatNum(position.nav_start_local)} />
            <DRow label="nav_end_local" value={formatNum(position.nav_end_local)} />
            <DRow label="data_source" value={position.data_source?.trim() || "—"} />
            <DRow label="nav_data_source" value={position.nav_data_source?.trim() || "—"} />
            <DRow label="ezb_data_source" value={position.ezb_data_source?.trim() || "—"} />
            <DRow
              label="reviewed_at"
              value={
                position.reviewed_at
                  ? new Date(position.reviewed_at).toLocaleString("de-DE")
                  : "—"
              }
            />
            <DRow label="reviewed_by" value={position.reviewed_by?.trim() || "—"} />
            <DRow label="statement_upload_id" value={position.statement_upload_id?.trim() || "—"} />
            <DRow label="Anteile 01.01. (units_start)" value={formatUnitsDisplay(position.units_start)} />
            <DRow
              label="updated_at"
              value={
                position.updated_at
                  ? new Date(position.updated_at).toLocaleString("de-DE")
                  : "—"
              }
            />
          </dl>
        </div>
      </details>
    </div>
  );
}
