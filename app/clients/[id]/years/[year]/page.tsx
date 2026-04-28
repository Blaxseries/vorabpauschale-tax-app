import Link from "next/link";

import { ClientYearNav } from "@/components/client-year-nav";
import type { Client, TaxYear } from "@/lib/database.types";
import { supabase } from "@/lib/supabase";

type ClientYearOverviewPageProps = {
  params: Promise<{
    id: string;
    year: string;
  }>;
};

export default async function ClientYearOverviewPage({
  params,
}: ClientYearOverviewPageProps) {
  const { id, year } = await params;
  const numericYear = Number(year);
  const { data: client, error: clientError } = await supabase
    .from("clients")
    .select("id, name, tax_number, country")
    .eq("id", id)
    .maybeSingle<Pick<Client, "id" | "name" | "tax_number" | "country">>();
  const { data: taxYear, error: taxYearError } = await supabase
    .from("tax_years")
    .select("id, client_id, year, status")
    .eq("client_id", id)
    .eq("year", numericYear)
    .maybeSingle<Pick<TaxYear, "id" | "client_id" | "year" | "status">>();

  if (!client || clientError) {
    return (
      <section className="rounded-xl border border-red-200 bg-red-50 p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-red-800">Mandant nicht gefunden</h2>
        <p className="mt-2 text-sm text-red-700">
          Der Mandant konnte für diese URL nicht geladen werden.
        </p>
      </section>
    );
  }

  if (!taxYear || taxYearError) {
    return (
      <div>
        <ClientYearNav clientId={id} year={year} />
        <section className="rounded-xl border border-amber-200 bg-amber-50 p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-amber-800">Steuerjahr nicht gefunden</h2>
          <p className="mt-2 text-sm text-amber-700">
            Für {client.name} existiert kein Steuerjahr {year}.
          </p>
          <Link
            href={`/clients/${id}`}
            className="mt-4 inline-block rounded-md border border-amber-300 px-3 py-2 text-sm text-amber-800 hover:bg-amber-100"
          >
            Zur Mandantenakte
          </Link>
        </section>
      </div>
    );
  }

  return (
    <div>
      <ClientYearNav clientId={id} year={year} />
      <section className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className="text-2xl font-semibold text-zinc-900">Übersicht</h2>
        <p className="mt-2 text-sm text-zinc-600">
          Steuerjahr {year} · {client.name} · Status{" "}
          {taxYear.status === "completed"
            ? "Abgeschlossen"
            : taxYear.status === "in_progress"
              ? "In Bearbeitung"
              : "Offen"}
        </p>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <article className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
            <h3 className="text-sm font-semibold text-zinc-900">Mandantenakte</h3>
            <p className="mt-2 text-sm text-zinc-700">{client.name}</p>
            <p className="text-sm text-zinc-600">Steuernummer: {client.tax_number}</p>
            <p className="text-sm text-zinc-600">Land: {client.country}</p>
            <Link
              href={`/clients/${id}`}
              className="mt-3 inline-block rounded border border-zinc-300 px-2 py-1 text-xs text-zinc-700 hover:bg-zinc-100"
            >
              Zur Mandantenakte
            </Link>
          </article>
          <article className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
            <h3 className="text-sm font-semibold text-zinc-900">Stammdaten im Steuerjahr</h3>
            <ul className="mt-2 space-y-1 text-sm text-zinc-600">
              <li>Steuerjahr: {year}</li>
              <li>Aktenstatus: {taxYear.status === "completed" ? "Abgeschlossen" : taxYear.status === "in_progress" ? "In Bearbeitung" : "Offen"}</li>
              <li>Mandant-ID: {client.id}</li>
            </ul>
          </article>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <Link
            href={`/clients/${id}/years/${year}/documents`}
            className="rounded-md border border-zinc-300 p-3 text-sm text-zinc-700 hover:bg-zinc-100"
          >
            Zu Dokumente
          </Link>
          <Link
            href={`/clients/${id}/years/${year}/calculation`}
            className="rounded-md border border-zinc-300 p-3 text-sm text-zinc-700 hover:bg-zinc-100"
          >
            Zu Berechnung
          </Link>
        </div>
      </section>
    </div>
  );
}
