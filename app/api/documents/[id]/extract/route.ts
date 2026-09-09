import { NextResponse } from "next/server";

import { extractPositionsFromDocument } from "@/lib/extraction/extract";
import { createAdminClient } from "@/utils/supabase/admin";

const GENERIC_EXTRACTION_ERROR =
  "Die automatische Auswertung ist fehlgeschlagen. Bitte erneut versuchen oder die Daten manuell erfassen.";

type StatementUploadRow = {
  id: string;
  portfolio_id: string | null;
  storage_bucket: string | null;
  storage_path: string | null;
  mime_type: string | null;
  upload_status: string | null;
};

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

const REEXTRACTABLE_UPLOAD_STATUSES = new Set(["uploaded", "needs_review", "error"]);

async function markExtractionError(
  supabase: ReturnType<typeof createAdminClient>,
  documentId: string,
) {
  await supabase
    .from("statement_uploads")
    .update({
      upload_status: "error",
      extraction_status: "error",
      error_message: GENERIC_EXTRACTION_ERROR,
    })
    .eq("id", documentId);
}

export async function GET(_request: Request, context: RouteContext) {
  const { id: documentId } = await context.params;

  let supabase: ReturnType<typeof createAdminClient>;
  try {
    supabase = createAdminClient();
  } catch {
    return NextResponse.json(
      { error: "Server-Konfiguration unvollständig. Bitte Administrator kontaktieren." },
      { status: 500 },
    );
  }

  const { count, error } = await supabase
    .from("extracted_positions")
    .select("id", { count: "exact", head: true })
    .eq("document_id", documentId)
    .eq("review_status", "approved");

  if (error) {
    console.error("Freigegebene Positionen konnten nicht gezählt werden:", error);
    return NextResponse.json(
      { error: "Vorabprüfung für erneutes Auslesen fehlgeschlagen." },
      { status: 500 },
    );
  }

  return NextResponse.json({ approvedCount: count ?? 0 });
}

export async function POST(_request: Request, context: RouteContext) {
  const { id: documentId } = await context.params;

  let supabase: ReturnType<typeof createAdminClient>;
  try {
    supabase = createAdminClient();
  } catch {
    return NextResponse.json(
      { error: "Server-Konfiguration unvollständig. Bitte Administrator kontaktieren." },
      { status: 500 },
    );
  }

  let portfolioId: string | null = null;

  try {
    const { data: document, error: documentError } = await supabase
      .from("statement_uploads")
      .select("id, portfolio_id, storage_bucket, storage_path, mime_type, upload_status")
      .eq("id", documentId)
      .maybeSingle<StatementUploadRow>();

    if (documentError || !document) {
      return NextResponse.json({ error: "Dokument wurde nicht gefunden." }, { status: 404 });
    }

    if (
      !document.upload_status ||
      !REEXTRACTABLE_UPLOAD_STATUSES.has(document.upload_status)
    ) {
      return NextResponse.json(
        { error: "KI-Auslesen ist für diesen Dokumentenstatus nicht verfügbar." },
        { status: 409 },
      );
    }

    if (!document.portfolio_id || !document.storage_bucket || !document.storage_path) {
      return NextResponse.json(
        { error: "Dokumentmetadaten sind unvollständig." },
        { status: 422 },
      );
    }

    portfolioId = document.portfolio_id;

    const { error: processingError } = await supabase
      .from("statement_uploads")
      .update({
        upload_status: "processing",
        extraction_status: "processing",
        error_message: null,
      })
      .eq("id", documentId);

    if (processingError) {
      throw processingError;
    }

    const { data: fileBlob, error: downloadError } = await supabase.storage
      .from(document.storage_bucket)
      .download(document.storage_path);

    if (downloadError || !fileBlob) {
      throw downloadError ?? new Error("Storage download failed");
    }

    const fileBuffer = Buffer.from(await fileBlob.arrayBuffer());
    const mimeType = document.mime_type ?? "application/octet-stream";
    const extractedPositions = await extractPositionsFromDocument(fileBuffer, mimeType);

    const { error: clearPositionsError } = await supabase
      .from("extracted_positions")
      .delete()
      .eq("document_id", documentId);

    if (clearPositionsError) {
      throw clearPositionsError;
    }

    const rowsToInsert = extractedPositions.map((position) => ({
      document_id: documentId,
      portfolio_id: portfolioId,
      isin: position.isin,
      fondsname: position.fondsname,
      anzahl_anteile: position.anzahl_anteile,
      kurs_jahresanfang: position.kurs_jahresanfang,
      kurs_jahresende: position.kurs_jahresende,
      ausschuettungen: position.ausschuettungen,
      waehrung: position.waehrung,
      kauf_datum: position.kauf_datum,
      verkauf_datum: position.verkauf_datum,
      review_status: "needs_review",
    }));

    const { error: insertError } = await supabase.from("extracted_positions").insert(rowsToInsert);

    if (insertError) {
      throw insertError;
    }

    const { error: completeError } = await supabase
      .from("statement_uploads")
      .update({
        upload_status: "needs_review",
        extraction_status: "completed",
        error_message: null,
      })
      .eq("id", documentId);

    if (completeError) {
      throw completeError;
    }

    return NextResponse.json({
      success: true,
      positionCount: extractedPositions.length,
    });
  } catch (error) {
    console.error("Dokumenten-Extraktion fehlgeschlagen:", error);
    await markExtractionError(supabase, documentId);

    return NextResponse.json({ error: GENERIC_EXTRACTION_ERROR }, { status: 500 });
  }
}
