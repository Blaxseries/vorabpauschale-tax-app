"use client";

import { useEffect, useState } from "react";

import { supabase } from "@/lib/supabase";

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
  clientId: string;
  taxYearId: string;
  portfolioOptions: PortfolioOption[];
};

export function DocumentsWorkflow({
  clientId,
  taxYearId,
  portfolioOptions,
}: DocumentsWorkflowProps) {
  const [selectedPortfolioId, setSelectedPortfolioId] = useState(
    portfolioOptions[0]?.id ?? "",
  );
  const [rows, setRows] = useState<DocumentRow[]>([]);
  const [fileRenameDrafts, setFileRenameDrafts] = useState<Record<string, string>>({});
  const [pendingUploadName, setPendingUploadName] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isLoadingRows, setIsLoadingRows] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  type StatementRow = {
    id: string;
    portfolio_id: string | null;
    display_name: string;
    original_filename: string;
    upload_status: string;
    uploaded_at: string;
    document_type: string | null;
  };

  function mapUploadStatus(status: string): DocumentStatus {
    if (status === "uploaded") return "Hochgeladen";
    if (status === "processing") return "Extraktion läuft";
    if (status === "needs_review") return "Prüfung erforderlich";
    if (status === "approved") return "Freigegeben";
    return "Fehler";
  }

  async function loadRows() {
    setIsLoadingRows(true);
    setErrorMessage(null);
    const portfolioIds = portfolioOptions.map((portfolio) => portfolio.id);
    if (portfolioIds.length === 0) {
      setRows([]);
      setIsLoadingRows(false);
      return;
    }

    const { data, error } = await supabase
      .from("statement_uploads")
      .select(
        "id, portfolio_id, display_name, original_filename, upload_status, uploaded_at, document_type",
      )
      .in("portfolio_id", portfolioIds)
      .returns<StatementRow[]>();

    if (error) {
      console.error("Fehler beim Laden der Dokumentenübersicht:", error);
      setErrorMessage(`Dokumente konnten nicht geladen werden: ${error.message}`);
      setRows([]);
      setIsLoadingRows(false);
      return;
    }

    const mappedRows: DocumentRow[] = data.map((entry) => ({
      id: entry.id,
      fileName: entry.display_name || entry.original_filename,
      portfolioId: entry.portfolio_id ?? "",
      documentType: entry.document_type ?? "Upload",
      uploadedAt: new Date(entry.uploaded_at).toLocaleDateString("de-DE"),
      status: mapUploadStatus(entry.upload_status),
    }));

    setRows(mappedRows);
    setIsLoadingRows(false);
  }

  useEffect(() => {
    void loadRows();
  }, [clientId, taxYearId, portfolioOptions]);

  function getPortfolioLabel(portfolioId: string): string {
    return (
      portfolioOptions.find((portfolio) => portfolio.id === portfolioId)?.label ??
      "Unbekanntes Depot"
    );
  }

  function handleFileSelection(files: FileList | null) {
    if (!files || files.length === 0) {
      return;
    }
    setSelectedFiles(Array.from(files));
  }

  async function handleUploadSubmit() {
    if (selectedFiles.length === 0 || !selectedPortfolioId) {
      return;
    }

    setIsUploading(true);
    setErrorMessage(null);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    for (const [index, file] of selectedFiles.entries()) {
      const documentId = crypto.randomUUID();
      const displayName =
        index === 0 && pendingUploadName.trim() ? pendingUploadName.trim() : file.name;
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const storagePath =
        `portfolios/${selectedPortfolioId}/uploads/` +
        `${documentId}-${safeName}`;

      const { error: storageError } = await supabase.storage
        .from("raw-documents")
        .upload(storagePath, file, { upsert: false, contentType: file.type });

      if (storageError) {
        console.error("Fehler beim Storage-Upload:", storageError);
        setErrorMessage(`Storage-Upload fehlgeschlagen: ${storageError.message}`);
        continue;
      }

      const { error: insertError } = await supabase.from("statement_uploads").insert({
        id: documentId,
        client_id: clientId,
        tax_year_id: taxYearId,
        portfolio_id: selectedPortfolioId,
        display_name: displayName,
        file_name: displayName,
        original_filename: file.name,
        storage_bucket: "raw-documents",
        storage_path: storagePath,
        mime_type: file.type || "application/octet-stream",
        file_size_bytes: file.size,
        status: "uploaded",
        upload_status: "uploaded",
        anonymization_status: "not_started",
        extraction_status: "not_started",
        uploaded_at: new Date().toISOString(),
        uploaded_by: user?.id ?? null,
        document_type: "Upload",
      });

      if (insertError) {
        console.error("Fehler beim Tabelleninsert:", insertError);
        setErrorMessage(`Metadaten konnten nicht gespeichert werden: ${insertError.message}`);

        const { error: rollbackError } = await supabase.storage
          .from("raw-documents")
          .remove([storagePath]);
        if (rollbackError) {
          console.error("Fehler beim Storage-Rollback:", rollbackError);
        }
      }
    }

    setPendingUploadName("");
    setSelectedFiles([]);
    setIsUploading(false);
    await loadRows();
  }

  const selectedFileLabel =
    selectedFiles.length === 0
      ? "Keine Datei ausgewählt"
      : selectedFiles.length === 1
        ? selectedFiles[0].name
        : `${selectedFiles.length} Dateien ausgewählt`;

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

  function handleRenameSave(id: string, nameDraft?: string) {
    const nextName = (nameDraft ?? fileRenameDrafts[id])?.trim();
    if (!nextName) return;
    setRows((current) =>
      current.map((row) => (row.id === id ? { ...row, fileName: nextName } : row)),
    );
    setFileRenameDrafts((current) => {
      const { [id]: _, ...rest } = current;
      return rest;
    });
  }

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-zinc-900">Upload</h3>
        <p className="mt-1 text-sm text-zinc-600">Akzeptierte Formate: PDF, XLSX, CSV</p>
        {errorMessage ? (
          <p className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {errorMessage}
          </p>
        ) : null}
        <div className="mt-4 grid gap-3 lg:grid-cols-4">
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

          <label className="text-sm text-zinc-700 lg:col-span-2">
            Dokumente
            <input
              type="file"
              multiple
              accept=".pdf,.xlsx,.csv"
              onChange={(event) => handleFileSelection(event.target.files)}
              className="mt-1 block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm file:mr-2 file:rounded file:border-0 file:bg-zinc-900 file:px-2 file:py-1 file:text-xs file:text-white"
            />
            <p className="mt-1 text-xs text-zinc-500">{selectedFileLabel}</p>
          </label>

          <div className="text-sm text-zinc-700">
            Dateiname (optional)
            <input
              type="text"
              value={pendingUploadName}
              onChange={(event) => setPendingUploadName(event.target.value)}
              className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm"
              placeholder="z. B. Jahresstatement_UBS_2026.pdf"
            />
            <button
              type="button"
              onClick={handleUploadSubmit}
              disabled={isUploading}
              className="mt-3 w-full rounded-md bg-zinc-900 px-3 py-2 text-sm font-medium text-zinc-50 hover:bg-zinc-700"
            >
              {isUploading ? "Upload läuft..." : "Dokumente übernehmen"}
            </button>
          </div>
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
              {isLoadingRows ? (
                <tr>
                  <td colSpan={6} className="px-3 py-6 text-center text-zinc-500">
                    Dokumentenübersicht wird geladen...
                  </td>
                </tr>
              ) : null}
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
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        aria-label="Zur Prüftabelle"
                        title="Zur Prüftabelle"
                        className="rounded-md border border-zinc-300 p-1.5 text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
                      >
                        <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" aria-hidden="true">
                          <rect x="3" y="4" width="14" height="12" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
                          <path d="M3 8h14M8 8v8" stroke="currentColor" strokeWidth="1.5" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleStatusChange(row.id)}
                        aria-label="Status ändern"
                        title="Status ändern"
                        className="rounded-md border border-zinc-300 p-1.5 text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
                      >
                        <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" aria-hidden="true">
                          <path
                            d="M16 10a6 6 0 11-1.76-4.24M16 3v3h-3"
                            stroke="currentColor"
                            strokeWidth="1.6"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const nextName = window.prompt("Neuen Dateinamen eingeben", row.fileName);
                          if (!nextName) return;
                          setFileRenameDrafts((current) => ({ ...current, [row.id]: nextName }));
                          handleRenameSave(row.id, nextName);
                        }}
                        aria-label="Umbenennen"
                        title="Umbenennen"
                        className="rounded-md border border-zinc-300 p-1.5 text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
                      >
                        <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" aria-hidden="true">
                          <path
                            d="M4 13.5V16h2.5L15 7.5 12.5 5 4 13.5z"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                          <path d="M11.8 5.7l2.5 2.5" stroke="currentColor" strokeWidth="1.5" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(row.id)}
                        aria-label="Löschen"
                        title="Löschen"
                        className="rounded-md border border-zinc-300 p-1.5 text-red-700 hover:bg-red-50"
                      >
                        <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" aria-hidden="true">
                          <path d="M4.5 6h11" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                          <path
                            d="M7.5 6V4.8c0-.44.36-.8.8-.8h3.4c.44 0 .8.36.8.8V6m-7 0l.6 9.2c.03.44.4.8.85.8h6.1c.45 0 .82-.36.85-.8L15.5 6"
                            stroke="currentColor"
                            strokeWidth="1.4"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!isLoadingRows && rows.length === 0 ? (
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
