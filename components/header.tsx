 "use client";

import { usePathname } from "next/navigation";

const pageMetadata: Record<string, { title: string; subtitle?: string }> = {
  "/dashboard": {
    title: "Dashboard",
    subtitle: "Übersicht über Mandanten, Steuerakten und Berechnungen",
  },
  "/clients": { title: "Mandanten" },
  "/tax-files": { title: "Steuerakten" },
  "/portfolios": { title: "Depots" },
  "/uploads": { title: "Uploads" },
  "/calculations": { title: "Berechnung" },
  "/exports": { title: "Exporte" },
  "/settings": { title: "Einstellungen" },
};

export function Header() {
  const pathname = usePathname();
  const currentPage = pageMetadata[pathname] ?? { title: "VorabTax" };

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
