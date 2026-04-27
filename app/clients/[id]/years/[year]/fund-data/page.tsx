import { redirect } from "next/navigation";

type YearFundDataPageProps = {
  params: Promise<{
    id: string;
    year: string;
  }>;
};

export default async function YearFundDataPage({ params }: YearFundDataPageProps) {
  const { id, year } = await params;
  redirect(`/clients/${id}/years/${year}/review-table`);
}
