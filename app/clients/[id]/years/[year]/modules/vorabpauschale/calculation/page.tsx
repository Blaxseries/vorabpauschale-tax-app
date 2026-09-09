import { CalculationSummary } from "../../../calculation/calculation-summary";

type VorabpauschaleCalculationPageProps = {
  params: Promise<{
    id: string;
    year: string;
  }>;
};

export default async function VorabpauschaleCalculationPage({
  params,
}: VorabpauschaleCalculationPageProps) {
  const { id, year } = await params;

  return <CalculationSummary clientId={id} year={year} />;
}
