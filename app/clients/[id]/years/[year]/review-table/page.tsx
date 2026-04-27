import { ClientYearNav } from "@/components/client-year-nav";

import { ReviewTableWorkspace } from "./review-table-workspace";

type YearReviewTablePageProps = {
  params: Promise<{
    id: string;
    year: string;
  }>;
};

export default async function YearReviewTablePage({ params }: YearReviewTablePageProps) {
  const { id, year } = await params;

  return (
    <div>
      <ClientYearNav clientId={id} year={year} />
      <ReviewTableWorkspace year={year} />
    </div>
  );
}
