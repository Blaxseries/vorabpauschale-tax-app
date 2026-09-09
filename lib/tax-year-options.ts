import type { TaxOptions } from "./calculate-vorabpauschale.ts";
import { churchTaxRateForFederalState } from "./geo-options.ts";

export type KirchensteuerOption = NonNullable<TaxOptions["kirchensteuer"]>;

/**
 * Mappt den historisierten church_tax_rate (0.08 | 0.09 | null)
 * auf TaxOptions.kirchensteuer ("8" | "9" | "none").
 */
export function mapChurchTaxRateToKirchensteuer(
  rate: number | null | undefined,
): KirchensteuerOption {
  if (rate == null || !Number.isFinite(Number(rate))) {
    return "none";
  }
  const n = Number(rate);
  if (Math.abs(n - 0.08) < 1e-9) return "8";
  if (Math.abs(n - 0.09) < 1e-9) return "9";
  return "none";
}

export function mapKirchensteuerToChurchTaxRate(
  value: KirchensteuerOption,
): number | null {
  if (value === "8") return 0.08;
  if (value === "9") return 0.09;
  return null;
}

/** Vorbelegung für ein neues Steuerjahr aus Mandanten-Stammdaten. */
export function resolveChurchTaxRateFromStammdaten(
  churchTaxLiable: boolean,
  federalState: string | null | undefined,
): number | null {
  if (!churchTaxLiable) return null;
  return churchTaxRateForFederalState(federalState);
}
