import type { VorabpauschaleInput } from "./types";

export type ValidationIssue = {
  field: keyof VorabpauschaleInput;
  message: string;
};

/**
 * Validiert Basiseingaben für den Berechnungskern.
 *
 * Wichtig:
 * - Nur Struktur und Mindestvalidierungen.
 * - Keine fachlichen Plausibilitätsregeln mit Spezialfällen.
 */
export function validateVorabpauschaleInput(input: VorabpauschaleInput): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (!input.isin.trim()) issues.push({ field: "isin", message: "ISIN ist erforderlich." });
  if (!input.fundName.trim()) issues.push({ field: "fundName", message: "Fondsname ist erforderlich." });
  if (!input.currency.trim()) issues.push({ field: "currency", message: "Währung ist erforderlich." });

  if (!Number.isFinite(input.quantity) || input.quantity < 0) {
    issues.push({ field: "quantity", message: "Anzahl der Anteile muss >= 0 sein." });
  }
  if (!Number.isFinite(input.startPrice) || input.startPrice < 0) {
    issues.push({ field: "startPrice", message: "Kurs zu Jahresbeginn muss >= 0 sein." });
  }
  if (!Number.isFinite(input.endPrice) || input.endPrice < 0) {
    issues.push({ field: "endPrice", message: "Kurs zu Jahresende muss >= 0 sein." });
  }
  if (!Number.isFinite(input.distributions) || input.distributions < 0) {
    issues.push({ field: "distributions", message: "Ausschüttungen müssen >= 0 sein." });
  }
  if (!Number.isFinite(input.baseInterestRate)) {
    issues.push({ field: "baseInterestRate", message: "Basiszins muss numerisch sein." });
  }
  if (!Number.isFinite(input.partialExemptionRate) || input.partialExemptionRate < 0 || input.partialExemptionRate > 1) {
    issues.push({
      field: "partialExemptionRate",
      message: "Teilfreistellungssatz muss zwischen 0 und 1 liegen.",
    });
  }

  return issues;
}
