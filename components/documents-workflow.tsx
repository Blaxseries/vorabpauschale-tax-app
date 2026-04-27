"use client";

import { useMemo, useState } from "react";

type PortfolioOption = {
  id: string;
  label: string;
};

type DocumentStatus =
  | "Hochgeladen"
  | "Extraktion läuft"
  | "Prüfung erforderlich"
  | "Freigegeben"
  | "Fehler";

type DocumentRow = {
  id: string;
  fileName: string;
  portfolioId: string;
  documentType: string;
  uploadedAt: string;
  status: DocumentStatus;
};

const workflowSteps = [
  "Upload",
  "Extraktion",
  "Prüfung",
  "Freigabe",
  "Berechnung",
] as const;

const statusCycle: DocumentStatus[] = [
  "Hochgeladen",
  "Extraktion läuft",
  "Prüfung erforderlich",
  "Freigegeben",
  "Fehler",
];

const statusStyle: Record<DocumentStatus, string> = {
  Hochgeladen: "bg-zinc-100 text-zinc-700",
  "Extraktion läuft": "bg-blue-50 text-blue-700",
  "Prüfung erforderlich": "bg-amber-50 text-amber-700",
  Freigegeben: "bg-emerald-50 text-emerald-700",
  Fehler: "bg-red-50 text-red-700",
};

type DocumentsWorkflowProps = {
  year: string;
  portfolioOptions: PortfolioOption[];
};

export function DocumentsWorkflow({
  year,
  portfolioOptions,
}: DocumentsWorkflowProps) {
  const [selectedPortfolioId, setSelectedPortfolioId] = useState(
    portfolioOptions[0]?.id ?? "",
  );
  const [rows, setRows] = useState<DocumentRow[]>([
    {
      id: "doc-001",
      fileName: "Kontoauszug_Q1_2026.pdf",
      portfolioId: portfolioOptions[0]?.id ?? "",
      documentType: "Kontoauszug",
      uploadedAt: `12.02.${year}`,
      status: "Freigegeben",
    },
    {
      id: "doc-002",
      fileName: "Transaktionen_Maerz_2026.csv",
      portfolioId: portfolioOptions[1]?.id ?? portfolioOptions[0]?.id ?? "",
      documentType: "Transaktionsliste",
      uploadedAt: `20.03.${year}`,
      status: "Prüfung erforderlich",
    },
    {
      id: "doc-003",
      fileName: "Depotreport_042026.xlsx",
      portfolioId: portfolioOptions[0]?.id ?? "",
      documentType: "Depotreport",
      uploadedAt: `05.04.${year}`,
      status: "Extraktion läuft",
    },
  ]);

  const stepState = useMemo(() => {
    const hasUpload = rows.length > 0;
    const hasExtraction = rows.some((row) =>
      ["Extraktion läuft", "Prüfung erforderlich", "Freigegeben"].includes(
        row.status,
      ),
    );
    const hasReview = rows.some((row) =>
      ["Prüfung erforderlich", "Freigegeben"].includes(row.status),
    );
    const hasApproval = rows.some((row) => row.status === "Freigegeben");

    return [hasUpload, hasExtraction, hasReview, hasApproval, hasApproval];
  }, [rows]);

  function getPortfolioLabel(portfolioId: string): string {
    return (
      portfolioOptions.find((portfolio) => portfolio.id === portfolioId)?.label ??
      "Unbekanntes Depot"
    );
  }

  function handleFileSelection(files: FileList | null) {
    if (!files || files.length === 0 || !selectedPortfolioId) {
      return;
    }

    const now = new Date();
    const dateLabel = now.toLocaleDateString("de-DE");
    const newRows: DocumentRow[] = Array.from(files).map((file) => ({
      id: `doc-${crypto.randomUUID()}`,
      fileName: file.name,
      portfolioId: selectedPortfolioId,
      documentType: "Upload",
      uploadedAt: dateLabel,
      status: "Hochgeladen",
    }));

    setRows((current) => [...newRows, ...current]);
  }

  function handleStatusChange(id: string) {
    setRows((current) =>
      current.map((row) => {
        if (row.id !== id) {
          return row;
        }

        const index = statusCycle.indexOf(row.status);
        const nextStatus = statusCycle[(index + 1) % statusCycle.length];
        return { ...row, status: nextStatus };
      }),
    );
  }

  function handleDelete(id: string) {
    setRows((current) => current.filter((row) => row.id !== id));
  }

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-700">
          Workflow-Status
        </h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {workflowSteps.map((step, index) => {
            const done = stepState[index];

            return (
              <span
                key={step}
                className={[
                  "rounded-full border px-3 py-1.5 text-xs",
                  done
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                    : "border-zinc-200 bg-zinc-50 text-zinc-600",
                ].join(" ")}
              >
                {index + 1}. {step}
              </span>
            );
          })}
        </div>
      </section>

      <section className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-zinc-900">Upload</h3>
        <p className="mt-1 text-sm text-zinc-600">Akzeptierte Formate: PDF, XLSX, CSV</p>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <label className="text-sm text-zinc-700">
            Depot auswählen
            <select
              className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm"
              value={selectedPortfolioId}
              onChange={(event) => setSelectedPortfolioId(event.target.value)}
            >
              {portfolioOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="text-sm text-zinc-700">
            Datei hochladen
            <input
              type="file"
              multiple
              accept=".pdf,.xlsx,.csv"
              onChange={(event) => handleFileSelection(event.target.files)}
              className="mt-1 block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-zinc-900 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-zinc-50"
            />
          </label>
        </div>
      </section>

      <section className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-zinc-900">Dokumente</h3>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full divide-y divide-zinc-200 text-sm">
            <thead className="bg-zinc-50 text-left text-zinc-600">
              <tr>
                <th className="px-3 py-2 font-medium">Datei</th>
                <th className="px-3 py-2 font-medium">Depot</th>
                <th className="px-3 py-2 font-medium">Typ</th>
                <th className="px-3 py-2 font-medium">Upload-Datum</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 font-medium">Aktion</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200">
              {rows.map((row) => (
                <tr key={row.id} className="text-zinc-700">
                  <td className="px-3 py-3">{row.fileName}</td>
                  <td className="px-3 py-3">{getPortfolioLabel(row.portfolioId)}</td>
                  <td className="px-3 py-3">{row.documentType}</td>
                  <td className="px-3 py-3">{row.uploadedAt}</td>
                  <td className="px-3 py-3">
                    <span
                      className={`rounded-md px-2 py-1 text-xs font-medium ${statusStyle[row.status]}`}
                    >
                      {row.status}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        className="rounded-md border border-zinc-300 px-2 py-1 text-xs hover:bg-zinc-100"
                      >
                        Zur Prüftabelle
                      </button>
                      <button
                        type="button"
                        onClick={() => handleStatusChange(row.id)}
                        className="rounded-md border border-zinc-300 px-2 py-1 text-xs hover:bg-zinc-100"
                      >
                        Status ändern
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(row.id)}
                        className="rounded-md border border-zinc-300 px-2 py-1 text-xs text-red-700 hover:bg-red-50"
                      >
                        Löschen
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-6 text-center text-zinc-500">
                    Keine Dokumente vorhanden.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
