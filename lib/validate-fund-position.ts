import { getTeilfreistellungssatz, type FondsPosition } from "@/lib/calculate-vorabpauschale";

export type FundPositionValidationInput = {
  isin?: string | null;
  fund_name?: string | null;
  tax_fund_type?: string | null;
  units_end?: number | null;
  price_start?: number | null;
  price_end?: number | null;
  currency?: string | null;
  distributions?: number | null;
  ezb_kurs_jahresende?: number | null;
  ezb_kurs?: number | null;
  ezb_rate?: number | null;
  review_status?: string | null;
  product_type?: string | null;
};

export type FundPositionValidationResult = {
  calculationReady: boolean;
  errors: string[];
  warnings: string[];
};

const TAX_FUND_TYPES = new Set<FondsPosition["fondsart"]>([
  "aktien",
  "misch",
  "immobilien",
  "immobilien_ausland",
  "sonstige",
]);

function normalizeReviewStatus(status: string | null | undefined): string {
  return (status ?? "").trim().toLowerCase();
}

function isReviewedGeprueft(status: string | null | undefined): boolean {
  const n = normalizeReviewStatus(status);
  return n === "geprüft" || n === "geprueft" || n === "gepruft" || n === "approved";
}

function parseTaxFundType(raw: string | null | undefined): FondsPosition["fondsart"] | null {
  const n = (raw ?? "").trim().toLowerCase().replace(/\s+/g, "_");
  if (!n) return null;
  if (TAX_FUND_TYPES.has(n as FondsPosition["fondsart"])) {
    return n as FondsPosition["fondsart"];
  }
  return null;
}

function resolveFxEndRate(row: FundPositionValidationInput): number | null {
  const candidates = [row.ezb_kurs_jahresende, row.ezb_kurs, row.ezb_rate];
  for (const v of candidates) {
    if (typeof v === "number" && Number.isFinite(v) && v > 0) return v;
  }
  return null;
}

function hasText(value: string | null | undefined): boolean {
  return Boolean((value ?? "").trim());
}

/**
 * Zentrale Prüfung, ob eine Fondsposition in die Vorabpauschale-Berechnung einfließen darf.
 */
export function validateFundPosition(position: FundPositionValidationInput): FundPositionValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!hasText(position.isin)) {
    errors.push("ISIN fehlt.");
  }
  if (!hasText(position.fund_name)) {
    errors.push("Fondsname fehlt.");
  }

  const taxType = parseTaxFundType(position.tax_fund_type);
  if (!hasText(position.tax_fund_type)) {
    errors.push("Steuerliche Fondsart fehlt.");
  } else if (!taxType) {
    errors.push("Steuerliche Fondsart ist ungültig.");
  }

  if (position.units_end === null || position.units_end === undefined || Number.isNaN(position.units_end)) {
    errors.push("Bestand per 31.12. fehlt.");
  }

  if (position.price_start === null || position.price_start === undefined || Number.isNaN(position.price_start)) {
    errors.push("NAV per 01.01. fehlt.");
  }

  if (position.price_end === null || position.price_end === undefined || Number.isNaN(position.price_end)) {
    errors.push("NAV per 31.12. fehlt.");
  }

  if (!hasText(position.currency)) {
    errors.push("Währung fehlt.");
  } else {
    const cur = (position.currency ?? "").trim().toUpperCase();
    if (cur !== "EUR") {
      const fx = resolveFxEndRate(position);
      if (fx === null) {
        errors.push("Für Fremdwährung fehlt ein gültiger EZB-Kurs (Jahresende, EZB-Kurs oder EZB-Satz > 0).");
      }
    }
  }

  if (!isReviewedGeprueft(position.review_status)) {
    errors.push('Prüfstatus muss „geprüft“ sein.');
  }

  if (!hasText(position.product_type)) {
    warnings.push("Produktart ist nicht gesetzt.");
  }

  const calculationReady = errors.length === 0;

  return { calculationReady, errors, warnings };
}

/** Kurz-Badges für die Prüftabelle (aus Validierungsfehlern abgeleitet). */
export function fundPositionIssueBadges(position: FundPositionValidationInput): string[] {
  const { errors } = validateFundPosition(position);
  const badges: string[] = [];
  for (const e of errors) {
    if (e.includes("ISIN")) badges.push("ISIN fehlt");
    else if (e.includes("Fondsname")) badges.push("Name fehlt");
    else if (e.includes("Steuerliche Fondsart")) badges.push("Fondsart fehlt");
    else if (e.includes("Bestand per 31.12.")) badges.push("Bestand fehlt");
    else if (e.includes("NAV per 01.01.")) badges.push("NAV 01.01. fehlt");
    else if (e.includes("NAV per 31.12.")) badges.push("NAV 31.12. fehlt");
    else if (e.includes("Währung fehlt")) badges.push("Währung fehlt");
    else if (e.includes("EZB-Kurs")) badges.push("FX fehlt");
    else if (e.includes("Prüfstatus")) badges.push("Nicht geprüft");
    else badges.push(e.replace(/\.$/, ""));
  }
  return [...new Set(badges)];
}

export function rowToValidationInput(row: {
  isin?: string | null;
  fund_name?: string | null;
  tax_fund_type?: string | null;
  units_end?: number | null;
  price_start?: number | null;
  price_end?: number | null;
  currency?: string | null;
  distributions?: number | null;
  ezb_kurs_jahresende?: number | null;
  ezb_kurs?: number | null;
  ezb_rate?: number | null;
  review_status?: string | null;
  product_type?: string | null;
}): FundPositionValidationInput {
  return {
    isin: row.isin,
    fund_name: row.fund_name,
    tax_fund_type: row.tax_fund_type,
    units_end: row.units_end,
    price_start: row.price_start,
    price_end: row.price_end,
    currency: row.currency,
    distributions: row.distributions,
    ezb_kurs_jahresende: row.ezb_kurs_jahresende,
    ezb_kurs: row.ezb_kurs,
    ezb_rate: row.ezb_rate,
    review_status: row.review_status,
    product_type: row.product_type,
  };
}

/** Teilfreistellung für Anzeige/Berechnung: expliziter Satz oder Ableitung aus steuerlicher Fondsart. */
export function resolvePartialExemptionRate(
  taxFundType: string | null | undefined,
  partialExemptionRate: number | null | undefined,
): number {
  if (typeof partialExemptionRate === "number" && Number.isFinite(partialExemptionRate)) {
    return Math.max(0, Math.min(1, partialExemptionRate));
  }
  const parsed = parseTaxFundType(taxFundType);
  if (parsed) return getTeilfreistellungssatz(parsed);
  return getTeilfreistellungssatz("sonstige");
}
