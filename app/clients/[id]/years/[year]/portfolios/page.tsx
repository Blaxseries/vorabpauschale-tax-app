import { ClientYearNav } from "@/components/client-year-nav";

import { PortfoliosWorkspace } from "./portfolios-workspace";

type YearPortfoliosPageProps = {
  params: Promise<{
    id: string;
    year: string;
  }>;
};

export default async function YearPortfoliosPage({ params }: YearPortfoliosPageProps) {
  const { id, year } = await params;

  return (
    <div>
      <ClientYearNav clientId={id} year={year} />
      <PortfoliosWorkspace clientId={id} year={year} />
    </div>
  );
}
