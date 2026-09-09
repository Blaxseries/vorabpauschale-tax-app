import { SteuerjahrKontext } from "@/components/steuerjahr-kontext";

type VorabpauschaleExportPageProps = {
  params: Promise<{
    id: string;
    year: string;
  }>;
};

export default async function VorabpauschaleExportPage({
  params,
}: VorabpauschaleExportPageProps) {
  const { year } = await params;
  const steuerjahr = Number(year);

  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
      <h2 className="text-2xl font-semibold text-zinc-900">Export Steuerjahr {year}</h2>
      {Number.isFinite(steuerjahr) ? <SteuerjahrKontext steuerjahr={steuerjahr} /> : null}
      <p className="mt-2 text-sm text-zinc-600">
        Exporte für ELSTER, Kanzleiarchiv und Mandantenkommunikation im Steuerjahr {year}.
      </p>
    </section>
  );
}
