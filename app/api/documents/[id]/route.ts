import { NextResponse } from "next/server";

import { createAdminClient } from "@/utils/supabase/admin";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

const ALLOWED_UPLOAD_STATUSES = new Set([
  "uploaded",
  "processing",
  "needs_review",
  "reviewed",
  "approved",
  "error",
]);

function adminClientOrErrorResponse() {
  try {
    return { supabase: createAdminClient(), errorResponse: null as NextResponse | null };
  } catch {
    return {
      supabase: null,
      errorResponse: NextResponse.json(
        { error: "Server-Konfiguration unvollständig. Bitte Administrator kontaktieren." },
        { status: 500 },
      ),
    };
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  const { id: documentId } = await context.params;
  const { supabase, errorResponse } = adminClientOrErrorResponse();

  if (!supabase) {
    return errorResponse!;
  }

  try {
    const body = (await request.json()) as {
      displayName?: string;
      uploadStatus?: string;
    };

    const updates: Record<string, string> = {};

    if (typeof body.displayName === "string") {
      const trimmed = body.displayName.trim();
      if (!trimmed) {
        return NextResponse.json({ error: "Dateiname darf nicht leer sein." }, { status: 400 });
      }
      updates.display_name = trimmed;
      updates.file_name = trimmed;
    }

    if (typeof body.uploadStatus === "string") {
      if (!ALLOWED_UPLOAD_STATUSES.has(body.uploadStatus)) {
        return NextResponse.json({ error: "Ungültiger Dokumentenstatus." }, { status: 400 });
      }
      updates.upload_status = body.uploadStatus;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "Keine gültigen Felder zum Aktualisieren." }, { status: 400 });
    }

    const { data: existing, error: existingError } = await supabase
      .from("statement_uploads")
      .select("id")
      .eq("id", documentId)
      .maybeSingle<{ id: string }>();

    if (existingError || !existing) {
      return NextResponse.json({ error: "Dokument wurde nicht gefunden." }, { status: 404 });
    }

    const { error: updateError } = await supabase
      .from("statement_uploads")
      .update(updates)
      .eq("id", documentId);

    if (updateError) {
      throw updateError;
    }

    return NextResponse.json({ success: true, ...updates });
  } catch (error) {
    console.error("Dokument-Update fehlgeschlagen:", error);
    return NextResponse.json(
      { error: "Das Dokument konnte nicht aktualisiert werden." },
      { status: 500 },
    );
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const { id: documentId } = await context.params;
  const { supabase, errorResponse } = adminClientOrErrorResponse();

  if (!supabase) {
    return errorResponse!;
  }

  try {
    const { data: document, error: documentError } = await supabase
      .from("statement_uploads")
      .select("id, storage_bucket, storage_path")
      .eq("id", documentId)
      .maybeSingle<{ id: string; storage_bucket: string | null; storage_path: string | null }>();

    if (documentError || !document) {
      return NextResponse.json({ error: "Dokument wurde nicht gefunden." }, { status: 404 });
    }

    const { error: positionsError } = await supabase
      .from("extracted_positions")
      .delete()
      .eq("document_id", documentId);

    if (positionsError) {
      throw positionsError;
    }

    if (document.storage_bucket && document.storage_path) {
      const { error: storageError } = await supabase.storage
        .from(document.storage_bucket)
        .remove([document.storage_path]);

      if (storageError) {
        throw storageError;
      }
    }

    const { error: deleteError } = await supabase
      .from("statement_uploads")
      .delete()
      .eq("id", documentId);

    if (deleteError) {
      throw deleteError;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Dokumenten-Löschung fehlgeschlagen:", error);
    return NextResponse.json(
      { error: "Das Dokument konnte nicht gelöscht werden. Bitte erneut versuchen." },
      { status: 500 },
    );
  }
}
