import { ClientYearNav } from "@/components/client-year-nav";
import { portfolios, taxFiles } from "@/lib/mock-data";

type YearPortfoliosPageProps = {
  params: Promise<{
    id: string;
    year: string;
  }>;
};

export default async function YearPortfoliosPage({ params }: YearPortfoliosPageProps) {
  const { id, year } = await params;
  const taxFile = taxFiles.find(
    (entry) => entry.clientId === id && entry.year === Number(year),
  );
  const yearPortfolios = taxFile
    ? portfolios.filter((portfolio) => portfolio.taxFileId === taxFile.id)
    : [];

  return (
    <div>
      <ClientYearNav clientId={id} year={year} />
      <section className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className="text-2xl font-semibold text-zinc-900">Depots</h2>
        <ul className="mt-4 space-y-2 text-sm text-zinc-700">
          {yearPortfolios.map((portfolio) => (
            <li key={portfolio.id}>
              {portfolio.bankName} · {portfolio.country}
            </li>
          ))}
          {yearPortfolios.length === 0 ? (
            <li className="text-zinc-500">Keine Depots für dieses Steuerjahr vorhanden.</li>
          ) : null}
        </ul>
      </section>
    </div>
  );
}
