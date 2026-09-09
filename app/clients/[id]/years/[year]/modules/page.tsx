import Link from "next/link";

import { ClientYearNav } from "@/components/client-year-nav";

type YearModulesPageProps = {
  params: Promise<{
    id: string;
    year: string;
  }>;
};

const modules = [
  {
    key: "vorabpauschale",
    title: "Vorabpauschale",
    status: "Aktiv" as const,
    description: "Prüfung, Berechnung und Export der Vorabpauschale",
    hrefSuffix: "vorabpauschale/review-table",
    available: true,
  },
  {
    key: "fifo",
    title: "FIFO / Veräußerungsgewinne",
    status: "Noch nicht verfügbar" as const,
    description: "Modul für Veräußerungsgewinne nach FIFO – Platzhalter.",
    hrefSuffix: null,
    available: false,
  },
  {
    key: "quellensteuer",
    title: "Quellensteuer",
    status: "Noch nicht verfügbar" as const,
    description: "Modul für Quellensteuer – Platzhalter.",
    hrefSuffix: null,
    available: false,
  },
  {
    key: "auslaendische-dividenden",
    title: "Ausländische Dividendenerträge",
    status: "Noch nicht verfügbar" as const,
    description: "Erfassung und Prüfung ausländischer Dividendenerträge – Platzhalter.",
    hrefSuffix: null,
    available: false,
  },
  {
    key: "private-equity",
    title: "Private-Equity-Beteiligungen",
    status: "Noch nicht verfügbar" as const,
    description: "Erfassung von Private-Equity-Beteiligungen – Platzhalter.",
    hrefSuffix: null,
    available: false,
  },
] as const;

export default async function YearModulesPage({ params }: YearModulesPageProps) {
  const { id, year } = await params;
  const modulesBase = `/clients/${id}/years/${year}/modules`;

  return (
    <div>
      <ClientYearNav clientId={id} year={year} />
      <section className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className="text-2xl font-semibold text-zinc-900">Module</h2>
        <p className="mt-2 text-sm text-zinc-600">
          Fachmodule für das Steuerjahr {year}. Aktuell ist die Vorabpauschale verfügbar.
        </p>

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {modules.map((module) => (
            <article
              key={module.key}
              className={[
                "rounded-xl border p-5 shadow-sm",
                module.available
                  ? "border-zinc-200 bg-zinc-50"
                  : "border-zinc-200 bg-white opacity-80",
              ].join(" ")}
            >
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-base font-semibold text-zinc-900">{module.title}</h3>
                <span
                  className={[
                    "rounded-md px-2 py-1 text-xs font-medium",
                    module.available
                      ? "bg-emerald-50 text-emerald-800"
                      : "bg-zinc-100 text-zinc-500",
                  ].join(" ")}
                >
                  {module.status}
                </span>
              </div>
              <p className="mt-2 text-sm text-zinc-600">{module.description}</p>
              {module.available && module.hrefSuffix ? (
                <Link
                  href={`${modulesBase}/${module.hrefSuffix}`}
                  className="mt-4 inline-block rounded-md bg-zinc-900 px-3 py-2 text-sm font-medium text-zinc-50 hover:bg-zinc-700"
                >
                  Modul öffnen
                </Link>
              ) : (
                <p className="mt-4 text-xs text-zinc-400">Noch keine Funktionalität hinterlegt.</p>
              )}
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
