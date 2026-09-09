import { NextResponse } from "next/server";

import type { ExtractedPosition } from "@/lib/database.types";
import { createAdminClient } from "@/utils/supabase/admin";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

type DocumentMeta = {
  id: string;
  display_name: string | null;
  original_filename: string | null;
  mime_type: string | null;
  upload_status: string | null;
  portfolio_id: string | null;
  updated_at: string | null;
  portfolios:
    | { bank_name: string; country: string; account_number: string | null }
    | { bank_name: string; country: string; account_number: string | null }[]
    | null;
};

function asSingle<T>(value: T | T[] | null | undefined): T | null {
  if (value == null) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
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

  try {
    const { data: document, error: documentError } = await supabase
      .from("statement_uploads")
      .select(
        `
        id,
        display_name,
        original_filename,
        mime_type,
        upload_status,
        portfolio_id,
        updated_at,
        portfolios (
          bank_name,
          country,
          account_number
        )
      `,
      )
      .eq("id", documentId)
      .maybeSingle<DocumentMeta>();

    if (documentError || !document) {
      return NextResponse.json({ error: "Dokument wurde nicht gefunden." }, { status: 404 });
    }

    const { data: positions, error: positionsError } = await supabase
      .from("extracted_positions")
      .select(
        "id, document_id, portfolio_id, isin, fondsname, anzahl_anteile, kurs_jahresanfang, kurs_jahresende, ausschuettungen, waehrung, kauf_datum, verkauf_datum, review_status, created_at",
      )
      .eq("document_id", documentId)
      .order("created_at", { ascending: true })
      .returns<ExtractedPosition[]>();

    if (positionsError) {
      throw positionsError;
    }

    const portfolio = asSingle(document.portfolios);
    const portfolioLabel = portfolio
      ? `${portfolio.bank_name} (${portfolio.country})${
          portfolio.account_number ? ` · ${portfolio.account_number}` : ""
        }`
      : "Unbekanntes Depot";

    const allApproved =
      (positions?.length ?? 0) > 0 &&
      positions!.every((position) => position.review_status === "approved");

    return NextResponse.json({
      document: {
        id: document.id,
        fileName: document.display_name || document.original_filename || "Dokument",
        mimeType: document.mime_type ?? "application/octet-stream",
        uploadStatus: document.upload_status,
        portfolioId: document.portfolio_id,
        portfolioLabel,
        updatedAt: document.updated_at,
        isFullyApproved: allApproved || document.upload_status === "reviewed",
      },
      positions: positions ?? [],
    });
  } catch (error) {
    console.error("Positionen konnten nicht geladen werden:", error);
    return NextResponse.json(
      { error: "Extrahierte Positionen konnten nicht geladen werden." },
      { status: 500 },
    );
  }
}
