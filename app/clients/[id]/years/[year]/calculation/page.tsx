import { ClientYearNav } from "@/components/client-year-nav";
import { calculateVorabpauschale } from "@/lib/calculations/vorabpauschale";
import { fundPositions } from "@/lib/mock-data";

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
  const sampleResult = calculateVorabpauschale(fundPositions[0]);

  return (
    <div>
      <ClientYearNav clientId={id} year={year} />
      <section className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className="text-2xl font-semibold text-zinc-900">Berechnung</h2>
        <p className="mt-2 text-sm text-zinc-600">
          Beispielrechnung für {fundPositions[0].fundName}
        </p>
        <ul className="mt-3 space-y-1 text-sm text-zinc-700">
          <li>Basisertrag: {sampleResult.baseReturn.toFixed(2)} EUR</li>
          <li>Vorläufige Steuer: {sampleResult.preliminaryTax.toFixed(2)} EUR</li>
          <li>Finale Steuer: {sampleResult.finalTax.toFixed(2)} EUR</li>
        </ul>
      </section>
    </div>
  );
}
