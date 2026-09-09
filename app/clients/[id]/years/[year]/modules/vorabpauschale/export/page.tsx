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

  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
      <h2 className="text-2xl font-semibold text-zinc-900">Export</h2>
      <p className="mt-2 text-sm text-zinc-600">
        Exporte für ELSTER, Kanzleiarchiv und Mandantenkommunikation im Jahr {year}.
      </p>
    </section>
  );
}
