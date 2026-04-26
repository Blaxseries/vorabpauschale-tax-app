import Link from "next/link";
import { notFound } from "next/navigation";

import { clients, taxFiles } from "@/lib/mock-data";

type ClientYearsPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function ClientYearsPage({ params }: ClientYearsPageProps) {
  const { id } = await params;
  const client = clients.find((entry) => entry.id === id);

  if (!client) {
    notFound();
  }

  const years = taxFiles
    .filter((taxFile) => taxFile.clientId === id)
    .sort((a, b) => b.year - a.year);

  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
      <h2 className="text-2xl font-semibold text-zinc-900">Steuerjahre</h2>
      <p className="mt-2 text-sm text-zinc-600">Mandant: {client.name}</p>
      <ul className="mt-4 space-y-2 text-sm text-zinc-700">
        {years.map((entry) => (
          <li key={entry.id} className="flex items-center justify-between">
            <span>{entry.year}</span>
            <Link
              href={`/clients/${id}/years/${entry.year}`}
              className="text-zinc-800 underline-offset-2 hover:underline"
            >
              Arbeitsbereich öffnen
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
