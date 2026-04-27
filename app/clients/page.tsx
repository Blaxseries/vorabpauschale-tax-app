"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { FormEvent } from "react";

import { clients as seedClients, taxFiles } from "@/lib/mock-data";

type ClientStatus = "Aktiv" | "Rückfrage" | "Archiviert";

type ClientRecord = {
  id: string;
  name: string;
  clientNumber: string;
  taxNumber: string;
  residency: string;
  status: ClientStatus;
  lastEdited: string;
};

type ClientFormState = {
  name: string;
  clientNumber: string;
  taxNumber: string;
  residency: string;
};

const initialClients: ClientRecord[] = seedClients.map((client, index) => ({
  id: client.id,
  name: client.name,
  clientNumber: `M-${(index + 1).toString().padStart(4, "0")}`,
  taxNumber: client.taxNumber,
  residency: client.country,
  status: index % 3 === 0 ? "Rückfrage" : "Aktiv",
  lastEdited: `${(26 - index).toString().padStart(2, "0")}.04.2026`,
}));

const emptyForm: ClientFormState = {
  name: "",
  clientNumber: "",
  taxNumber: "",
  residency: "DE",
};

export default function ClientsPage() {
  const [query, setQuery] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [form, setForm] = useState<ClientFormState>(emptyForm);
  const [clientRows, setClientRows] = useState<ClientRecord[]>(initialClients);

  const filteredClients = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) {
      return clientRows;
    }

    return clientRows.filter((client) =>
      [client.name, client.clientNumber, client.taxNumber, client.residency]
        .join(" ")
        .toLowerCase()
        .includes(normalizedQuery),
    );
  }, [clientRows, query]);

  function getOpenYears(clientId: string): number {
    return taxFiles.filter(
      (taxFile) => taxFile.clientId === clientId && taxFile.status !== "completed",
    ).length;
  }

  function handleCreateClient(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = form.name.trim();
    const clientNumber = form.clientNumber.trim();
    const taxNumber = form.taxNumber.trim();
    const residency = form.residency.trim().toUpperCase();

    if (!name || !clientNumber || !taxNumber || !residency) {
      return;
    }

    const newClient: ClientRecord = {
      id: `c-${crypto.randomUUID()}`,
      name,
      clientNumber,
      taxNumber,
      residency,
      status: "Aktiv",
      lastEdited: new Date().toLocaleDateString("de-DE"),
    };

    setClientRows((current) => [newClient, ...current]);
    setShowCreateModal(false);
    setForm(emptyForm);
  }

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-semibold text-zinc-900">Mandanten</h2>
            <p className="mt-2 text-sm text-zinc-600">
              Mandantenverwaltung mit Suchfunktion und Direktzugriff auf die Akte.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="rounded-md bg-zinc-900 px-3 py-2 text-sm font-medium text-zinc-50 hover:bg-zinc-700"
          >
            Mandant anlegen
          </button>
        </div>
        <label className="mt-4 block text-sm text-zinc-700">
          Suche
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Name, Mandantennummer oder Steuernummer"
            className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm"
          />
        </label>
      </section>

      <section className="overflow-x-auto rounded-xl border border-zinc-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-zinc-200 text-sm">
          <thead className="bg-zinc-50 text-left text-zinc-600">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Mandantennummer</th>
              <th className="px-4 py-3 font-medium">Steuernummer</th>
              <th className="px-4 py-3 font-medium">Ansässigkeit</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Letzte Bearbeitung</th>
              <th className="px-4 py-3 font-medium">Aktion</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200">
            {filteredClients.map((client) => (
              <tr key={client.id} className="text-zinc-700">
                <td className="px-4 py-3">
                  <p className="font-medium text-zinc-900">{client.name}</p>
                  <p className="text-xs text-zinc-500">
                    {getOpenYears(client.id)} offene Steuerjahre
                  </p>
                </td>
                <td className="px-4 py-3">{client.clientNumber}</td>
                <td className="px-4 py-3">{client.taxNumber}</td>
                <td className="px-4 py-3">{client.residency}</td>
                <td className="px-4 py-3">{client.status}</td>
                <td className="px-4 py-3">{client.lastEdited}</td>
                <td className="px-4 py-3">
                  <Link
                    href={`/clients/${client.id}`}
                    className="rounded-md border border-zinc-300 px-3 py-1.5 text-xs text-zinc-700 hover:bg-zinc-100"
                  >
                    Öffnen
                  </Link>
                </td>
              </tr>
            ))}
            {filteredClients.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-zinc-500">
                  Keine Mandanten gefunden.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </section>

      {showCreateModal ? (
        <div className="fixed inset-0 z-20 flex items-center justify-center bg-zinc-950/30 p-4">
          <section className="w-full max-w-xl rounded-xl border border-zinc-200 bg-white p-6 shadow-lg">
            <h3 className="text-lg font-semibold text-zinc-900">Mandant anlegen</h3>
            <form onSubmit={handleCreateClient} className="mt-4 grid gap-3 md:grid-cols-2">
              <label className="text-sm text-zinc-700 md:col-span-2">
                Name
                <input
                  type="text"
                  value={form.name}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, name: event.target.value }))
                  }
                  className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2"
                  required
                />
              </label>
              <label className="text-sm text-zinc-700">
                Mandantennummer
                <input
                  type="text"
                  value={form.clientNumber}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      clientNumber: event.target.value,
                    }))
                  }
                  className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2"
                  required
                />
              </label>
              <label className="text-sm text-zinc-700">
                Steuernummer
                <input
                  type="text"
                  value={form.taxNumber}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, taxNumber: event.target.value }))
                  }
                  className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2"
                  required
                />
              </label>
              <label className="text-sm text-zinc-700">
                Ansässigkeit
                <input
                  type="text"
                  maxLength={2}
                  value={form.residency}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, residency: event.target.value }))
                  }
                  className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 uppercase"
                  required
                />
              </label>
              <div className="flex items-end justify-end gap-2 md:col-span-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setForm(emptyForm);
                  }}
                  className="rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-100"
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  className="rounded-md bg-zinc-900 px-3 py-2 text-sm font-medium text-zinc-50 hover:bg-zinc-700"
                >
                  Mandant speichern
                </button>
              </div>
            </form>
          </section>
        </div>
      ) : null}
    </div>
  );
}
