import { ClientYearNav } from "@/components/client-year-nav";

import { CalculationSummary } from "./calculation-summary";

type YearCalculationPageProps = {
  params: Promise<{
    id: string;
    year: string;
  }>;
};

export default async function YearCalculationPage({
  params,
}: YearCalculationPageProps) {
  const { id, year } = await params;

  return (
    <div>
      <ClientYearNav clientId={id} year={year} />
      <CalculationSummary year={year} />
    </div>
  );
}
