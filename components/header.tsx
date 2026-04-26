export function Header() {
  return (
    <header className="flex h-16 items-center justify-between border-b border-zinc-200 bg-white px-6">
      <div>
        <h1 className="text-lg font-semibold text-zinc-900">Dashboard</h1>
        <p className="text-sm text-zinc-500">
          Uebersicht ueber Mandanten, Akten und Berechnungen
        </p>
      </div>

      <div className="flex items-center gap-3">
        <div className="rounded-md border border-zinc-300 bg-zinc-50 px-3 py-1.5 text-sm text-zinc-700">
          Steuerjahr 2026
        </div>
        <button
          type="button"
          className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-100"
        >
          Daten aktualisieren
        </button>
      </div>
    </header>
  );
}
