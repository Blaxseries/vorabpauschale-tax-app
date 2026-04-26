import { ClientYearNav } from "@/components/client-year-nav";

type YearExportPageProps = {
  params: Promise<{
    id: string;
    year: string;
  }>;
};

export default async function YearExportPage({ params }: YearExportPageProps) {
  const { id, year } = await params;

  return (
    <div>
      <ClientYearNav clientId={id} year={year} />
      <section className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className="text-2xl font-semibold text-zinc-900">Export</h2>
        <p className="mt-2 text-sm text-zinc-600">
          Exporte für ELSTER, Kanzleiarchiv und Mandantenkommunikation im Jahr {year}.
        </p>
      </section>
    </div>
  );
}
