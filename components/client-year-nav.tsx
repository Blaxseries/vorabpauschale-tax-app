"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type ClientYearNavProps = {
  clientId: string;
  year: string;
};

const yearNavItems = [
  { label: "Übersicht", segment: "" },
  { label: "Depots", segment: "portfolios" },
  { label: "Dokumente", segment: "documents" },
  { label: "Prüftabelle", segment: "review-table" },
  { label: "Berechnung", segment: "calculation" },
  { label: "Export", segment: "export" },
  { label: "Prüfprotokoll", segment: "audit-log" },
] as const;

export function ClientYearNav({ clientId, year }: ClientYearNavProps) {
  const pathname = usePathname();
  const normalizedYear = year.trim().replace(/\//g, "");
  // Encode nur der dynamischen Teile, damit die Routen-Segmente korrekt bleiben.
  const basePath = `/clients/${encodeURIComponent(clientId)}/years/${encodeURIComponent(normalizedYear)}`;

  return (
    <nav className="mb-6 rounded-xl border border-zinc-200 bg-white p-2 shadow-sm">
      <div className="mb-2 flex items-center justify-between border-b border-zinc-200 px-2 pb-2">
        <Link
          href={`/clients/${clientId}`}
          className="rounded-md px-2 py-1 text-sm text-zinc-700 hover:bg-zinc-100"
        >
          ← Zur Mandantenakte
        </Link>
        <Link
          href={basePath}
          className="rounded-md px-2 py-1 text-sm text-zinc-700 hover:bg-zinc-100"
        >
          ↩ Zur Jahresübersicht
        </Link>
      </div>
      <ul className="flex flex-wrap gap-1">
        {yearNavItems.map((item) => {
          const href = item.segment ? `${basePath}/${item.segment}` : basePath;
          const isActive = pathname === href;

          return (
            <li key={href}>
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
    </nav>
  );
}
