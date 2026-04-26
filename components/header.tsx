"use client";

import { usePathname } from "next/navigation";

const pageMetadata: Record<string, { title: string; subtitle?: string }> = {
  "/dashboard": {
    title: "Dashboard",
    subtitle: "Übersicht über Mandate, Fristen und Berechnungen",
  },
  "/clients": { title: "Mandanten" },
  "/tasks": { title: "Aufgaben" },
  "/settings": { title: "Einstellungen" },
};

export function Header() {
  const pathname = usePathname();
  const currentPage = (() => {
    if (pageMetadata[pathname]) {
      return pageMetadata[pathname];
    }

    if (pathname.startsWith("/clients/") && pathname.includes("/years/")) {
      return {
        title: "Steuerjahr-Arbeitsbereich",
        subtitle: "Mandantenakte je Steuerjahr mit fachlichem Teilbereich",
      };
    }

    if (pathname.startsWith("/clients/")) {
      return {
        title: "Mandantenakte",
        subtitle: "Stammdaten, Steuerjahre und letzte Aktivitäten",
      };
    }

    return { title: "VorabTax" };
  })();

  return (
    <header className="flex h-20 items-center justify-between border-b border-zinc-200 bg-white px-8">
      <div>
        <h1 className="text-xl font-semibold text-zinc-900">{currentPage.title}</h1>
        {currentPage.subtitle ? (
          <p className="text-sm text-zinc-500">{currentPage.subtitle}</p>
        ) : null}
      </div>

      <div className="rounded-md border border-zinc-300 bg-zinc-50 px-3 py-1.5 text-sm font-medium text-zinc-700">
        Steuerjahr 2026
      </div>
    </header>
  );
}
