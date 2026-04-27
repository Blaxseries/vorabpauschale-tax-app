"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type ClientYearNavProps = {
  clientId: string;
  year: string;
};

const yearNavItems = [
  { label: "Übersicht", href: "" },
  { label: "Depots", href: "/portfolios" },
  { label: "Dokumente", href: "/documents" },
  { label: "Prüftabelle", href: "/review-table" },
  { label: "Berechnung", href: "/calculation" },
  { label: "Export", href: "/export" },
  { label: "Prüfprotokoll", href: "/audit-log" },
] as const;

export function ClientYearNav({ clientId, year }: ClientYearNavProps) {
  const pathname = usePathname();
  const basePath = `/clients/${clientId}/years/${year}`;

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
          const href = `${basePath}${item.href}`;
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
