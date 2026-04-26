import Link from "next/link";
import { notFound } from "next/navigation";

import { clients, taxFiles } from "@/lib/mock-data";

type ClientFilePageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function ClientFilePage({ params }: ClientFilePageProps) {
  const { id } = await params;
  const client = clients.find((entry) => entry.id === id);

  if (!client) {
    notFound();
  }

  const clientYears = taxFiles
    .filter((taxFile) => taxFile.clientId === client.id)
    .sort((a, b) => b.year - a.year);
  const latestYear = clientYears[0];

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className="text-2xl font-semibold text-zinc-900">Mandantenakte</h2>
        <p className="mt-2 text-sm text-zinc-600">
          Übersicht für {client.name} mit Stammdaten, Steuerjahren und letzter
          Aktivität.
        </p>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <article className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-zinc-900">Mandant Übersicht</h3>
          <p className="mt-2 text-sm text-zinc-700">{client.name}</p>
          <p className="text-sm text-zinc-600">Steuernummer: {client.taxNumber}</p>
          <p className="text-sm text-zinc-600">Land: {client.country}</p>
        </article>

        <article className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-zinc-900">Stammdaten</h3>
          <ul className="mt-2 space-y-1 text-sm text-zinc-600">
            <li>Mandanten-ID: {client.id}</li>
            <li>Kanzleizustand: Aktiv</li>
            <li>Risikoklasse: Standard</li>
          </ul>
        </article>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <article className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-zinc-900">Steuerjahre</h3>
          <ul className="mt-3 space-y-2 text-sm text-zinc-700">
            {clientYears.map((taxFile) => (
              <li key={taxFile.id} className="flex items-center justify-between">
                <span>
                  {taxFile.year} ·{" "}
                  {taxFile.status === "completed"
                    ? "Abgeschlossen"
                    : taxFile.status === "in_progress"
                      ? "In Bearbeitung"
                      : "Offen"}
                </span>
                <Link
                  href={`/clients/${client.id}/years/${taxFile.year}`}
                  className="text-zinc-800 underline-offset-2 hover:underline"
                >
                  öffnen
                </Link>
              </li>
            ))}
          </ul>
        </article>

        <article className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-zinc-900">Letzte Aktivität</h3>
          <ul className="mt-2 space-y-1 text-sm text-zinc-600">
            <li>Dokumentenimport aktualisiert (heute, 10:48)</li>
            <li>Vorabpauschale neu berechnet (heute, 09:12)</li>
            <li>Prüfprotokoll ergänzt (gestern, 16:25)</li>
          </ul>
          {latestYear ? (
            <Link
              href={`/clients/${client.id}/years/${latestYear.year}`}
              className="mt-4 inline-block rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-100"
            >
              Steuerjahr öffnen
            </Link>
          ) : null}
        </article>
      </section>
    </div>
  );
}
