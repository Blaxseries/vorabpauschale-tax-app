import { NextResponse } from "next/server";

import { createAdminClient } from "@/utils/supabase/admin";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

const ALLOWED_FIELDS = [
  "isin",
  "fondsname",
  "anzahl_anteile",
  "kurs_jahresanfang",
  "kurs_jahresende",
  "ausschuettungen",
  "waehrung",
  "kauf_datum",
  "verkauf_datum",
] as const;

type AllowedField = (typeof ALLOWED_FIELDS)[number];

function isAllowedField(key: string): key is AllowedField {
  return (ALLOWED_FIELDS as readonly string[]).includes(key);
}

export async function PATCH(request: Request, context: RouteContext) {
  const { id: positionId } = await context.params;

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
    const body = (await request.json()) as Record<string, unknown>;
    const updates: Partial<Record<AllowedField, unknown>> = {};

    for (const [key, value] of Object.entries(body)) {
      if (!isAllowedField(key)) continue;
      updates[key] = value;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "Keine gültigen Felder zum Aktualisieren." }, { status: 400 });
    }

    const { data: existing, error: existingError } = await supabase
      .from("extracted_positions")
      .select("id, review_status")
      .eq("id", positionId)
      .maybeSingle<{ id: string; review_status: string }>();

    if (existingError || !existing) {
      return NextResponse.json({ error: "Position wurde nicht gefunden." }, { status: 404 });
    }

    if (existing.review_status === "approved") {
      return NextResponse.json(
        { error: "Freigegebene Positionen können nicht mehr geändert werden." },
        { status: 403 },
      );
    }

    const { data: updated, error: updateError } = await supabase
      .from("extracted_positions")
      .update(updates)
      .eq("id", positionId)
      .select(
        "id, document_id, portfolio_id, isin, fondsname, anzahl_anteile, kurs_jahresanfang, kurs_jahresende, ausschuettungen, waehrung, kauf_datum, verkauf_datum, review_status, created_at",
      )
      .maybeSingle();

    if (updateError) {
      throw updateError;
    }

    return NextResponse.json({ position: updated });
  } catch (error) {
    console.error("Position-Update fehlgeschlagen:", error);
    return NextResponse.json(
      { error: "Die Position konnte nicht gespeichert werden." },
      { status: 500 },
    );
  }
}
