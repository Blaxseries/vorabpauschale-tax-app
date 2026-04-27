"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { FormEvent } from "react";

import type { Portfolio, TaxYear } from "@/lib/database.types";
import { supabase } from "@/lib/supabase";

type PortfolioStatus = "Offen" | "In Prüfung" | "Freigegeben";

type PortfolioRow = {
  id: string;
  bank_name: string;
  country: string;
  account_number: string;
  currency: string;
  documentCount: number;
  status: PortfolioStatus;
};

type PortfolioForm = {
  bank_name: string;
  country: string;
  account_number: string;
  currency: string;
};

const initialForm: PortfolioForm = {
  bank_name: "",
  country: "DE",
  account_number: "",
  currency: "EUR",
};

type PortfoliosWorkspaceProps = {
  clientId: string;
  year: string;
};

export function PortfoliosWorkspace({ clientId, year }: PortfoliosWorkspaceProps) {
  const [rows, setRows] = useState<PortfolioRow[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<PortfolioForm>(initialForm);
  const [taxYearId, setTaxYearId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  function toErrorMessage(prefix: string, message: string | null): string {
    if (!message) {
      return prefix;
    }
    return `${prefix} (${message})`;
  }

  async function fetchPortfolios() {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const { data: taxYearData, error: taxYearError } = await supabase
        .from("tax_years")
        .select("id")
        .eq("client_id", clientId)
        .eq("year", Number(year))
        .maybeSingle<Pick<TaxYear, "id">>();

      if (taxYearError) {
        setErrorMessage(
          toErrorMessage("Steuerjahr konnte nicht geladen werden.", taxYearError.message),
        );
        setRows([]);
        setIsLoading(false);
        return;
      }

      if (!taxYearData) {
        setTaxYearId(null);
        setErrorMessage("Steuerjahr nicht gefunden.");
        setRows([]);
        setIsLoading(false);
        return;
      }

      setTaxYearId(taxYearData.id);

      const { data: portfolioData, error: portfolioError } = await supabase
        .from("portfolios")
        .select("id, bank_name, country, account_number, currency")
        .eq("tax_year_id", taxYearData.id)
        .returns<
          Array<
            Pick<
              Portfolio,
              "id" | "bank_name" | "country" | "account_number" | "currency"
            >
          >
        >();

      if (portfolioError) {
        setErrorMessage(
          toErrorMessage("Depots konnten nicht geladen werden.", portfolioError.message),
        );
        setRows([]);
        setIsLoading(false);
        return;
      }

      const mappedRows: PortfolioRow[] = portfolioData.map((entry) => ({
        id: entry.id,
        bank_name: entry.bank_name,
        country: entry.country,
        account_number: entry.account_number,
        currency: entry.currency,
        documentCount: 0,
        status: "Offen",
      }));

      setRows(mappedRows);
      setIsLoading(false);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : null;
      setErrorMessage(toErrorMessage("Depots konnten nicht geladen werden.", message));
      setRows([]);
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void fetchPortfolios();
  }, [clientId, year]);

  async function handleCreatePortfolio(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const bankName = form.bank_name.trim();
    const country = form.country.trim().toUpperCase();
    const accountNumber = form.account_number.trim();
    const currency = form.currency.trim().toUpperCase();

    if (!bankName || !country || !accountNumber || !currency) {
      return;
    }

    if (!taxYearId) {
      setErrorMessage("Depot konnte nicht angelegt werden. Steuerjahr nicht gefunden.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const { error } = await supabase.from("portfolios").insert({
        tax_year_id: taxYearId,
        bank_name: bankName,
        country,
        account_number: accountNumber,
        currency,
      });

      if (error) {
        setErrorMessage(
          toErrorMessage("Depot konnte nicht angelegt werden.", error.message),
        );
        setIsSubmitting(false);
        return;
      }

      await fetchPortfolios();
      setIsSubmitting(false);
      setShowModal(false);
      setForm(initialForm);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : null;
      setErrorMessage(toErrorMessage("Depot konnte nicht angelegt werden.", message));
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-2xl font-semibold text-zinc-900">Depots</h2>
            <p className="mt-2 text-sm text-zinc-600">
              Verwaltung der Depots im Steuerjahr {year}.
            </p>
            {errorMessage ? (
              <p className="mt-2 text-sm text-red-700">{errorMessage}</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={() => setShowModal(true)}
            className="rounded-md bg-zinc-900 px-3 py-2 text-sm font-medium text-zinc-50 hover:bg-zinc-700"
          >
            Depot anlegen
          </button>
        </div>
      </section>

      <section className="overflow-x-auto rounded-xl border border-zinc-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-zinc-200 text-sm">
          <thead className="bg-zinc-50 text-left text-zinc-600">
            <tr>
              <th className="px-4 py-3 font-medium">Bank/Broker</th>
              <th className="px-4 py-3 font-medium">Land</th>
              <th className="px-4 py-3 font-medium">Depotnummer</th>
              <th className="px-4 py-3 font-medium">Währung</th>
              <th className="px-4 py-3 font-medium">Anzahl Dokumente</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Aktion</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200">
            {isLoading ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-zinc-500">
                  Depots werden geladen...
                </td>
              </tr>
            ) : null}
            {rows.map((row) => (
              <tr key={row.id} className="text-zinc-700">
                <td className="px-4 py-3 font-medium text-zinc-900">{row.bank_name}</td>
                <td className="px-4 py-3">{row.country}</td>
                <td className="px-4 py-3">{row.account_number}</td>
                <td className="px-4 py-3">{row.currency}</td>
                <td className="px-4 py-3">{row.documentCount}</td>
                <td className="px-4 py-3">{row.status}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-2">
                    <Link
                      href={`/clients/${clientId}/years/${year}/documents`}
                      className="rounded-md border border-zinc-300 px-2 py-1 text-xs text-zinc-700 hover:bg-zinc-100"
                    >
                      Dokumente öffnen
                    </Link>
                    <Link
                      href={`/clients/${clientId}/years/${year}/calculation`}
                      className="rounded-md border border-zinc-300 px-2 py-1 text-xs text-zinc-700 hover:bg-zinc-100"
                    >
                      Berechnung anzeigen
                    </Link>
                  </div>
                </td>
              </tr>
            ))}
            {!isLoading && rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-zinc-500">
                  Keine Depots für dieses Steuerjahr vorhanden.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </section>

      {showModal ? (
        <div className="fixed inset-0 z-20 flex items-center justify-center bg-zinc-950/30 p-4">
          <section className="w-full max-w-xl rounded-xl border border-zinc-200 bg-white p-6 shadow-lg">
            <h3 className="text-lg font-semibold text-zinc-900">Depot anlegen</h3>
            <form onSubmit={handleCreatePortfolio} className="mt-4 grid gap-3 md:grid-cols-2">
              <label className="text-sm text-zinc-700">
                Bank/Broker
                <input
                  type="text"
                  value={form.bank_name}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, bank_name: event.target.value }))
                  }
                  className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2"
                  required
                />
              </label>
              <label className="text-sm text-zinc-700">
                Land
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
                Depotnummer
                <input
                  type="text"
                  value={form.account_number}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      account_number: event.target.value,
                    }))
                  }
                  className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2"
                  required
                />
              </label>
              <label className="text-sm text-zinc-700">
                Währung
                <input
                  type="text"
                  maxLength={3}
                  value={form.currency}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, currency: event.target.value }))
                  }
                  className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 uppercase"
                  required
                />
              </label>
              <div className="flex items-end justify-end gap-2 md:col-span-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setForm(initialForm);
                  }}
                  className="rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-100"
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !taxYearId}
                  className="rounded-md bg-zinc-900 px-3 py-2 text-sm font-medium text-zinc-50 hover:bg-zinc-700"
                >
                  {isSubmitting ? "Speichert..." : "Depot speichern"}
                </button>
              </div>
            </form>
          </section>
        </div>
      ) : null}
    </div>
  );
}
