import { redirect } from "next/navigation";

type YearReviewTablePageProps = {
  params: Promise<{
    id: string;
    year: string;
  }>;
};

/** Kompatibilitätsroute: leitet auf Module → Vorabpauschale → Prüftabelle um. */
export default async function YearReviewTablePage({ params }: YearReviewTablePageProps) {
  const { id, year } = await params;
  redirect(`/clients/${id}/years/${year}/modules/vorabpauschale/review-table`);
}
