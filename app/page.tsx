import { AppShell } from "@/components/app-shell";
import { StatCard } from "@/components/stat-card";
import { clients, fundPositions, portfolios, taxFiles } from "@/lib/mock-data";

export default function Home() {
  const openTaxFilesCount = taxFiles.filter(
    (taxFile) => taxFile.status !== "completed",
  ).length;

  const dashboardStats = [
    {
      title: "Anzahl Mandanten",
      value: clients.length.toString(),
      detail: "Aktive Mandanten im Datenbestand",
    },
    {
      title: "Offene Steuerakten",
      value: openTaxFilesCount.toString(),
      detail: "Akte mit Status offen oder in Bearbeitung",
    },
    {
      title: "Hochgeladene Statements",
      value: portfolios.length.toString(),
      detail: "Portfolios mit mindestens einem Upload",
    },
    {
      title: "Letzte Berechnungen",
      value: fundPositions.length.toString(),
      detail: "Berechnete Fondspositionen im aktuellen Lauf",
    },
  ];

  return (
    <AppShell>
      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {dashboardStats.map((stat) => (
          <StatCard
            key={stat.title}
            title={stat.title}
            value={stat.value}
            detail={stat.detail}
          />
        ))}
      </section>

      <section className="mt-6 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className="text-base font-semibold text-zinc-900">Aktivität heute</h2>
        <ul className="mt-4 space-y-3 text-sm text-zinc-600">
          <li>4 neue Kontoauszüge für Depot DE-00412 hochgeladen</li>
          <li>Vorabpauschale für 11 Fonds erfolgreich berechnet</li>
          <li>2 Steuerakten auf Wiedervorlage für morgen gesetzt</li>
        </ul>
      </section>
    </AppShell>
  );
}
