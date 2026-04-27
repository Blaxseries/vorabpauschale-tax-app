import Link from "next/link";
import { notFound } from "next/navigation";

import type { Client, TaxYear } from "@/lib/database.types";
import { supabase } from "@/lib/supabase";

type ClientYearsPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function ClientYearsPage({ params }: ClientYearsPageProps) {
  const { id } = await params;
  const { data: client, error: clientError } = await supabase
    .from("clients")
    .select("id, name")
    .eq("id", id)
    .maybeSingle<Pick<Client, "id" | "name">>();

  if (!client || clientError) {
    notFound();
  }

  const { data: yearsData, error: yearsError } = await supabase
    .from("tax_years")
    .select("id, year")
    .eq("client_id", id)
    .returns<Array<Pick<TaxYear, "id" | "year">>>();

  if (yearsError) {
    notFound();
  }

  const years = [...yearsData].sort((a, b) => b.year - a.year);

  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
      <h2 className="text-2xl font-semibold text-zinc-900">Steuerjahre</h2>
      <p className="mt-2 text-sm text-zinc-600">Mandant: {client.name}</p>
      <ul className="mt-4 space-y-2 text-sm text-zinc-700">
        {years.map((entry) => (
          <li key={entry.id} className="flex items-center justify-between">
            <span>{entry.year}</span>
            <Link
              href={`/clients/${id}/years/${entry.year}`}
              className="text-zinc-800 underline-offset-2 hover:underline"
            >
              Arbeitsbereich öffnen
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
