import { ClientYearNav } from "@/components/client-year-nav";

type YearDataReviewPageProps = {
  params: Promise<{
    id: string;
    year: string;
  }>;
};

export default async function YearDataReviewPage({ params }: YearDataReviewPageProps) {
  const { id, year } = await params;

  return (
    <div>
      <ClientYearNav clientId={id} year={year} />
      <section className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className="text-2xl font-semibold text-zinc-900">Datenprüfung</h2>
        <p className="mt-2 text-sm text-zinc-600">
          Hier werden künftig die aus Dokumenten extrahierten und modulübergreifend nutzbaren
          Basisdaten geprüft.
        </p>
        <p className="mt-4 text-sm text-zinc-500">
          Diese Ansicht ist vorbereitet und enthält noch keine fachliche Prüflogik. Die bestehende
          Prüftabelle der Vorabpauschale bleibt unverändert unter Module → Vorabpauschale verfügbar.
        </p>
      </section>
    </div>
  );
}
