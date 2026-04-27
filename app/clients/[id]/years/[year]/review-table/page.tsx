import { ClientYearNav } from "@/components/client-year-nav";
import { fundPositions } from "@/lib/mock-data";

type YearReviewTablePageProps = {
  params: Promise<{
    id: string;
    year: string;
  }>;
};

export default async function YearReviewTablePage({ params }: YearReviewTablePageProps) {
  const { id, year } = await params;

  return (
    <div>
      <ClientYearNav clientId={id} year={year} />
      <section className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className="text-2xl font-semibold text-zinc-900">Prüftabelle</h2>
        <p className="mt-2 text-sm text-zinc-600">
          Fachliche Gegenprüfung der extrahierten Prüfdaten für das Steuerjahr {year}.
        </p>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full divide-y divide-zinc-200 text-sm">
            <thead className="bg-zinc-50 text-left text-zinc-600">
              <tr>
                <th className="px-3 py-2 font-medium">Fondsname</th>
                <th className="px-3 py-2 font-medium">ISIN</th>
                <th className="px-3 py-2 font-medium">Anteile Start</th>
                <th className="px-3 py-2 font-medium">Anteile Ende</th>
                <th className="px-3 py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200">
              {fundPositions.map((fund, index) => (
                <tr key={fund.id} className="text-zinc-700">
                  <td className="px-3 py-3">{fund.fundName}</td>
                  <td className="px-3 py-3">{fund.isin}</td>
                  <td className="px-3 py-3">{fund.unitsStart.toFixed(2)}</td>
                  <td className="px-3 py-3">{fund.unitsEnd.toFixed(2)}</td>
                  <td className="px-3 py-3">
                    {index % 2 === 0 ? "Freigegeben" : "Prüfung erforderlich"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
