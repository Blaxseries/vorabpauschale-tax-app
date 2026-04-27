import { ClientYearNav } from "@/components/client-year-nav";
import { notFound } from "next/navigation";

import { PortfoliosWorkspace } from "./portfolios-workspace";

type YearPortfoliosPageProps = {
  params: Promise<{
    id: string;
    year: string;
  }>;
};

export default async function YearPortfoliosPage({ params }: YearPortfoliosPageProps) {
  const { id, year } = await params;

  if (!id || !year) {
    notFound();
  }

  return (
    <div>
      <ClientYearNav clientId={id} year={year} />
      <PortfoliosWorkspace clientId={id} year={year} />
    </div>
  );
}
