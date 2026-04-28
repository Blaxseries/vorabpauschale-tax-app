/**
 * Fachliche Typen für den Vorabpauschale-Berechnungskern.
 *
 * Diese Struktur folgt den Spezifikationen aus /docs und bildet
 * ausschließlich den Berechnungskern ab (ohne UI, DB, Supabase).
 */

export type TaxFundType =
  | "Aktienfonds"
  | "Mischfonds"
  | "Rentenfonds"
  | "Immobilienfonds"
  | "Auslands-Immobilienfonds"
  | "Sonstiger Fonds"
  | "Unklar";

export type CalculationCurrency = string;

export type VorabpauschaleInput = {
  isin: string;
  fundName: string;
  fundType: TaxFundType;
  partialExemptionRate: number;
  quantity: number;
  startPrice: number;
  endPrice: number;
  distributions: number;
  baseInterestRate: number;
  taxYear: number;
  currency: CalculationCurrency;
};

export type VorabpauschaleStepKey =
  | "start_value"
  | "base_return"
  | "price_increase"
  | "minus_distributions"
  | "cap_vorabpauschale"
  | "apply_partial_exemption"
  | "taxable_amount"
  | "capital_gains_tax"
  | "solidarity_surcharge"
  | "church_tax_optional";

export type VorabpauschaleStepResult = {
  key: VorabpauschaleStepKey;
  label: string;
  value: number | null;
  notes?: string;
};

export type VorabpauschaleOutput = {
  startValue: number;
  baseReturn: number;
  priceIncrease: number;
  afterDistributions: number;
  cappedVorabpauschale: number;
  afterPartialExemption: number;
  taxableAmount: number;
  capitalGainsTax: number;
  solidaritySurcharge: number;
  churchTax: number | null;
  protocol: VorabpauschaleStepResult[];
};

export type CalculationContext = {
  includeChurchTax: boolean;
  churchTaxRate?: number;
  capitalGainsTaxRate: number;
  solidaritySurchargeRate: number;
};
