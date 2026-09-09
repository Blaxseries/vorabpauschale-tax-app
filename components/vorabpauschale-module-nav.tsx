"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type VorabpauschaleModuleNavProps = {
  clientId: string;
  year: string;
};

const moduleNavItems = [
  { label: "Prüftabelle", segment: "review-table" },
  { label: "Berechnung", segment: "calculation" },
  { label: "Export", segment: "export" },
] as const;

export function VorabpauschaleModuleNav({ clientId, year }: VorabpauschaleModuleNavProps) {
  const pathname = usePathname();
  const basePath = `/clients/${encodeURIComponent(clientId)}/years/${encodeURIComponent(year)}/modules/vorabpauschale`;

  return (
    <section className="mb-4 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Modul</p>
          <h2 className="text-lg font-semibold text-zinc-900">
            Vorabpauschale – Steuerjahr {year}
          </h2>
        </div>
        <Link
          href={`/clients/${clientId}/years/${year}/modules`}
          className="rounded-md border border-zinc-300 px-2.5 py-1.5 text-xs text-zinc-700 hover:bg-zinc-100"
        >
          ← Zur Modulübersicht
        </Link>
      </div>
      <ul className="flex flex-wrap gap-1">
        {moduleNavItems.map((item) => {
          const href = `${basePath}/${item.segment}`;
          const isActive = pathname === href || pathname.startsWith(`${href}/`);

          return (
            <li key={item.segment}>
              <Link
                href={href}
                className={[
                  "block rounded-md px-3 py-2 text-sm transition-colors",
                  isActive
                    ? "bg-zinc-900 font-medium text-zinc-50"
                    : "text-zinc-700 hover:bg-zinc-100",
                ].join(" ")}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
