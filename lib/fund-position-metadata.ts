import type { FondsPosition } from "@/lib/calculate-vorabpauschale";
import { resolvePartialExemptionRate } from "@/lib/validate-fund-position";

/**
 * MVP-FX-Semantik für EZB-/Kursfelder in Umrechnungspfaden (z. B. `toEurFromLocal`, Strict-Resolver):
 * - **fx** = Fremdwährungseinheiten pro 1 EUR („1 EUR = fx …“).
 * - **EUR-Betrag** = Nominalbetrag in Fremdwährung / fx.
 *
 * Die Resolver `resolveEzbStart*` / `resolveEzbEnd*` liefern Werte in dieser fx-Bedeutung, sofern die
 * gespeicherten Rohdaten konsistent gepflegt sind.
 */

/** Steuerliche Fondskategorie (DB-Wert snake_case). */
export const TAX_FUND_TYPE_SELECT = [
  { key: "aktien" as const, label: "Aktienfonds" },
  { key: "misch" as const, label: "Mischfonds" },
  { key: "immobilien" as const, label: "Immobilienfonds (Inland)" },
  { key: "immobilien_ausland" as const, label: "Immobilienfonds (Ausland)" },
  { key: "sonstige" as const, label: "Sonstiger Investmentfonds" },
] as const;

export type TaxFundTypeKey = (typeof TAX_FUND_TYPE_SELECT)[number]["key"];

export function parseTaxFundTypeKey(raw: string | null | undefined): TaxFundTypeKey | null {
  const n = (raw ?? "").trim().toLowerCase().replace(/\s+/g, "_");
  if (!n) return null;
  const hit = TAX_FUND_TYPE_SELECT.find((o) => o.key === n);
  return hit?.key ?? null;
}

export function taxFundTypeKeyToFondsart(key: TaxFundTypeKey): FondsPosition["fondsart"] {
  return key;
}

export function teilfreistellungAnteilTextForTaxType(
  taxFundType: string | null | undefined,
  partialRate: number | null | undefined,
): string {
  const v = resolvePartialExemptionRate(taxFundType, partialRate);
  if (v === null) return "—";
  return `${(v * 100).toLocaleString("de-DE", { maximumFractionDigits: 2 })} %`;
}

/** Freie Produktbezeichnung (ETF, Fonds, …), nur Anzeige. */
export const PRODUCT_TYPE_SUGGESTIONS = ["ETF", "Fonds", "ETC", "Zertifikat"] as const;

export type DataOriginLabel = "Bankstatement" | "Manuell" | "API" | "—";

export function formatDataOrigin(value: string | null | undefined): DataOriginLabel {
  const v = (value ?? "").trim().toLowerCase();
  if (v === "bankstatement" || v === "statement" || v === "bank") return "Bankstatement";
  if (v === "manual" || v === "manuell") return "Manuell";
  if (v === "api") return "API";
  if (!v) return "—";
  return "—";
}

/** Liefert fx (Fremdwährungseinheiten pro 1 EUR) nach Priorität Jahresanfang → ezb_kurs → ezb_rate; Fallback 1. */
export function resolveEzbStart(row: {
  ezb_kurs_jahresanfang?: number | null;
  ezb_kurs?: number | null;
  ezb_rate?: number | null;
}): number | null {
  const a = row.ezb_kurs_jahresanfang;
  if (typeof a === "number" && Number.isFinite(a) && a > 0) return a;
  const b = row.ezb_kurs;
  if (typeof b === "number" && Number.isFinite(b) && b > 0) return b;
  const c = row.ezb_rate;
  if (typeof c === "number" && Number.isFinite(c) && c > 0) return c;
  return 1;
}

/** Liefert fx (Fremdwährungseinheiten pro 1 EUR) nach Priorität Jahresende → ezb_kurs → ezb_rate; Fallback 1. */
export function resolveEzbEnd(row: {
  ezb_kurs_jahresende?: number | null;
  ezb_kurs?: number | null;
  ezb_rate?: number | null;
}): number | null {
  const a = row.ezb_kurs_jahresende;
  if (typeof a === "number" && Number.isFinite(a) && a > 0) return a;
  const b = row.ezb_kurs;
  if (typeof b === "number" && Number.isFinite(b) && b > 0) return b;
  const c = row.ezb_rate;
  if (typeof c === "number" && Number.isFinite(c) && c > 0) return c;
  return 1;
}

/** Wie resolveEzbEnd, aber ohne Fallback 1: fx oder `null`, wenn kein positiver Kurs gesetzt ist. */
export function resolveEzbEndStrict(row: {
  ezb_kurs_jahresende?: number | null;
  ezb_kurs?: number | null;
  ezb_rate?: number | null;
}): number | null {
  const a = row.ezb_kurs_jahresende;
  if (typeof a === "number" && Number.isFinite(a) && a > 0) return a;
  const b = row.ezb_kurs;
  if (typeof b === "number" && Number.isFinite(b) && b > 0) return b;
  const c = row.ezb_rate;
  if (typeof c === "number" && Number.isFinite(c) && c > 0) return c;
  return null;
}

/** Wie resolveEzbStart, aber ohne Fallback 1: fx oder `null`, wenn kein positiver Kurs gesetzt ist. */
export function resolveEzbStartStrict(row: {
  ezb_kurs_jahresanfang?: number | null;
  ezb_kurs?: number | null;
  ezb_rate?: number | null;
}): number | null {
  const a = row.ezb_kurs_jahresanfang;
  if (typeof a === "number" && Number.isFinite(a) && a > 0) return a;
  const b = row.ezb_kurs;
  if (typeof b === "number" && Number.isFinite(b) && b > 0) return b;
  const c = row.ezb_rate;
  if (typeof c === "number" && Number.isFinite(c) && c > 0) return c;
  return null;
}

/**
 * Multiplikativer Kehrwert: liefert `1 / k` für `k > 0`.
 *
 * Exportname aus historischen Gründen. Im Dossier wird er genutzt, wenn der gespeicherte Kurs `k` zur
 * Anzeige „1 EUR = x Fremdwährung“ in die Größe **x = fx** über **x = 1/k** überführt werden soll.
 * Für reine EUR-Umrechnung nach MVP (`EUR = Fremdwährungsbetrag / fx`) dient {@link toEurFromLocal} mit
 * Divisor **fx** direkt — nicht mit `1/fx` aus diesem Hilfsfunktionsergebnis verwechseln.
 */
export function foreignUnitsPerOneEur(positiveRate: number): number | null {
  if (!Number.isFinite(positiveRate) || positiveRate <= 0) return null;
  return 1 / positiveRate;
}

/**
 * Wandelt einen NAV- oder Betrag in Fremdwährung in EUR um.
 * @param localAmount Betrag in Fremdwährung (bzw. EUR-Betrag, wenn Währung EUR).
 * @param fxForeignPerOneEur Fremdwährungseinheiten pro 1 EUR („1 EUR = fx …“); bei EUR ignoriert.
 * @returns `localAmount / fxForeignPerOneEur` für Fremdwährung, sonst `localAmount`.
 */
export function toEurFromLocal(
  localAmount: number | null | undefined,
  currency: string | null | undefined,
  fxForeignPerOneEur: number | null,
): number | null {
  if (localAmount === null || localAmount === undefined || Number.isNaN(localAmount)) return null;
  if ((currency ?? "EUR").toUpperCase() === "EUR") return localAmount;
  const fx = fxForeignPerOneEur && fxForeignPerOneEur > 0 ? fxForeignPerOneEur : null;
  if (!fx) return null;
  return localAmount / fx;
}
