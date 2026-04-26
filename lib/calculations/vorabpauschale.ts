import type { FundPosition, VorabpauschaleCalculation } from "@/lib/types";

export function calculateVorabpauschale(
  fund: FundPosition,
): VorabpauschaleCalculation {
  const baseReturn = (fund.priceEnd - fund.priceStart) * fund.unitsStart;
  const preliminaryTax = baseReturn * 0.7 * 0.25;
  const finalTax = Math.max(preliminaryTax - fund.distributions, 0);

  return {
    id: `calc-${fund.id}-${Date.now()}`,
    fundPositionId: fund.id,
    baseReturn,
    preliminaryTax,
    finalTax,
    calculatedAt: new Date(),
  };
}
