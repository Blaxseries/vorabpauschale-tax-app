"use client";

import Link from "next/link";
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
  | "Geprüft"
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
  "Geprüft",
  "Freigegeben",
  "Fehler",
];

const statusToUploadStatus: Record<DocumentStatus, string> = {
  Hochgeladen: "uploaded",
  "Extraktion läuft": "processing",
  "Prüfung erforderlich": "needs_review",
  Geprüft: "reviewed",
  Freigegeben: "approved",
  Fehler: "error",
};

const statusStyle: Record<DocumentStatus, string> = {
  Hochgeladen: "bg-zinc-100 text-zinc-700",
  "Extraktion läuft": "bg-blue-50 text-blue-700",
  "Prüfung erforderlich": "bg-amber-50 text-amber-700",
  Geprüft: "bg-emerald-50 text-emerald-800",
  Freigegeben: "bg-emerald-50 text-emerald-700",
  Fehler: "bg-red-50 text-red-700",
};

const extractableDocumentStatuses: DocumentStatus[] = [
  "Hochgeladen",
  "Prüfung erforderlich",
  "Fehler",
];

const reviewableDocumentStatuses: DocumentStatus[] = [
  "Prüfung erforderlich",
  "Geprüft",
  "Freigegeben",
];

type DocumentsWorkflowProps = {
  clientId: string;
  taxYearId: string;
  year: string;
  portfolioOptions: PortfolioOption[];
};

export function DocumentsWorkflow({
  clientId,
  taxYearId,
  year,
  portfolioOptions,
}: DocumentsWorkflowProps) {
  const [selectedPortfolioId, setSelectedPortfolioId] = useState(
    portfolioOptions[0]?.id ?? "",
  );
  const [rows, setRows] = useState<DocumentRow[]>([]);
  const [pendingUploadName, setPendingUploadName] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isLoadingRows, setIsLoadingRows] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [extractingByDocumentId, setExtractingByDocumentId] = useState<Record<string, boolean>>({});
  const [deletingByDocumentId, setDeletingByDocumentId] = useState<Record<string, boolean>>({});
  const [updatingByDocumentId, setUpdatingByDocumentId] = useState<Record<string, boolean>>({});

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
    if (status === "reviewed") return "Geprüft";
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

  async function handleStatusChange(id: string, currentStatus: DocumentStatus) {
    const index = statusCycle.indexOf(currentStatus);
    const nextStatus = statusCycle[(index + 1) % statusCycle.length];
    const uploadStatus = statusToUploadStatus[nextStatus];

    setUpdatingByDocumentId((current) => ({ ...current, [id]: true }));
    setErrorMessage(null);

    try {
      const response = await fetch(`/api/documents/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uploadStatus }),
      });
      const body = (await response.json().catch(() => null)) as { error?: string } | null;

      if (!response.ok) {
        throw new Error(body?.error ?? "Status konnte nicht gespeichert werden.");
      }

      await loadRows();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Status konnte nicht gespeichert werden.",
      );
    } finally {
      setUpdatingByDocumentId((current) => {
        const next = { ...current };
        delete next[id];
        return next;
      });
    }
  }

  async function handleDelete(id: string) {
    const confirmed = window.confirm(
      "Diese Datei und alle bereits extrahierten Positionen dazu werden endgültig gelöscht. Fortfahren?",
    );
    if (!confirmed) {
      return;
    }

    setDeletingByDocumentId((current) => ({ ...current, [id]: true }));
    setErrorMessage(null);

    try {
      const response = await fetch(`/api/documents/${id}`, { method: "DELETE" });
      const body = (await response.json().catch(() => null)) as { error?: string } | null;

      if (!response.ok) {
        throw new Error(body?.error ?? "Dokument konnte nicht gelöscht werden.");
      }

      await loadRows();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Dokument konnte nicht gelöscht werden.",
      );
    } finally {
      setDeletingByDocumentId((current) => {
        const next = { ...current };
        delete next[id];
        return next;
      });
    }
  }

  async function handleStartAiExtraction(documentId: string) {
    setErrorMessage(null);

    try {
      const precheckResponse = await fetch(`/api/documents/${documentId}/extract`);
      const precheckBody = (await precheckResponse.json().catch(() => null)) as {
        approvedCount?: number;
        error?: string;
      } | null;

      if (!precheckResponse.ok) {
        throw new Error(precheckBody?.error ?? "Vorabprüfung für KI-Auslesen fehlgeschlagen.");
      }

      const approvedCount = precheckBody?.approvedCount ?? 0;
      if (approvedCount > 0) {
        const confirmed = window.confirm(
          `Für dieses Dokument sind bereits ${approvedCount} Positionen geprüft und freigegeben. Erneutes Auslesen überschreibt diese. Fortfahren?`,
        );
        if (!confirmed) {
          return;
        }
      }
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Vorabprüfung für KI-Auslesen fehlgeschlagen.",
      );
      return;
    }

    setExtractingByDocumentId((current) => ({ ...current, [documentId]: true }));

    try {
      const response = await fetch(`/api/documents/${documentId}/extract`, {
        method: "POST",
      });

      const body = (await response.json().catch(() => null)) as { error?: string } | null;

      if (!response.ok) {
        throw new Error(body?.error ?? "KI-Auslesen fehlgeschlagen.");
      }

      await loadRows();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "KI-Auslesen fehlgeschlagen.",
      );
    } finally {
      setExtractingByDocumentId((current) => {
        const next = { ...current };
        delete next[documentId];
        return next;
      });
    }
  }

  async function handleRename(id: string, currentName: string) {
    const nextName = window.prompt("Neuen Dateinamen eingeben", currentName)?.trim();
    if (!nextName || nextName === currentName) return;

    setUpdatingByDocumentId((current) => ({ ...current, [id]: true }));
    setErrorMessage(null);

    try {
      const response = await fetch(`/api/documents/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName: nextName }),
      });
      const body = (await response.json().catch(() => null)) as { error?: string } | null;

      if (!response.ok) {
        throw new Error(body?.error ?? "Umbenennen fehlgeschlagen.");
      }

      await loadRows();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Umbenennen fehlgeschlagen.");
    } finally {
      setUpdatingByDocumentId((current) => {
        const next = { ...current };
        delete next[id];
        return next;
      });
    }
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
            Dateiname
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
              {rows.map((row) => {
                const isExtracting = Boolean(extractingByDocumentId[row.id]);
                const isDeleting = Boolean(deletingByDocumentId[row.id]);
                const isUpdating = Boolean(updatingByDocumentId[row.id]);
                const canStartExtraction =
                  extractableDocumentStatuses.includes(row.status) &&
                  !isExtracting &&
                  !isDeleting &&
                  !isUpdating;
                const canOpenReview = reviewableDocumentStatuses.includes(row.status);
                const reviewLabel =
                  row.status === "Prüfung erforderlich" ? "Prüfen" : "Ansehen";
                const actionsDisabled = isDeleting || isExtracting || isUpdating;

                return (
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
                    <div className="flex flex-wrap items-center gap-1">
                      <button
                        type="button"
                        onClick={() => void handleStartAiExtraction(row.id)}
                        disabled={!canStartExtraction}
                        aria-label="KI-Auslesen starten"
                        title={
                          canStartExtraction
                            ? "KI-Auslesen starten"
                            : "KI-Auslesen nicht verfügbar (nur bei Hochgeladen, Prüfung erforderlich oder Fehler)"
                        }
                        className="rounded-md border border-zinc-300 p-1.5 text-violet-700 hover:bg-violet-50 hover:text-violet-900 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent"
                      >
                        {isExtracting ? (
                          <span
                            className="block h-4 w-4 animate-spin rounded-full border-2 border-violet-200 border-t-violet-700"
                            aria-hidden="true"
                          />
                        ) : (
                        <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" aria-hidden="true">
                          <path
                            d="M10 3.5l1.1 2.4 2.6.4-1.9 1.8.4 2.6L10 9.6 7.8 10.7l.4-2.6-1.9-1.8 2.6-.4L10 3.5z"
                            stroke="currentColor"
                            strokeWidth="1.4"
                            strokeLinejoin="round"
                          />
                          <path
                            d="M4.5 15.5h11M6.5 12.5h7"
                            stroke="currentColor"
                            strokeWidth="1.4"
                            strokeLinecap="round"
                          />
                        </svg>
                        )}
                      </button>
                      {canOpenReview ? (
                        <Link
                          href={`/clients/${clientId}/years/${year}/documents/${row.id}/review`}
                          aria-label={reviewLabel}
                          title={reviewLabel}
                          className="rounded-md border border-amber-300 bg-amber-50 px-2 py-1.5 text-xs font-medium text-amber-800 hover:bg-amber-100"
                        >
                          {reviewLabel}
                        </Link>
                      ) : (
                        <span
                          aria-label="Prüfen (noch nicht verfügbar)"
                          title="Prüfen erst nach KI-Auslesen verfügbar"
                          className="rounded-md border border-zinc-200 px-2 py-1.5 text-xs font-medium text-zinc-400"
                        >
                          Prüfen
                        </span>
                      )}
                      <Link
                        href={`/clients/${clientId}/years/${year}/modules/vorabpauschale/review-table`}
                        aria-label="Zur Prüftabelle"
                        title="Zur Prüftabelle"
                        className="rounded-md border border-zinc-300 p-1.5 text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
                      >
                        <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" aria-hidden="true">
                          <rect x="3" y="4" width="14" height="12" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
                          <path d="M3 8h14M8 8v8" stroke="currentColor" strokeWidth="1.5" />
                        </svg>
                      </Link>
                      <button
                        type="button"
                        onClick={() => void handleStatusChange(row.id, row.status)}
                        disabled={actionsDisabled}
                        aria-label="Status ändern"
                        title="Status ändern"
                        className="rounded-md border border-zinc-300 p-1.5 text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 disabled:cursor-not-allowed disabled:opacity-50"
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
                        onClick={() => void handleRename(row.id, row.fileName)}
                        disabled={actionsDisabled}
                        aria-label="Umbenennen"
                        title="Umbenennen"
                        className="rounded-md border border-zinc-300 p-1.5 text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 disabled:cursor-not-allowed disabled:opacity-50"
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
                        onClick={() => void handleDelete(row.id)}
                        disabled={actionsDisabled}
                        aria-label="Löschen"
                        title="Löschen"
                        className="rounded-md border border-zinc-300 p-1.5 text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {isDeleting ? (
                          <span
                            className="block h-4 w-4 animate-spin rounded-full border-2 border-red-200 border-t-red-700"
                            aria-hidden="true"
                          />
                        ) : (
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
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
                );
              })}
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
