"use client";

import { useMemo, useState } from "react";

import { calculateVorabpauschale } from "@/lib/calculations/vorabpauschale";
import { fundPositions } from "@/lib/mock-data";

type PortfolioSummary = {
  id: string;
  name: string;
  documentApproved: boolean;
  reviewApproved: boolean;
  entries: typeof fundPositions;
};

const portfolioSummaries: PortfolioSummary[] = [
  {
    id: "pf-2026-001",
    name: "Deutsche Bank · DEP-7781001",
    documentApproved: true,
    reviewApproved: true,
    entries: [fundPositions[0], fundPositions[1]],
  },
  {
    id: "pf-2026-002",
    name: "UBS · DEP-9104218",
    documentApproved: false,
    reviewApproved: true,
    entries: [fundPositions[2]],
  },
  {
    id: "pf-2026-003",
    name: "Baader Bank · DEP-2255044",
    documentApproved: true,
    reviewApproved: false,
    entries: [fundPositions[3]],
  },
];

type CalculationSummaryProps = {
  year: string;
};

export function CalculationSummary({ year }: CalculationSummaryProps) {
  const [lastRefreshAt, setLastRefreshAt] = useState(
    new Date().toLocaleString("de-DE"),
  );

  const rows = useMemo(
    () =>
      portfolioSummaries.map((portfolio) => {
        const portfolioTotal = portfolio.entries.reduce((sum, position) => {
          return sum + calculateVorabpauschale(position).finalTax;
        }, 0);

        return {
          ...portfolio,
          portfolioTotal,
        };
      }),
    [],
  );

  const yearTotal = rows.reduce((sum, row) => sum + row.portfolioTotal, 0);
  const warnings = rows.flatMap((row) => {
    const issues: string[] = [];
    if (!row.documentApproved) {
      issues.push(`Dokumente für ${row.name} sind noch nicht freigegeben.`);
    }
    if (!row.reviewApproved) {
      issues.push(`Prüftabelle für ${row.name} enthält offene Punkte.`);
    }
    return issues;
  });

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-2xl font-semibold text-zinc-900">Berechnung</h2>
            <p className="mt-2 text-sm text-zinc-600">
              Jahreszusammenfassung der Vorabpauschale für {year}.
            </p>
            <p className="mt-1 text-xs text-zinc-500">
              Letzte Aktualisierung: {lastRefreshAt}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setLastRefreshAt(new Date().toLocaleString("de-DE"))}
              className="rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-100"
            >
              Berechnung aktualisieren
            </button>
            <button
              type="button"
              className="rounded-md bg-zinc-900 px-3 py-2 text-sm font-medium text-zinc-50 hover:bg-zinc-700"
            >
              Export vorbereiten
            </button>
          </div>
        </div>
      </section>

      {warnings.length > 0 ? (
        <section className="rounded-xl border border-amber-200 bg-amber-50 p-4 shadow-sm">
          <h3 className="text-sm font-semibold text-amber-800">Warnungen</h3>
          <ul className="mt-2 space-y-1 text-sm text-amber-800">
            {warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="overflow-x-auto rounded-xl border border-zinc-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-zinc-200 text-sm">
          <thead className="bg-zinc-50 text-left text-zinc-600">
            <tr>
              <th className="px-4 py-3 font-medium">Depot</th>
              <th className="px-4 py-3 font-medium">Status Dokumente</th>
              <th className="px-4 py-3 font-medium">Status Prüftabelle</th>
              <th className="px-4 py-3 font-medium">Vorabpauschale</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200">
            {rows.map((row) => (
              <tr key={row.id} className="text-zinc-700">
                <td className="px-4 py-3 font-medium text-zinc-900">{row.name}</td>
                <td className="px-4 py-3">
                  {row.documentApproved ? "Freigegeben" : "Ausstehend"}
                </td>
                <td className="px-4 py-3">
                  {row.reviewApproved ? "Freigegeben" : "Ausstehend"}
                </td>
                <td className="px-4 py-3">{row.portfolioTotal.toFixed(2)} EUR</td>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-zinc-50">
            <tr>
              <td className="px-4 py-3 font-semibold text-zinc-900" colSpan={3}>
                Gesamt Vorabpauschale Steuerjahr {year}
              </td>
              <td className="px-4 py-3 font-semibold text-zinc-900">
                {yearTotal.toFixed(2)} EUR
              </td>
            </tr>
          </tfoot>
        </table>
      </section>
    </div>
  );
}
