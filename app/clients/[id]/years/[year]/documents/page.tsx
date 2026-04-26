import { ClientYearNav } from "@/components/client-year-nav";
import { DocumentsWorkflow } from "@/components/documents-workflow";
import { portfolios, taxFiles } from "@/lib/mock-data";
import { notFound } from "next/navigation";

type YearDocumentsPageProps = {
  params: Promise<{
    id: string;
    year: string;
  }>;
};

export default async function YearDocumentsPage({ params }: YearDocumentsPageProps) {
  const { id, year } = await params;
  const taxFile = taxFiles.find(
    (entry) => entry.clientId === id && entry.year === Number(year),
  );

  if (!taxFile) {
    notFound();
  }

  const portfolioOptions = portfolios
    .filter((portfolio) => portfolio.taxFileId === taxFile.id)
    .map((portfolio) => ({
      id: portfolio.id,
      label: `${portfolio.bankName} (${portfolio.country})`,
    }));

  return (
    <div>
      <ClientYearNav clientId={id} year={year} />
      <DocumentsWorkflow year={year} portfolioOptions={portfolioOptions} />
    </div>
  );
}
