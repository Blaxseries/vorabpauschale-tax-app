import { ClientYearNav } from "@/components/client-year-nav";
import { fundPositions } from "@/lib/mock-data";

type YearFundDataPageProps = {
  params: Promise<{
    id: string;
    year: string;
  }>;
};

export default async function YearFundDataPage({ params }: YearFundDataPageProps) {
  const { id, year } = await params;

  return (
    <div>
      <ClientYearNav clientId={id} year={year} />
      <section className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className="text-2xl font-semibold text-zinc-900">Fondsdaten</h2>
        <ul className="mt-4 space-y-2 text-sm text-zinc-700">
          {fundPositions.map((fund) => (
            <li key={fund.id}>
              {fund.fundName} · {fund.isin}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
