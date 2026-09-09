import { NextResponse } from "next/server";

import { createAdminClient } from "@/utils/supabase/admin";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

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

  try {
    const { data: document, error: documentError } = await supabase
      .from("statement_uploads")
      .select("id")
      .eq("id", documentId)
      .maybeSingle<{ id: string }>();

    if (documentError || !document) {
      return NextResponse.json({ error: "Dokument wurde nicht gefunden." }, { status: 404 });
    }

    const { count, error: countError } = await supabase
      .from("extracted_positions")
      .select("id", { count: "exact", head: true })
      .eq("document_id", documentId);

    if (countError) {
      throw countError;
    }

    if ((count ?? 0) === 0) {
      return NextResponse.json(
        { error: "Es liegen keine extrahierten Positionen zur Freigabe vor." },
        { status: 422 },
      );
    }

    const approvedAt = new Date().toISOString();

    const { error: positionsError } = await supabase
      .from("extracted_positions")
      .update({ review_status: "approved" })
      .eq("document_id", documentId);

    if (positionsError) {
      throw positionsError;
    }

    const { error: documentUpdateError } = await supabase
      .from("statement_uploads")
      .update({
        upload_status: "reviewed",
        error_message: null,
      })
      .eq("id", documentId);

    if (documentUpdateError) {
      throw documentUpdateError;
    }

    return NextResponse.json({
      success: true,
      approvedAt,
      positionCount: count,
    });
  } catch (error) {
    console.error("Freigabe fehlgeschlagen:", error);
    return NextResponse.json(
      { error: "Die Freigabe konnte nicht abgeschlossen werden." },
      { status: 500 },
    );
  }
}
