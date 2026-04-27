import { ClientYearNav } from "@/components/client-year-nav";
import { DocumentsWorkflow } from "@/components/documents-workflow";
import type { Portfolio, TaxYear } from "@/lib/database.types";
import { supabase } from "@/lib/supabase";

type YearDocumentsPageProps = {
  params: Promise<{
    id: string;
    year: string;
  }>;
};

export default async function YearDocumentsPage({ params }: YearDocumentsPageProps) {
  const { id, year } = await params;
  const { data: taxYear, error: taxYearError } = await supabase
    .from("tax_years")
    .select("id")
    .eq("client_id", id)
    .eq("year", Number(year))
    .maybeSingle<Pick<TaxYear, "id">>();

  if (!taxYear || taxYearError) {
    return (
      <div>
        <ClientYearNav clientId={id} year={year} />
        <section className="rounded-xl border border-amber-200 bg-amber-50 p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-amber-800">Steuerjahr nicht gefunden</h2>
          <p className="mt-2 text-sm text-amber-700">
            Für dieses Dokumentenmodul wurde kein passendes Steuerjahr gefunden.
          </p>
        </section>
      </div>
    );
  }

  const { data: portfolios, error: portfolioError } = await supabase
    .from("portfolios")
    .select("id, bank_name, country")
    .eq("tax_year_id", taxYear.id)
    .returns<Array<Pick<Portfolio, "id" | "bank_name" | "country">>>();

  const portfolioOptions = portfolioError
    ? []
    : portfolios.map((portfolio) => ({
        id: portfolio.id,
        label: `${portfolio.bank_name} (${portfolio.country})`,
      }));

  return (
    <div>
      <ClientYearNav clientId={id} year={year} />
      <DocumentsWorkflow year={year} portfolioOptions={portfolioOptions} />
    </div>
  );
}
