"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";

import type { Client as DatabaseClient, TaxYear } from "@/lib/database.types";
import { supabase } from "@/lib/supabase";

type ClientDetailWorkspaceProps = {
  clientId: string;
};

type ClientRow = Pick<DatabaseClient, "id" | "name" | "tax_number" | "country">;
type TaxYearRow = Pick<TaxYear, "id" | "client_id" | "year" | "status">;

type TaxYearForm = {
  year: string;
  status: TaxYear["status"];
};

const initialTaxYearForm: TaxYearForm = {
  year: String(new Date().getFullYear()),
  status: "open",
};

function formatTaxYearStatus(status: TaxYear["status"]): string {
  if (status === "completed") {
    return "Abgeschlossen";
  }
  if (status === "in_progress") {
    return "In Bearbeitung";
  }
  return "Offen";
}

export function ClientDetailWorkspace({ clientId }: ClientDetailWorkspaceProps) {
  const [client, setClient] = useState<ClientRow | null>(null);
  const [taxYears, setTaxYears] = useState<TaxYearRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState<TaxYearForm>(initialTaxYearForm);

  const latestYear = useMemo(() => {
    return [...taxYears].sort((a, b) => b.year - a.year)[0] ?? null;
  }, [taxYears]);

  async function fetchClientAndTaxYears() {
    setIsLoading(true);
    setErrorMessage(null);

    const [{ data: clientData, error: clientError }, { data: taxYearData, error: taxYearError }] =
      await Promise.all([
        supabase.from("clients").select("id, name, tax_number, country").eq("id", clientId).maybeSingle<ClientRow>(),
        supabase
          .from("tax_years")
          .select("id, client_id, year, status")
          .eq("client_id", clientId)
          .returns<TaxYearRow[]>(),
      ]);

    if (clientError || !clientData) {
      setErrorMessage("Mandant konnte nicht geladen werden.");
      setIsLoading(false);
      return;
    }

    if (taxYearError) {
      setErrorMessage("Steuerjahre konnten nicht geladen werden.");
      setIsLoading(false);
      return;
    }

    const sortedTaxYears = [...taxYearData].sort((a, b) => b.year - a.year);
    setClient(clientData);
    setTaxYears(sortedTaxYears);
    setIsLoading(false);
  }

  useEffect(() => {
    void fetchClientAndTaxYears();
  }, [clientId]);

  async function handleCreateTaxYear(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const numericYear = Number(form.year);

    if (!Number.isInteger(numericYear) || numericYear < 1900 || numericYear > 3000) {
      setErrorMessage("Bitte ein gültiges Steuerjahr angeben.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    const { error } = await supabase.from("tax_years").insert({
      client_id: clientId,
      year: numericYear,
      status: form.status,
    });

    if (error) {
      setErrorMessage("Steuerjahr konnte nicht angelegt werden.");
      setIsSubmitting(false);
      return;
    }

    await fetchClientAndTaxYears();
    setIsSubmitting(false);
    setShowCreateModal(false);
    setForm(initialTaxYearForm);
  }

  if (isLoading) {
    return (
      <section className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
        <p className="text-sm text-zinc-600">Mandantenakte wird geladen...</p>
      </section>
    );
  }

  if (!client) {
    return (
      <section className="rounded-xl border border-red-200 bg-red-50 p-6 shadow-sm">
        <p className="text-sm text-red-700">
          Mandant wurde nicht gefunden oder konnte nicht geladen werden.
        </p>
      </section>
    );
  }

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className="text-2xl font-semibold text-zinc-900">Mandantenakte</h2>
        <p className="mt-2 text-sm text-zinc-600">
          Übersicht für {client.name} mit Stammdaten, Steuerjahren und letzter Aktivität.
        </p>
        {errorMessage ? (
          <p className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {errorMessage}
          </p>
        ) : null}
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <article className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-zinc-900">Mandant Übersicht</h3>
          <p className="mt-2 text-sm text-zinc-700">{client.name}</p>
          <p className="text-sm text-zinc-600">Steuernummer: {client.tax_number}</p>
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
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-lg font-semibold text-zinc-900">Steuerjahre</h3>
            <button
              type="button"
              onClick={() => setShowCreateModal(true)}
              className="rounded-md bg-zinc-900 px-3 py-2 text-xs font-medium text-zinc-50 hover:bg-zinc-700"
            >
              Steuerjahr anlegen
            </button>
          </div>
          <ul className="mt-3 space-y-2 text-sm text-zinc-700">
            {taxYears.map((taxYear) => (
              <li key={taxYear.id} className="flex items-center justify-between">
                <span>
                  {taxYear.year} · {formatTaxYearStatus(taxYear.status)}
                </span>
                <Link
                  href={`/clients/${client.id}/years/${taxYear.year}`}
                  className="text-zinc-800 underline-offset-2 hover:underline"
                >
                  öffnen
                </Link>
              </li>
            ))}
            {taxYears.length === 0 ? (
              <li className="text-zinc-500">Noch keine Steuerjahre vorhanden.</li>
            ) : null}
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

      {showCreateModal ? (
        <div className="fixed inset-0 z-20 flex items-center justify-center bg-zinc-950/30 p-4">
          <section className="w-full max-w-lg rounded-xl border border-zinc-200 bg-white p-6 shadow-lg">
            <h3 className="text-lg font-semibold text-zinc-900">Steuerjahr anlegen</h3>
            <form onSubmit={handleCreateTaxYear} className="mt-4 grid gap-3 md:grid-cols-2">
              <label className="text-sm text-zinc-700">
                Steuerjahr
                <input
                  type="number"
                  min={1900}
                  max={3000}
                  value={form.year}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, year: event.target.value }))
                  }
                  className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2"
                  required
                />
              </label>
              <label className="text-sm text-zinc-700">
                Status
                <select
                  value={form.status}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      status: event.target.value as TaxYear["status"],
                    }))
                  }
                  className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2"
                >
                  <option value="open">Offen</option>
                  <option value="in_progress">In Bearbeitung</option>
                  <option value="completed">Abgeschlossen</option>
                </select>
              </label>
              <div className="flex items-end justify-end gap-2 md:col-span-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setForm(initialTaxYearForm);
                  }}
                  className="rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-100"
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="rounded-md bg-zinc-900 px-3 py-2 text-sm font-medium text-zinc-50 hover:bg-zinc-700 disabled:opacity-70"
                >
                  {isSubmitting ? "Speichert..." : "Steuerjahr speichern"}
                </button>
              </div>
            </form>
          </section>
        </div>
      ) : null}
    </div>
  );
}
