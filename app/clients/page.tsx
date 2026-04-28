"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";

import type { Client as DatabaseClient } from "@/lib/database.types";
import { supabase } from "@/lib/supabase";

type ClientStatus = "Aktiv" | "Rückfrage" | "Archiviert";
type Salutation = "Herr" | "Frau";

type ClientRecord = {
  id: string;
  name: string;
  client_number: string;
  tax_number: string;
  country: string;
  status: ClientStatus;
  updated_at: string | null;
};

type ClientMetadata = {
  address: string;
  salutation: Salutation;
  isCompany: boolean;
  email: string;
  phone: string;
};

type ClientFormState = {
  name: string;
  client_number: string;
  tax_number: string;
  country: string;
  address: string;
  salutation: Salutation;
  is_company: boolean;
  email: string;
  phone: string;
};

type ClientsTableRow = Pick<
  DatabaseClient,
  "id" | "name" | "client_number" | "tax_number" | "country" | "created_at" | "updated_at"
>;

const emptyForm: ClientFormState = {
  name: "",
  client_number: "",
  tax_number: "",
  country: "DE",
  address: "",
  salutation: "Herr",
  is_company: true,
  email: "",
  phone: "",
};

const clientMetadataStorageKey = "client-metadata-v1";

function readClientMetadata(): Record<string, ClientMetadata> {
  if (typeof window === "undefined") return {};
  const raw = window.localStorage.getItem(clientMetadataStorageKey);
  if (!raw) return {};
  try {
    return JSON.parse(raw) as Record<string, ClientMetadata>;
  } catch {
    return {};
  }
}

function writeClientMetadata(metadata: Record<string, ClientMetadata>) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(clientMetadataStorageKey, JSON.stringify(metadata));
}

export default function ClientsPage() {
  const [query, setQuery] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [form, setForm] = useState<ClientFormState>(emptyForm);
  const [clientRows, setClientRows] = useState<ClientRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  function toErrorMessage(prefix: string, message: string | null): string {
    return message ? `${prefix} (${message})` : prefix;
  }

  async function fetchClients(options?: {
    keepLoadingState?: boolean;
    onSuccess?: (rows: ClientRecord[]) => void;
  }) {
    if (!options?.keepLoadingState) setIsLoading(true);
    setErrorMessage(null);
    try {
      const { data, error } = await supabase
        .from("clients")
        .select("id, name, client_number, tax_number, country, created_at, updated_at")
        .returns<ClientsTableRow[]>();

      if (error) {
        setErrorMessage(toErrorMessage("Mandanten konnten nicht geladen werden.", error.message));
        setIsLoading(false);
        return;
      }

      const mappedClients: ClientRecord[] = data.map((row) => ({
        id: row.id,
        name: row.name,
        client_number: row.client_number,
        tax_number: row.tax_number,
        country: row.country,
        status: "Aktiv",
        updated_at: row.updated_at ?? row.created_at,
      }));

      if (options?.onSuccess) options.onSuccess(mappedClients);
      else setClientRows(mappedClients);
      setIsLoading(false);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : null;
      setErrorMessage(toErrorMessage("Mandanten konnten nicht geladen werden.", message));
      setIsLoading(false);
    }
  }

  useEffect(() => {
    let active = true;
    void fetchClients({
      onSuccess: (rows) => {
        if (active) setClientRows(rows);
      },
    });
    return () => {
      active = false;
    };
  }, []);

  const filteredClients = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return clientRows;
    return clientRows.filter((client) =>
      [client.name, client.client_number, client.tax_number, client.country]
        .join(" ")
        .toLowerCase()
        .includes(normalizedQuery),
    );
  }, [clientRows, query]);

  function formatUpdatedAt(value: string | null): string {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "-";
    return date.toLocaleDateString("de-DE");
  }

  async function handleCreateClient(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = form.name.trim();
    const clientNumber = form.client_number.trim();
    const taxNumber = form.tax_number.trim();
    const country = form.country.trim().toUpperCase();
    const address = form.address.trim();
    const email = form.email.trim();
    const phone = form.phone.trim();

    if (!name || !clientNumber || !taxNumber || !country) return;

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const { data: createdClient, error } = await supabase
        .from("clients")
        .insert({
          name,
          client_number: clientNumber,
          tax_number: taxNumber,
          country,
        })
        .select("id")
        .single<{ id: string }>();

      if (error) {
        setErrorMessage(toErrorMessage("Mandant konnte nicht angelegt werden.", error.message));
        setIsSubmitting(false);
        return;
      }

      const metadata = readClientMetadata();
      metadata[createdClient.id] = {
        address: address || "nicht gepflegt",
        salutation: form.salutation,
        isCompany: form.is_company,
        email: email || "nicht gepflegt",
        phone: phone || "nicht gepflegt",
      };
      writeClientMetadata(metadata);

      await fetchClients({ keepLoadingState: true });
      setIsSubmitting(false);
      setShowCreateModal(false);
      setForm(emptyForm);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : null;
      setErrorMessage(toErrorMessage("Mandant konnte nicht angelegt werden.", message));
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-zinc-300 bg-white p-6 shadow-sm">
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
        {errorMessage ? (
          <p className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {errorMessage}
          </p>
        ) : null}
      </section>

      <section className="overflow-x-auto rounded-xl border border-zinc-300 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-zinc-200 text-sm">
          <thead className="bg-zinc-100 text-left text-zinc-700">
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
            {isLoading ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-zinc-500">
                  Mandanten werden geladen...
                </td>
              </tr>
            ) : null}
            {filteredClients.map((client) => (
              <tr key={client.id} className="text-zinc-700">
                <td className="px-4 py-3">
                  <p className="font-medium text-zinc-900">{client.name}</p>
                </td>
                <td className="px-4 py-3">{client.client_number}</td>
                <td className="px-4 py-3">{client.tax_number}</td>
                <td className="px-4 py-3">{client.country}</td>
                <td className="px-4 py-3">{client.status}</td>
                <td className="px-4 py-3">{formatUpdatedAt(client.updated_at)}</td>
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
            {!isLoading && filteredClients.length === 0 ? (
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
          <section className="w-full max-w-3xl rounded-xl border border-zinc-200 bg-white p-6 shadow-lg">
            <h3 className="text-lg font-semibold text-zinc-900">Mandant anlegen</h3>
            <form onSubmit={handleCreateClient} className="mt-4 grid gap-3 md:grid-cols-2">
              <label className="text-sm text-zinc-700 md:col-span-2">
                Name/Firmenname
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
                  value={form.client_number}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, client_number: event.target.value }))
                  }
                  className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2"
                  required
                />
              </label>
              <label className="text-sm text-zinc-700">
                Steuernummer
                <input
                  type="text"
                  value={form.tax_number}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, tax_number: event.target.value }))
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
                  value={form.country}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, country: event.target.value }))
                  }
                  className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 uppercase"
                  required
                />
              </label>
              <label className="text-sm text-zinc-700">
                Mandantentyp
                <select
                  value={form.is_company ? "firma" : "privat"}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      is_company: event.target.value === "firma",
                    }))
                  }
                  className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2"
                >
                  <option value="firma">Firma</option>
                  <option value="privat">Privatperson</option>
                </select>
              </label>
              {!form.is_company ? (
                <label className="text-sm text-zinc-700">
                  Geschlecht/Anrede
                  <select
                    value={form.salutation}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        salutation: event.target.value as Salutation,
                      }))
                    }
                    className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2"
                  >
                    <option value="Herr">Herr</option>
                    <option value="Frau">Frau</option>
                  </select>
                </label>
              ) : null}
              <label className="text-sm text-zinc-700 md:col-span-2">
                Adresse
                <input
                  type="text"
                  value={form.address}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, address: event.target.value }))
                  }
                  className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2"
                  placeholder="Straße, Hausnummer, PLZ Ort"
                />
              </label>
              <label className="text-sm text-zinc-700">
                E-Mail
                <input
                  type="email"
                  value={form.email}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, email: event.target.value }))
                  }
                  className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2"
                />
              </label>
              <label className="text-sm text-zinc-700">
                Telefon
                <input
                  type="text"
                  value={form.phone}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, phone: event.target.value }))
                  }
                  className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2"
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
                  disabled={isSubmitting}
                  className="rounded-md bg-zinc-900 px-3 py-2 text-sm font-medium text-zinc-50 hover:bg-zinc-700"
                >
                  {isSubmitting ? "Speichert..." : "Mandant speichern"}
                </button>
              </div>
            </form>
          </section>
        </div>
      ) : null}
    </div>
  );
}
