import {
  getTeilfreistellungssatz,
  type FondsPosition,
} from "@/lib/calculate-vorabpauschale";

export const FUND_ART_SELECT = [
  { key: "aktien" as const, label: "Aktienfonds" },
  { key: "misch" as const, label: "Mischfonds" },
  { key: "immobilien" as const, label: "Immobilienfonds" },
  { key: "sonstige" as const, label: "Sonstiges" },
] as const;

export type FundArtKey = (typeof FUND_ART_SELECT)[number]["key"];

export function parseFundArtKey(raw: string | null | undefined): FundArtKey {
  const n = (raw ?? "").toLowerCase();
  if (n.includes("aktien")) return "aktien";
  if (n.includes("misch")) return "misch";
  if (n.includes("immobilien")) return "immobilien";
  return "sonstige";
}

export function fundArtKeyToCalcFondsart(key: FundArtKey): FondsPosition["fondsart"] {
  if (key === "aktien") return "aktien";
  if (key === "misch") return "misch";
  if (key === "immobilien") return "immobilien";
  return "sonstige";
}

export function fundArtKeyToDbString(key: FundArtKey): string {
  return FUND_ART_SELECT.find((o) => o.key === key)?.label ?? "Sonstiges";
}

export function teilfreistellungAnteilText(key: FundArtKey): string {
  const f = fundArtKeyToCalcFondsart(key);
  const v = getTeilfreistellungssatz(f);
  return `${(v * 100).toLocaleString("de-DE", { maximumFractionDigits: 2 })} %`;
}

/** Teilfreistellung aus freiem DB-Text (inkl. Immobilien-Ausland anhand Stichworten). */
export function teilfreistellungDecimalFromRaw(raw: string | null | undefined): number {
  const n = (raw ?? "").toLowerCase();
  if (n.includes("immobilien") && n.includes("ausland")) return getTeilfreistellungssatz("immobilien_ausland");
  if (n.includes("aktien")) return getTeilfreistellungssatz("aktien");
  if (n.includes("misch")) return getTeilfreistellungssatz("misch");
  if (n.includes("immobilien")) return getTeilfreistellungssatz("immobilien");
  return getTeilfreistellungssatz("sonstige");
}

export function teilfreistellungAnteilTextFromRaw(raw: string | null | undefined): string {
  const v = teilfreistellungDecimalFromRaw(raw);
  return `${(v * 100).toLocaleString("de-DE", { maximumFractionDigits: 2 })} %`;
}

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
