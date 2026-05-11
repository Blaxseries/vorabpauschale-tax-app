import { getTeilfreistellungssatz, type FondsPosition } from "@/lib/calculate-vorabpauschale";

export type FundPositionValidationInput = {
  portfolio_id?: string | null;
  isin?: string | null;
  fund_name?: string | null;
  tax_fund_type?: string | null;
  partial_exemption_rate?: number | null;
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

function isPartialRateSet(value: number | null | undefined): boolean {
  return typeof value === "number" && !Number.isNaN(value);
}

/**
 * Zentrale Prüfung, ob eine Fondsposition in die Vorabpauschale-Berechnung einfließen darf.
 */
export function validateFundPosition(position: FundPositionValidationInput): FundPositionValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!hasText(position.portfolio_id)) {
    errors.push("Zuordnung zum Depot fehlt.");
  }

  if (!hasText(position.isin)) {
    errors.push("ISIN fehlt.");
  }
  if (!hasText(position.fund_name)) {
    errors.push("Fondsname fehlt.");
  }

  if (!hasText(position.tax_fund_type)) {
    errors.push("Steuerliche Fondsart fehlt.");
  } else if (!parseTaxFundType(position.tax_fund_type)) {
    errors.push("Steuerliche Fondsart ist ungültig.");
  }

  if (isPartialRateSet(position.partial_exemption_rate)) {
    const p = position.partial_exemption_rate as number;
    if (p < 0 || p > 1) {
      errors.push("Teilfreistellung muss zwischen 0 und 1 liegen.");
    }
  }

  if (position.units_end === null || position.units_end === undefined || Number.isNaN(position.units_end)) {
    errors.push("Bestand 31.12. fehlt.");
  }

  if (position.price_start === null || position.price_start === undefined || Number.isNaN(position.price_start)) {
    errors.push("NAV 01.01. fehlt.");
  }

  if (position.price_end === null || position.price_end === undefined || Number.isNaN(position.price_end)) {
    errors.push("NAV 31.12. fehlt.");
  }

  if (!hasText(position.currency)) {
    errors.push("Währung fehlt.");
  } else {
    const cur = (position.currency ?? "").trim().toUpperCase();
    if (cur !== "EUR") {
      const fx = resolveFxEndRate(position);
      if (fx === null) {
        errors.push("FX-Kurs fehlt.");
      }
    }
  }

  if (!isReviewedGeprueft(position.review_status)) {
    errors.push("Position ist nicht geprüft.");
  }

  if (!hasText(position.product_type)) {
    warnings.push("Produktart ist nicht gesetzt.");
  }

  const calculationReady = errors.length === 0;

  return { calculationReady, errors, warnings };
}

const BADGE_ORDER = ["Fondsart fehlt", "FX fehlt", "NAV fehlt", "Bestand fehlt", "Nicht geprüft"] as const;

/** Kompakte Badges für die Spalte „Berechnungsfähig“ (feste Menge, fester Reihung). */
export function fundPositionIssueBadges(position: FundPositionValidationInput): string[] {
  const { errors } = validateFundPosition(position);
  const hit = new Set<string>();
  for (const e of errors) {
    if (e === "Position ist nicht geprüft.") hit.add("Nicht geprüft");
    else if (e === "FX-Kurs fehlt.") hit.add("FX fehlt");
    else if (e === "NAV 01.01. fehlt." || e === "NAV 31.12. fehlt.") hit.add("NAV fehlt");
    else if (e === "Bestand 31.12. fehlt.") hit.add("Bestand fehlt");
    else if (e === "Steuerliche Fondsart fehlt." || e === "Steuerliche Fondsart ist ungültig.") hit.add("Fondsart fehlt");
  }
  return BADGE_ORDER.filter((b) => hit.has(b));
}

export function rowToValidationInput(row: {
  portfolio_id?: string | null;
  isin?: string | null;
  fund_name?: string | null;
  tax_fund_type?: string | null;
  partial_exemption_rate?: number | null;
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
    portfolio_id: row.portfolio_id,
    isin: row.isin,
    fund_name: row.fund_name,
    tax_fund_type: row.tax_fund_type,
    partial_exemption_rate: row.partial_exemption_rate,
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

/**
 * Teilfreistellungssatz für Anzeige: Override (0–1) oder Ableitung aus tax_fund_type.
 * Ohne gültige steuerliche Fondsart und ohne gültigen Override: null (kein stiller Fallback auf „sonstige“).
 */
export function resolvePartialExemptionRate(
  taxFundType: string | null | undefined,
  partialExemptionRate: number | null | undefined,
): number | null {
  if (isPartialRateSet(partialExemptionRate)) {
    const p = partialExemptionRate as number;
    if (!Number.isFinite(p) || p < 0 || p > 1) return null;
    return Math.max(0, Math.min(1, p));
  }
  const parsed = parseTaxFundType(taxFundType);
  if (!parsed) return null;
  return getTeilfreistellungssatz(parsed);
}
