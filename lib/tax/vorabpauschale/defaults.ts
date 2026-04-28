import type { CalculationContext } from "./types";

/**
 * Standard-Kontext für deutsche Kapitalertragsteuerberechnung.
 * Kann später pro Mandant/Jahr konfiguriert werden.
 */
export const DEFAULT_CALCULATION_CONTEXT: CalculationContext = {
  includeChurchTax: false,
  churchTaxRate: undefined,
  capitalGainsTaxRate: 0.25,
  solidaritySurchargeRate: 0.055,
};
