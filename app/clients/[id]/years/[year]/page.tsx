import Link from "next/link";
import { notFound } from "next/navigation";

import { ClientYearNav } from "@/components/client-year-nav";
import { clients, taxFiles } from "@/lib/mock-data";

type ClientYearOverviewPageProps = {
  params: Promise<{
    id: string;
    year: string;
  }>;
};

export default async function ClientYearOverviewPage({
  params,
}: ClientYearOverviewPageProps) {
  const { id, year } = await params;
  const client = clients.find((entry) => entry.id === id);
  const taxFile = taxFiles.find(
    (entry) => entry.clientId === id && entry.year === Number(year),
  );

  if (!client || !taxFile) {
    notFound();
  }

  return (
    <div>
      <ClientYearNav clientId={id} year={year} />
      <section className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className="text-2xl font-semibold text-zinc-900">Übersicht</h2>
        <p className="mt-2 text-sm text-zinc-600">
          Steuerjahr {year} · {client.name} · Status{" "}
          {taxFile.status === "completed"
            ? "Abgeschlossen"
            : taxFile.status === "in_progress"
              ? "In Bearbeitung"
              : "Offen"}
        </p>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <Link
            href={`/clients/${id}/years/${year}/documents`}
            className="rounded-md border border-zinc-300 p-3 text-sm text-zinc-700 hover:bg-zinc-100"
          >
            Zu Dokumente
          </Link>
          <Link
            href={`/clients/${id}/years/${year}/calculation`}
            className="rounded-md border border-zinc-300 p-3 text-sm text-zinc-700 hover:bg-zinc-100"
          >
            Zu Berechnung
          </Link>
        </div>
      </section>
    </div>
  );
}
