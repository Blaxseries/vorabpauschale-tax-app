const navigationItems = [
  "Dashboard",
  "Mandanten",
  "Steuerakten",
  "Depots",
  "Uploads",
  "Berechnung",
  "Exporte",
  "Einstellungen",
] as const;

export function Sidebar() {
  return (
    <aside className="flex h-full w-64 shrink-0 flex-col border-r border-zinc-200 bg-zinc-100">
      <div className="border-b border-zinc-200 px-6 py-5">
        <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
          Tax Advisory Suite
        </p>
        <p className="mt-1 text-sm text-zinc-700">Vorabpauschale Verwaltung</p>
      </div>

      <nav className="flex-1 px-3 py-4">
        <ul className="space-y-1">
          {navigationItems.map((item, index) => {
            const isActive = index === 0;

            return (
              <li key={item}>
                <button
                  type="button"
                  className={[
                    "w-full rounded-md px-3 py-2 text-left text-sm transition-colors",
                    isActive
                      ? "bg-zinc-800 font-medium text-zinc-50"
                      : "text-zinc-700 hover:bg-zinc-200",
                  ].join(" ")}
                >
                  {item}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="border-t border-zinc-200 px-6 py-4">
        <p className="text-xs text-zinc-500">Kanzleimodus</p>
        <p className="text-sm font-medium text-zinc-700">Standardprofil</p>
      </div>
    </aside>
  );
}
