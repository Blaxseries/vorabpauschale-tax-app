import { AppShell } from "@/components/app-shell";
import { StatCard } from "@/components/stat-card";

export default function Home() {
  const dashboardStats = [
    {
      title: "Anzahl Mandanten",
      value: "128",
      detail: "12 neue Mandanten im laufenden Quartal",
    },
    {
      title: "Offene Steuerakten",
      value: "34",
      detail: "9 Akten mit Frist innerhalb der naechsten 14 Tage",
    },
    {
      title: "Hochgeladene Statements",
      value: "512",
      detail: "47 Uploads in den letzten 7 Tagen",
    },
    {
      title: "Letzte Berechnungen",
      value: "26",
      detail: "Zuletzt berechnet: heute um 10:42 Uhr",
    },
  ];

  return (
    <AppShell>
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {dashboardStats.map((stat) => (
          <StatCard
            key={stat.title}
            title={stat.title}
            value={stat.value}
            detail={stat.detail}
          />
        ))}
      </section>

      <section className="mt-6 rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
        <h2 className="text-base font-semibold text-zinc-900">Aktivitaet heute</h2>
        <ul className="mt-4 space-y-3 text-sm text-zinc-600">
          <li>4 neue Kontoauszuege fuer Depot DE-00412 hochgeladen</li>
          <li>Vorabpauschale fuer 11 Fonds erfolgreich berechnet</li>
          <li>2 Steuerakten auf Wiedervorlage fuer morgen gesetzt</li>
        </ul>
      </section>
    </AppShell>
  );
}
