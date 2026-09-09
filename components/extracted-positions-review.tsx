"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { KeyboardEvent } from "react";

import type { ExtractedPosition } from "@/lib/database.types";

type ExtractedPositionsReviewProps = {
  clientId: string;
  year: string;
  documentId: string;
};

type DocumentMeta = {
  id: string;
  fileName: string;
  mimeType: string;
  uploadStatus: string | null;
  portfolioId: string | null;
  portfolioLabel: string;
  updatedAt: string | null;
  isFullyApproved: boolean;
};

type EditableField =
  | "isin"
  | "fondsname"
  | "anzahl_anteile"
  | "kurs_jahresanfang"
  | "kurs_jahresende"
  | "ausschuettungen"
  | "waehrung"
  | "kauf_datum"
  | "verkauf_datum";

type ColumnDef = {
  key: EditableField;
  label: string;
  inputType: "text" | "number" | "date";
};

const COLUMNS: ColumnDef[] = [
  { key: "isin", label: "ISIN", inputType: "text" },
  { key: "fondsname", label: "Fondsname", inputType: "text" },
  { key: "anzahl_anteile", label: "Anzahl Anteile", inputType: "number" },
  { key: "kurs_jahresanfang", label: "Kurs Jahresanfang", inputType: "number" },
  { key: "kurs_jahresende", label: "Kurs Jahresende", inputType: "number" },
  { key: "ausschuettungen", label: "Ausschüttungen", inputType: "number" },
  { key: "waehrung", label: "Währung", inputType: "text" },
  { key: "kauf_datum", label: "Kaufdatum", inputType: "date" },
  { key: "verkauf_datum", label: "Verkaufsdatum", inputType: "date" },
];

function formatDisplayValue(value: unknown, inputType: ColumnDef["inputType"]): string {
  if (value == null || value === "") return "—";
  if (inputType === "date") {
    const raw = String(value).slice(0, 10);
    const date = new Date(`${raw}T00:00:00`);
    if (Number.isNaN(date.getTime())) return raw;
    return date.toLocaleDateString("de-DE");
  }
  if (inputType === "number") {
    const num = typeof value === "number" ? value : Number(value);
    if (!Number.isFinite(num)) return String(value);
    return num.toLocaleString("de-DE", { maximumFractionDigits: 6 });
  }
  return String(value);
}

function toInputValue(value: unknown, inputType: ColumnDef["inputType"]): string {
  if (value == null) return "";
  if (inputType === "date") return String(value).slice(0, 10);
  return String(value);
}

function parseInputValue(
  raw: string,
  inputType: ColumnDef["inputType"],
): string | number | null {
  const trimmed = raw.trim();
  if (inputType === "date") {
    return trimmed === "" ? null : trimmed;
  }
  if (inputType === "number") {
    if (trimmed === "") return null;
    const normalized = trimmed.replace(",", ".");
    const num = Number(normalized);
    if (!Number.isFinite(num)) {
      throw new Error("Bitte eine gültige Zahl eingeben.");
    }
    return num;
  }
  return trimmed;
}

function isPdfMime(mimeType: string): boolean {
  return mimeType.toLowerCase().includes("pdf");
}

export function ExtractedPositionsReview({
  clientId,
  year,
  documentId,
}: ExtractedPositionsReviewProps) {
  const documentsListHref = `/clients/${clientId}/years/${year}/documents`;

  const [documentMeta, setDocumentMeta] = useState<DocumentMeta | null>(null);
  const [positions, setPositions] = useState<ExtractedPosition[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showOriginal, setShowOriginal] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewFileName, setPreviewFileName] = useState<string | null>(null);
  const [previewMimeType, setPreviewMimeType] = useState<string | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [editingCell, setEditingCell] = useState<{
    positionId: string;
    field: EditableField;
  } | null>(null);
  const [draftValue, setDraftValue] = useState("");
  const [saveErrors, setSaveErrors] = useState<Record<string, string>>({});
  const [isApproving, setIsApproving] = useState(false);
  const [approvedAt, setApprovedAt] = useState<string | null>(null);

  const isReadOnly = Boolean(documentMeta?.isFullyApproved);

  async function loadPositions() {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const response = await fetch(`/api/documents/${documentId}/positions`);
      const body = (await response.json().catch(() => null)) as {
        document?: DocumentMeta;
        positions?: ExtractedPosition[];
        error?: string;
      } | null;

      if (!response.ok) {
        throw new Error(body?.error ?? "Daten konnten nicht geladen werden.");
      }

      setDocumentMeta(body?.document ?? null);
      setPositions(body?.positions ?? []);
      if (body?.document?.isFullyApproved && body.document.updatedAt) {
        setApprovedAt(body.document.updatedAt);
      }
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Daten konnten nicht geladen werden.",
      );
      setDocumentMeta(null);
      setPositions([]);
    } finally {
      setIsLoading(false);
    }
  }

  async function loadPreviewUrl() {
    setIsLoadingPreview(true);
    setPreviewError(null);

    try {
      const response = await fetch(`/api/documents/${documentId}/preview-url`);
      const body = (await response.json().catch(() => null)) as {
        url?: string;
        mimeType?: string;
        fileName?: string;
        error?: string;
      } | null;

      if (!response.ok || !body?.url) {
        throw new Error(body?.error ?? "Vorschau-URL konnte nicht geladen werden.");
      }

      setPreviewUrl(body.url);
      setPreviewMimeType(body.mimeType ?? documentMeta?.mimeType ?? null);
      setPreviewFileName(body.fileName ?? documentMeta?.fileName ?? null);
    } catch (error) {
      setPreviewError(
        error instanceof Error ? error.message : "Vorschau-URL konnte nicht geladen werden.",
      );
      setPreviewUrl(null);
    } finally {
      setIsLoadingPreview(false);
    }
  }

  useEffect(() => {
    void loadPositions();
  }, [documentId]);

  useEffect(() => {
    if (!showOriginal) return;
    if (previewUrl || isLoadingPreview) return;
    void loadPreviewUrl();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- bewusst nur bei Einblenden neu laden
  }, [showOriginal]);

  function handleToggleOriginal() {
    setShowOriginal((current) => {
      const next = !current;
      if (next) {
        setPreviewError(null);
      }
      return next;
    });
  }

  function cellErrorKey(positionId: string, field: EditableField): string {
    return `${positionId}:${field}`;
  }

  function startEditing(position: ExtractedPosition, column: ColumnDef) {
    if (isReadOnly) return;
    setEditingCell({ positionId: position.id, field: column.key });
    setDraftValue(toInputValue(position[column.key], column.inputType));
  }

  async function commitEdit(position: ExtractedPosition, column: ColumnDef) {
    if (!editingCell || editingCell.positionId !== position.id || editingCell.field !== column.key) {
      return;
    }

    const errorKey = cellErrorKey(position.id, column.key);
    const previousValue = position[column.key];

    let nextValue: string | number | null;
    try {
      nextValue = parseInputValue(draftValue, column.inputType);
    } catch (error) {
      setSaveErrors((current) => ({
        ...current,
        [errorKey]: error instanceof Error ? error.message : "Ungültiger Wert.",
      }));
      return;
    }

    const previousComparable =
      previousValue == null ? null : column.inputType === "date" ? String(previousValue).slice(0, 10) : previousValue;
    if (nextValue === previousComparable) {
      setEditingCell(null);
      setSaveErrors((current) => {
        const next = { ...current };
        delete next[errorKey];
        return next;
      });
      return;
    }

    setPositions((current) =>
      current.map((row) =>
        row.id === position.id ? { ...row, [column.key]: nextValue } : row,
      ),
    );
    setEditingCell(null);

    try {
      const response = await fetch(`/api/extracted-positions/${position.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [column.key]: nextValue }),
      });
      const body = (await response.json().catch(() => null)) as {
        position?: ExtractedPosition;
        error?: string;
      } | null;

      if (!response.ok) {
        throw new Error(body?.error ?? "Speichern fehlgeschlagen.");
      }

      if (body?.position) {
        setPositions((current) =>
          current.map((row) => (row.id === position.id ? body.position! : row)),
        );
      }

      setSaveErrors((current) => {
        const next = { ...current };
        delete next[errorKey];
        return next;
      });
    } catch (error) {
      setPositions((current) =>
        current.map((row) =>
          row.id === position.id ? { ...row, [column.key]: previousValue } : row,
        ),
      );
      setSaveErrors((current) => ({
        ...current,
        [errorKey]: error instanceof Error ? error.message : "Speichern fehlgeschlagen.",
      }));
    }
  }

  function handleEditKeyDown(
    event: KeyboardEvent<HTMLInputElement>,
    position: ExtractedPosition,
    column: ColumnDef,
  ) {
    if (event.key === "Enter") {
      event.preventDefault();
      void commitEdit(position, column);
    }
    if (event.key === "Escape") {
      setEditingCell(null);
    }
  }

  async function handleApprove() {
    const confirmed = window.confirm(
      "Die Tabelle wird für die Vorabpauschale-Berechnung freigegeben. Nach der Freigabe sind keine Änderungen mehr möglich. Fortfahren?",
    );
    if (!confirmed) return;

    setIsApproving(true);
    setErrorMessage(null);

    try {
      const response = await fetch(`/api/documents/${documentId}/approve-all`, {
        method: "POST",
      });
      const body = (await response.json().catch(() => null)) as {
        approvedAt?: string;
        error?: string;
      } | null;

      if (!response.ok) {
        throw new Error(body?.error ?? "Freigabe fehlgeschlagen.");
      }

      const stamp = body?.approvedAt ?? new Date().toISOString();
      setApprovedAt(stamp);
      setDocumentMeta((current) =>
        current
          ? { ...current, isFullyApproved: true, uploadStatus: "reviewed", updatedAt: stamp }
          : current,
      );
      setPositions((current) =>
        current.map((row) => ({ ...row, review_status: "approved" })),
      );
      setEditingCell(null);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Freigabe fehlgeschlagen.");
    } finally {
      setIsApproving(false);
    }
  }

  const approvedLabel = approvedAt
    ? new Date(approvedAt).toLocaleString("de-DE", {
        dateStyle: "short",
        timeStyle: "short",
      })
    : null;

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-zinc-900">Extraktion prüfen</h2>
            <p className="mt-1 text-sm text-zinc-700">
              {documentMeta?.fileName ?? (isLoading ? "Lädt..." : "Dokument")}
            </p>
            <p className="text-sm text-zinc-500">
              Depot: {documentMeta?.portfolioLabel ?? "—"}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleToggleOriginal}
              className="rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-100"
            >
              {showOriginal ? "Original ausblenden" : "Original anzeigen"}
            </button>
            <Link
              href={documentsListHref}
              className="rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-100"
            >
              Zurück zur Dokumentenliste
            </Link>
          </div>
        </div>
        {errorMessage ? (
          <p className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {errorMessage}
          </p>
        ) : null}
      </section>

      <div
        className={[
          "grid gap-4 transition-all duration-300 ease-in-out",
          showOriginal ? "lg:grid-cols-[minmax(0,0.45fr)_minmax(0,0.55fr)]" : "grid-cols-1",
        ].join(" ")}
      >
        <section
          className={[
            "overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm transition-all duration-300 ease-in-out",
            showOriginal
              ? "max-h-[80vh] opacity-100"
              : "pointer-events-none max-h-0 border-0 p-0 opacity-0 shadow-none",
          ].join(" ")}
          aria-hidden={!showOriginal}
        >
          {showOriginal ? (
            <div className="flex h-[80vh] flex-col p-4">
              <h3 className="mb-3 text-sm font-semibold text-zinc-900">Originaldokument</h3>
              {isLoadingPreview ? (
                <p className="text-sm text-zinc-500">Vorschau wird geladen...</p>
              ) : null}
              {previewError ? (
                <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {previewError}
                </p>
              ) : null}
              {previewUrl && isPdfMime(previewMimeType ?? documentMeta?.mimeType ?? "") ? (
                <iframe
                  title="Original-PDF"
                  src={previewUrl}
                  className="h-full w-full flex-1 rounded-md border border-zinc-200 bg-zinc-50"
                />
              ) : null}
              {previewUrl && !isPdfMime(previewMimeType ?? documentMeta?.mimeType ?? "") ? (
                <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-5">
                  <p className="text-sm font-medium text-zinc-900">
                    {previewFileName ?? documentMeta?.fileName ?? "Dokument"}
                  </p>
                  <p className="mt-1 text-xs text-zinc-500">
                    Für XLSX/CSV ist keine Inline-Vorschau verfügbar.
                  </p>
                  <a
                    href={previewUrl}
                    download={previewFileName ?? undefined}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-4 inline-block rounded-md bg-zinc-900 px-3 py-2 text-sm font-medium text-zinc-50 hover:bg-zinc-700"
                  >
                    Original herunterladen
                  </a>
                </div>
              ) : null}
            </div>
          ) : null}
        </section>

        <section className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm transition-all duration-300 ease-in-out lg:p-6">
          <h3 className="text-lg font-semibold text-zinc-900">Extrahierte Positionen</h3>
          {isLoading ? (
            <p className="mt-4 text-sm text-zinc-500">Positionen werden geladen...</p>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full divide-y divide-zinc-200 text-sm">
                <thead className="bg-zinc-50 text-left text-zinc-600">
                  <tr>
                    {COLUMNS.map((column) => (
                      <th key={column.key} className="whitespace-nowrap px-3 py-2 font-medium">
                        {column.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200">
                  {positions.map((position) => (
                    <tr key={position.id} className="text-zinc-700">
                      {COLUMNS.map((column) => {
                        const isEditing =
                          editingCell?.positionId === position.id &&
                          editingCell.field === column.key;
                        const errorKey = cellErrorKey(position.id, column.key);
                        const cellError = saveErrors[errorKey];

                        return (
                          <td key={column.key} className="px-2 py-2 align-top">
                            {isEditing ? (
                              <input
                                autoFocus
                                type={column.inputType === "number" ? "text" : column.inputType}
                                value={draftValue}
                                onChange={(event) => setDraftValue(event.target.value)}
                                onBlur={() => void commitEdit(position, column)}
                                onKeyDown={(event) =>
                                  handleEditKeyDown(event, position, column)
                                }
                                className={[
                                  "w-full min-w-[6rem] rounded-md border px-2 py-1 text-sm",
                                  cellError
                                    ? "border-red-400 bg-red-50"
                                    : "border-zinc-300 bg-white",
                                ].join(" ")}
                              />
                            ) : (
                              <button
                                type="button"
                                disabled={isReadOnly}
                                title={
                                  cellError
                                    ? cellError
                                    : isReadOnly
                                      ? "Schreibgeschützt"
                                      : "Klicken zum Bearbeiten"
                                }
                                onClick={() => startEditing(position, column)}
                                className={[
                                  "block w-full min-w-[5rem] rounded-md px-2 py-1 text-left",
                                  isReadOnly
                                    ? "cursor-default text-zinc-600"
                                    : "hover:bg-zinc-100",
                                  cellError ? "border border-red-400 bg-red-50 text-red-800" : "",
                                ].join(" ")}
                              >
                                {formatDisplayValue(position[column.key], column.inputType)}
                              </button>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                  {positions.length === 0 ? (
                    <tr>
                      <td
                        colSpan={COLUMNS.length}
                        className="px-3 py-6 text-center text-zinc-500"
                      >
                        Keine extrahierten Positionen vorhanden.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          )}

          <div className="mt-6 border-t border-zinc-200 pt-4">
            {isReadOnly ? (
              <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                Tabelle geprüft und freigegeben
                {approvedLabel ? ` am ${approvedLabel}` : ""}
              </p>
            ) : (
              <button
                type="button"
                onClick={() => void handleApprove()}
                disabled={isApproving || isLoading || positions.length === 0}
                className="rounded-md bg-emerald-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isApproving
                  ? "Wird freigegeben..."
                  : "Prüfung abgeschlossen – Tabelle freigeben"}
              </button>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
