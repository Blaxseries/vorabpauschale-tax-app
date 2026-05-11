import { StatCard } from "@/components/stat-card";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

function asSingle<T>(value: T | T[] | null | undefined): T | null {
  if (value == null) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

type TaxYearEmbed = {
  year: number;
  clients: { name: string } | { name: string }[] | null;
};

type PortfolioEmbed = {
  bank_name: string;
  tax_years: TaxYearEmbed | TaxYearEmbed[] | null;
};

type UploadActivityRow = {
  display_name: string | null;
  original_filename: string | null;
  uploaded_at: string;
  portfolios: PortfolioEmbed | PortfolioEmbed[] | null;
};

type FundActivityRow = {
  fund_name: string;
  updated_at: string;
  portfolios: PortfolioEmbed | PortfolioEmbed[] | null;
};

type TaxYearActivityRow = {
  year: number;
  status: string;
  updated_at: string;
  clients: { name: string } | { name: string }[] | null;
};

function formatActivityTimestamp(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("de-DE", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

function buildUploadActivityLine(row: UploadActivityRow): string {
  const file =
    (row.display_name && row.display_name.trim()) ||
    (row.original_filename && row.original_filename.trim()) ||
    "Dokument";
  const portfolio = asSingle(row.portfolios);
  const taxYear = portfolio ? asSingle(portfolio.tax_years) : null;
  const clientRow = taxYear ? asSingle(taxYear.clients) : null;
  const bank = portfolio?.bank_name?.trim() || "Depot";
  const client = clientRow?.name?.trim();
  const year = taxYear?.year;
  const when = formatActivityTimestamp(row.uploaded_at);
  const tail = [client && `Mandant: ${client}`, year != null && `Jahr ${year}`]
    .filter(Boolean)
    .join(" · ");
  return tail ? `Kontoauszug „${file}“ bei ${bank} hochgeladen (${tail})${when ? ` — ${when}` : ""}` : `Kontoauszug „${file}“ bei ${bank} hochgeladen${when ? ` — ${when}` : ""}`;
}

function buildFundActivityLine(row: FundActivityRow): string {
  const fund = row.fund_name?.trim() || "Fonds";
  const portfolio = asSingle(row.portfolios);
  const taxYear = portfolio ? asSingle(portfolio.tax_years) : null;
  const clientRow = taxYear ? asSingle(taxYear.clients) : null;
  const bank = portfolio?.bank_name?.trim() || "Depot";
  const client = clientRow?.name?.trim();
  const year = taxYear?.year;
  const when = formatActivityTimestamp(row.updated_at);
  const tail = [client && `Mandant: ${client}`, year != null && `Jahr ${year}`]
    .filter(Boolean)
    .join(" · ");
  const base = `Fondsposition „${fund}“ im Depot ${bank} aktualisiert`;
  return tail ? `${base} (${tail})${when ? ` — ${when}` : ""}` : `${base}${when ? ` — ${when}` : ""}`;
}

function buildTaxYearActivityLine(row: TaxYearActivityRow): string {
  const clientRow = asSingle(row.clients);
  const client = clientRow?.name?.trim() || "Mandant";
  const when = formatActivityTimestamp(row.updated_at);
  if (row.status === "completed") {
    return `Steuerjahr ${row.year} für ${client} abgeschlossen${when ? ` — ${when}` : ""}`;
  }
  if (row.status === "in_progress") {
    return `Steuerjahr ${row.year} für ${client}: Bearbeitung${when ? ` — ${when}` : ""}`;
  }
  return `Steuerjahr ${row.year} für ${client}: offen${when ? ` — ${when}` : ""}`;
}

export default async function DashboardPage() {
  const [
    clientsCountRes,
    openTaxYearsCountRes,
    uploadPortfolioIdsRes,
    fundPositionsCountRes,
    uploadsActivityRes,
    fundActivityRes,
    taxYearsActivityRes,
  ] = await Promise.all([
    supabase.from("clients").select("id", { count: "exact", head: true }),
    supabase
      .from("tax_years")
      .select("id", { count: "exact", head: true })
      .in("status", ["open", "in_progress"]),
    supabase.from("statement_uploads").select("portfolio_id"),
    supabase.from("fund_positions").select("id", { count: "exact", head: true }),
    supabase
      .from("statement_uploads")
      .select(
        `
        display_name,
        original_filename,
        uploaded_at,
        portfolios (
          bank_name,
          tax_years (
            year,
            clients ( name )
          )
        )
      `,
      )
      .order("uploaded_at", { ascending: false })
      .limit(6)
      .returns<UploadActivityRow[]>(),
    supabase
      .from("fund_positions")
      .select(
        `
        fund_name,
        updated_at,
        portfolios (
          bank_name,
          tax_years (
            year,
            clients ( name )
          )
        )
      `,
      )
      .order("updated_at", { ascending: false })
      .limit(6)
      .returns<FundActivityRow[]>(),
    supabase
      .from("tax_years")
      .select("year, status, updated_at, clients ( name )")
      .order("updated_at", { ascending: false })
      .limit(6)
      .returns<TaxYearActivityRow[]>(),
  ]);

  const loadError =
    clientsCountRes.error ||
    openTaxYearsCountRes.error ||
    uploadPortfolioIdsRes.error ||
    fundPositionsCountRes.error;

  const clientCount = clientsCountRes.count ?? 0;
  const openTaxYearsCount = openTaxYearsCountRes.count ?? 0;
  const portfoliosWithStatements = new Set(
    (uploadPortfolioIdsRes.data ?? [])
      .map((row: { portfolio_id: string | null }) => row.portfolio_id)
      .filter((id): id is string => Boolean(id)),
  ).size;
  const fundPositionCount = fundPositionsCountRes.count ?? 0;

  const dashboardStats = [
    {
      title: "Anzahl Mandanten",
      value: clientCount.toString(),
      detail: "Mandanten im Datenbestand",
    },
    {
      title: "Offene Steuerjahre",
      value: openTaxYearsCount.toString(),
      detail: "Jahresfälle mit Status offen oder in Bearbeitung",
    },
    {
      title: "Depots mit Uploads",
      value: portfoliosWithStatements.toString(),
      detail: "Depots mit mindestens einem Kontoauszug",
    },
    {
      title: "Fondspositionen",
      value: fundPositionCount.toString(),
      detail: "Erfasste Fondspositionen gesamt",
    },
  ];

  const activityCandidates: Array<{ at: number; text: string }> = [];

  if (!uploadsActivityRes.error && uploadsActivityRes.data) {
    for (const row of uploadsActivityRes.data) {
      activityCandidates.push({
        at: new Date(row.uploaded_at).getTime(),
        text: buildUploadActivityLine(row),
      });
    }
  }

  if (!fundActivityRes.error && fundActivityRes.data) {
    for (const row of fundActivityRes.data) {
      activityCandidates.push({
        at: new Date(row.updated_at).getTime(),
        text: buildFundActivityLine(row),
      });
    }
  }

  if (!taxYearsActivityRes.error && taxYearsActivityRes.data) {
    for (const row of taxYearsActivityRes.data) {
      activityCandidates.push({
        at: new Date(row.updated_at).getTime(),
        text: buildTaxYearActivityLine(row),
      });
    }
  }

  const activityLines = [...activityCandidates]
    .filter((entry) => !Number.isNaN(entry.at))
    .sort((a, b) => b.at - a.at)
    .slice(0, 10)
    .map((entry) => entry.text);

  return (
    <>
      {loadError ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Einige Kennzahlen konnten nicht geladen werden ({loadError.message}). Bitte Supabase-Verbindung
          und Berechtigungen prüfen.
        </p>
      ) : null}

      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {dashboardStats.map((stat) => (
          <StatCard key={stat.title} title={stat.title} value={stat.value} detail={stat.detail} />
        ))}
      </section>

      <section className="mt-6 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className="text-base font-semibold text-zinc-900">Letzte Aktivitäten</h2>
        {activityLines.length === 0 ? (
          <p className="mt-4 text-sm text-zinc-600">
            Noch keine Aktivitäten geladen oder Datenbank leer — nach Mandanten und Uploads sollte sich
            die Liste füllen.
          </p>
        ) : (
          <ul className="mt-4 space-y-3 text-sm text-zinc-600">
            {activityLines.map((line, index) => (
              <li key={`${index}-${line.slice(0, 48)}`}>{line}</li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
