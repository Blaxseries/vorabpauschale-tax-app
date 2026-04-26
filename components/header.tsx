export function Header() {
  return (
    <header className="flex h-20 items-center justify-between border-b border-zinc-200 bg-white px-8">
      <div>
        <h1 className="text-xl font-semibold text-zinc-900">Dashboard</h1>
        <p className="text-sm text-zinc-500">
          Übersicht über Mandanten, Steuerakten und Berechnungen
        </p>
      </div>

      <div className="rounded-md border border-zinc-300 bg-zinc-50 px-3 py-1.5 text-sm font-medium text-zinc-700">
          Steuerjahr 2026
      </div>
    </header>
  );
}
