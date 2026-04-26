import Link from "next/link";

import { clients, taxFiles } from "@/lib/mock-data";

export default function ClientsPage() {
  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className="text-2xl font-semibold text-zinc-900">Mandanten</h2>
        <p className="mt-2 text-sm text-zinc-600">
          Wählen Sie einen Mandanten, um die Mandantenakte und das relevante
          Steuerjahr zu öffnen.
        </p>
      </section>

      <section className="rounded-xl border border-zinc-200 bg-white shadow-sm">
        <ul className="divide-y divide-zinc-200">
          {clients.map((client) => {
            const openYears = taxFiles.filter(
              (taxFile) =>
                taxFile.clientId === client.id && taxFile.status !== "completed",
            ).length;

            return (
              <li
                key={client.id}
                className="flex items-center justify-between px-6 py-4"
              >
                <div>
                  <p className="font-medium text-zinc-900">{client.name}</p>
                  <p className="text-sm text-zinc-600">
                    Steuernummer {client.taxNumber} · {openYears} offene Steuerjahre
                  </p>
                </div>
                <Link
                  href={`/clients/${client.id}`}
                  className="rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-100"
                >
                  Akte öffnen
                </Link>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
