import { getBasiszinsMeta, getZuflussdatum } from "@/lib/calculate-vorabpauschale";

type SteuerjahrKontextProps = {
  steuerjahr: number;
};

function formatZuflussdatum(date: Date): string {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = String(date.getFullYear());
  return `${day}.${month}.${year}`;
}

export function SteuerjahrKontext({ steuerjahr }: SteuerjahrKontextProps) {
  const meta = getBasiszinsMeta(steuerjahr);
  const satzPct = (meta.satz * 100).toLocaleString("de-DE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const zufluss = formatZuflussdatum(getZuflussdatum(steuerjahr));
  const fundstelleTeil = meta.fundstelle ? ` · ${meta.fundstelle}` : "";

  return (
    <p className="mt-2 text-sm text-zinc-600">
      Steuerjahr {steuerjahr} · Basiszins {satzPct} %{fundstelleTeil} · Zufluss {zufluss}
    </p>
  );
}
