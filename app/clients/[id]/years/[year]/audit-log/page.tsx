import { ClientYearNav } from "@/components/client-year-nav";

type YearAuditLogPageProps = {
  params: Promise<{
    id: string;
    year: string;
  }>;
};

export default async function YearAuditLogPage({ params }: YearAuditLogPageProps) {
  const { id, year } = await params;

  return (
    <div>
      <ClientYearNav clientId={id} year={year} />
      <section className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className="text-2xl font-semibold text-zinc-900">Prüfprotokoll</h2>
        <ul className="mt-4 space-y-2 text-sm text-zinc-700">
          <li>08.01.{year}: Dokumentenimport validiert</li>
          <li>11.01.{year}: Fondsdaten plausibilisiert</li>
          <li>15.01.{year}: Berechnung fachlich freigegeben</li>
        </ul>
      </section>
    </div>
  );
}
