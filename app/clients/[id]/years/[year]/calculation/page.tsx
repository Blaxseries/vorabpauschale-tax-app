import { redirect } from "next/navigation";

type YearCalculationPageProps = {
  params: Promise<{
    id: string;
    year: string;
  }>;
};

/** Kompatibilitätsroute: leitet auf Module → Vorabpauschale → Berechnung um. */
export default async function YearCalculationPage({ params }: YearCalculationPageProps) {
  const { id, year } = await params;
  redirect(`/clients/${id}/years/${year}/modules/vorabpauschale/calculation`);
}
