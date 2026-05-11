import type { FondsPosition } from "@/lib/calculate-vorabpauschale";
import { resolvePartialExemptionRate } from "@/lib/validate-fund-position";

/** Steuerliche Fondskategorie (DB-Wert snake_case). */
export const TAX_FUND_TYPE_SELECT = [
  { key: "aktien" as const, label: "Aktienfonds" },
  { key: "misch" as const, label: "Mischfonds" },
  { key: "immobilien" as const, label: "Immobilienfonds (Inland)" },
  { key: "immobilien_ausland" as const, label: "Immobilienfonds (Ausland)" },
  { key: "sonstige" as const, label: "Sonstige / keine Teilfreistellung" },
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

export function toEurFromLocal(
  localNav: number | null | undefined,
  currency: string | null | undefined,
  ezb: number | null,
): number | null {
  if (localNav === null || localNav === undefined || Number.isNaN(localNav)) return null;
  if ((currency ?? "EUR").toUpperCase() === "EUR") return localNav;
  const fx = ezb && ezb > 0 ? ezb : null;
  if (!fx) return null;
  return localNav / fx;
}
