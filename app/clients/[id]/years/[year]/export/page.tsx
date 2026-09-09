import { redirect } from "next/navigation";

type YearExportPageProps = {
  params: Promise<{
    id: string;
    year: string;
  }>;
};

/** Kompatibilitätsroute: leitet auf Module → Vorabpauschale → Export um. */
export default async function YearExportPage({ params }: YearExportPageProps) {
  const { id, year } = await params;
  redirect(`/clients/${id}/years/${year}/modules/vorabpauschale/export`);
}
