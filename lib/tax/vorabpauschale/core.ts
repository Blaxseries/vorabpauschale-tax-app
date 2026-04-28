import type {
  CalculationContext,
  VorabpauschaleInput,
  VorabpauschaleOutput,
  VorabpauschaleStepResult,
} from "./types";

/**
 * Führt die Berechnungsschritte in der Reihenfolge der Spezifikation aus.
 *
 * Hinweis:
 * - Aktuell nur Struktur/Schnittstellen.
 * - Fachliche Formeln werden in einem späteren Schritt ergänzt.
 */
export function calculateVorabpauschaleCore(
  input: VorabpauschaleInput,
  context: CalculationContext,
): VorabpauschaleOutput {
  // TODO: Schritt 1 Jahresanfangswert
  const startValue = calculateStartValue(input);

  // TODO: Schritt 2 Basisertrag
  const baseReturn = calculateBaseReturn(input, startValue);

  // TODO: Schritt 3 Wertsteigerung
  const priceIncrease = calculatePriceIncrease(input);

  // TODO: Schritt 4 Ausschüttungen abziehen
  const afterDistributions = subtractDistributions(baseReturn, input.distributions);

  // TODO: Schritt 5 Vorabpauschale begrenzen
  const cappedVorabpauschale = capVorabpauschale(afterDistributions, priceIncrease);

  // TODO: Schritt 6 Teilfreistellung anwenden
  const afterPartialExemption = applyPartialExemption(cappedVorabpauschale, input.partialExemptionRate);

  // TODO: Schritt 7 Steuerpflichtigen Betrag berechnen
  const taxableAmount = calculateTaxableAmount(afterPartialExemption);

  // TODO: Schritt 8 Kapitalertragsteuer berechnen
  const capitalGainsTax = calculateCapitalGainsTax(taxableAmount, context.capitalGainsTaxRate);

  // TODO: Schritt 9 Solidaritätszuschlag berechnen
  const solidaritySurcharge = calculateSolidaritySurcharge(
    capitalGainsTax,
    context.solidaritySurchargeRate,
  );

  // TODO: Schritt 10 Optionale Kirchensteuer
  const churchTax = calculateChurchTax(capitalGainsTax, context);

  const protocol: VorabpauschaleStepResult[] = [
    { key: "start_value", label: "Jahresanfangswert", value: startValue },
    { key: "base_return", label: "Basisertrag", value: baseReturn },
    { key: "price_increase", label: "Wertsteigerung", value: priceIncrease },
    { key: "minus_distributions", label: "Basisertrag nach Ausschüttungen", value: afterDistributions },
    { key: "cap_vorabpauschale", label: "Gedeckelte Vorabpauschale", value: cappedVorabpauschale },
    { key: "apply_partial_exemption", label: "Nach Teilfreistellung", value: afterPartialExemption },
    { key: "taxable_amount", label: "Steuerpflichtiger Betrag", value: taxableAmount },
    { key: "capital_gains_tax", label: "Kapitalertragsteuer", value: capitalGainsTax },
    { key: "solidarity_surcharge", label: "Solidaritätszuschlag", value: solidaritySurcharge },
    {
      key: "church_tax_optional",
      label: "Kirchensteuer (optional)",
      value: churchTax,
      notes: context.includeChurchTax ? undefined : "Nicht aktiviert",
    },
  ];

  return {
    startValue,
    baseReturn,
    priceIncrease,
    afterDistributions,
    cappedVorabpauschale,
    afterPartialExemption,
    taxableAmount,
    capitalGainsTax,
    solidaritySurcharge,
    churchTax,
    protocol,
  };
}

function calculateStartValue(_input: VorabpauschaleInput): number {
  throw new Error("Not implemented: calculateStartValue");
}

function calculateBaseReturn(_input: VorabpauschaleInput, _startValue: number): number {
  throw new Error("Not implemented: calculateBaseReturn");
}

function calculatePriceIncrease(_input: VorabpauschaleInput): number {
  throw new Error("Not implemented: calculatePriceIncrease");
}

function subtractDistributions(_baseReturn: number, _distributions: number): number {
  throw new Error("Not implemented: subtractDistributions");
}

function capVorabpauschale(_afterDistributions: number, _priceIncrease: number): number {
  throw new Error("Not implemented: capVorabpauschale");
}

function applyPartialExemption(_value: number, _partialExemptionRate: number): number {
  throw new Error("Not implemented: applyPartialExemption");
}

function calculateTaxableAmount(_value: number): number {
  throw new Error("Not implemented: calculateTaxableAmount");
}

function calculateCapitalGainsTax(_taxableAmount: number, _taxRate: number): number {
  throw new Error("Not implemented: calculateCapitalGainsTax");
}

function calculateSolidaritySurcharge(_capitalGainsTax: number, _soliRate: number): number {
  throw new Error("Not implemented: calculateSolidaritySurcharge");
}

function calculateChurchTax(_capitalGainsTax: number, _context: CalculationContext): number | null {
  throw new Error("Not implemented: calculateChurchTax");
}
