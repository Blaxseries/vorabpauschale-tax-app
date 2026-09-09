import { NextResponse } from "next/server";

import { createAdminClient } from "@/utils/supabase/admin";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

const SIGNED_URL_TTL_SECONDS = 60 * 60;

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

  try {
    const { data: document, error: documentError } = await supabase
      .from("statement_uploads")
      .select("id, storage_bucket, storage_path, mime_type, display_name, original_filename")
      .eq("id", documentId)
      .maybeSingle<{
        id: string;
        storage_bucket: string | null;
        storage_path: string | null;
        mime_type: string | null;
        display_name: string | null;
        original_filename: string | null;
      }>();

    if (documentError || !document) {
      return NextResponse.json({ error: "Dokument wurde nicht gefunden." }, { status: 404 });
    }

    if (!document.storage_bucket || !document.storage_path) {
      return NextResponse.json(
        { error: "Für dieses Dokument ist kein Speicherpfad hinterlegt." },
        { status: 422 },
      );
    }

    const { data: signed, error: signedError } = await supabase.storage
      .from(document.storage_bucket)
      .createSignedUrl(document.storage_path, SIGNED_URL_TTL_SECONDS);

    if (signedError || !signed?.signedUrl) {
      throw signedError ?? new Error("Signed URL konnte nicht erzeugt werden.");
    }

    return NextResponse.json({
      url: signed.signedUrl,
      mimeType: document.mime_type ?? "application/octet-stream",
      fileName: document.display_name || document.original_filename || "Dokument",
      expiresInSeconds: SIGNED_URL_TTL_SECONDS,
    });
  } catch (error) {
    console.error("Preview-URL fehlgeschlagen:", error);
    return NextResponse.json(
      { error: "Die Vorschau-URL konnte nicht erzeugt werden." },
      { status: 500 },
    );
  }
}
