"use client";

import Link from "next/link";
import { useState } from "react";
import type { FormEvent } from "react";

type PortfolioStatus = "Offen" | "In Prüfung" | "Freigegeben";

type PortfolioRow = {
  id: string;
  bank: string;
  country: string;
  accountNumber: string;
  currency: string;
  documentCount: number;
  status: PortfolioStatus;
};

type PortfolioForm = {
  bank: string;
  country: string;
  accountNumber: string;
  currency: string;
};

const initialForm: PortfolioForm = {
  bank: "",
  country: "DE",
  accountNumber: "",
  currency: "EUR",
};

const initialRows: PortfolioRow[] = [
  {
    id: "pf-2026-001",
    bank: "Deutsche Bank",
    country: "DE",
    accountNumber: "DEP-7781001",
    currency: "EUR",
    documentCount: 4,
    status: "In Prüfung",
  },
  {
    id: "pf-2026-002",
    bank: "UBS",
    country: "CH",
    accountNumber: "DEP-9104218",
    currency: "CHF",
    documentCount: 2,
    status: "Offen",
  },
];

type PortfoliosWorkspaceProps = {
  clientId: string;
  year: string;
};

export function PortfoliosWorkspace({ clientId, year }: PortfoliosWorkspaceProps) {
  const [rows, setRows] = useState<PortfolioRow[]>(initialRows);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<PortfolioForm>(initialForm);

  function handleCreatePortfolio(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const bank = form.bank.trim();
    const country = form.country.trim().toUpperCase();
    const accountNumber = form.accountNumber.trim();
    const currency = form.currency.trim().toUpperCase();

    if (!bank || !country || !accountNumber || !currency) {
      return;
    }

    const newPortfolio: PortfolioRow = {
      id: `pf-${crypto.randomUUID()}`,
      bank,
      country,
      accountNumber,
      currency,
      documentCount: 0,
      status: "Offen",
    };

    setRows((current) => [newPortfolio, ...current]);
    setShowModal(false);
    setForm(initialForm);
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
            {rows.map((row) => (
              <tr key={row.id} className="text-zinc-700">
                <td className="px-4 py-3 font-medium text-zinc-900">{row.bank}</td>
                <td className="px-4 py-3">{row.country}</td>
                <td className="px-4 py-3">{row.accountNumber}</td>
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
                  value={form.bank}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, bank: event.target.value }))
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
                  value={form.accountNumber}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      accountNumber: event.target.value,
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
                  className="rounded-md bg-zinc-900 px-3 py-2 text-sm font-medium text-zinc-50 hover:bg-zinc-700"
                >
                  Depot speichern
                </button>
              </div>
            </form>
          </section>
        </div>
      ) : null}
    </div>
  );
}
