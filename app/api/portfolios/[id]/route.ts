import { NextResponse } from "next/server";

import { createAdminClient } from "@/utils/supabase/admin";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

type StatementUploadRow = {
  id: string;
  storage_bucket: string | null;
  storage_path: string | null;
};

export async function DELETE(_request: Request, context: RouteContext) {
  const { id: portfolioId } = await context.params;

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
    const { data: portfolio, error: portfolioError } = await supabase
      .from("portfolios")
      .select("id")
      .eq("id", portfolioId)
      .maybeSingle<{ id: string }>();

    if (portfolioError || !portfolio) {
      return NextResponse.json({ error: "Depot wurde nicht gefunden." }, { status: 404 });
    }

    const { data: uploads, error: uploadsError } = await supabase
      .from("statement_uploads")
      .select("id, storage_bucket, storage_path")
      .eq("portfolio_id", portfolioId)
      .returns<StatementUploadRow[]>();

    if (uploadsError) {
      throw uploadsError;
    }

    const uploadRows = uploads ?? [];
    const documentIds = uploadRows.map((row) => row.id);

    if (documentIds.length > 0) {
      const { error: extractedError } = await supabase
        .from("extracted_positions")
        .delete()
        .in("document_id", documentIds);

      if (extractedError) {
        throw extractedError;
      }
    }

    // Auch direkt über portfolio_id absichern (falls Zeilen ohne document-Match existieren)
    const { error: extractedByPortfolioError } = await supabase
      .from("extracted_positions")
      .delete()
      .eq("portfolio_id", portfolioId);

    if (extractedByPortfolioError) {
      throw extractedByPortfolioError;
    }

    for (const upload of uploadRows) {
      if (upload.storage_bucket && upload.storage_path) {
        const { error: storageError } = await supabase.storage
          .from(upload.storage_bucket)
          .remove([upload.storage_path]);

        if (storageError) {
          console.error("Storage-Löschung für Depot fehlgeschlagen:", storageError);
          // Weiter: Metadaten trotzdem bereinigen
        }
      }
    }

    if (documentIds.length > 0) {
      const { error: deleteUploadsError } = await supabase
        .from("statement_uploads")
        .delete()
        .in("id", documentIds);

      if (deleteUploadsError) {
        throw deleteUploadsError;
      }
    }

    const { error: fundPositionsError } = await supabase
      .from("fund_positions")
      .delete()
      .eq("portfolio_id", portfolioId);

    if (fundPositionsError) {
      throw fundPositionsError;
    }

    const { error: deletePortfolioError } = await supabase
      .from("portfolios")
      .delete()
      .eq("id", portfolioId);

    if (deletePortfolioError) {
      throw deletePortfolioError;
    }

    return NextResponse.json({
      success: true,
      deletedDocuments: documentIds.length,
    });
  } catch (error) {
    console.error("Depot-Löschung fehlgeschlagen:", error);
    return NextResponse.json(
      {
        error:
          "Das Depot und die zugehörigen Dokumente konnten nicht gelöscht werden. Bitte erneut versuchen.",
      },
      { status: 500 },
    );
  }
}
