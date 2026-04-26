import { AppShell } from "@/components/app-shell";

export default function SettingsPage() {
  return (
    <AppShell title="Einstellungen">
      <section className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className="text-2xl font-semibold text-zinc-900">Einstellungen</h2>
      </section>
    </AppShell>
  );
}
