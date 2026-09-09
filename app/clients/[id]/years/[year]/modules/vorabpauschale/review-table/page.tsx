import { ReviewTableWorkspace } from "../../../review-table/review-table-workspace";

type VorabpauschaleReviewTablePageProps = {
  params: Promise<{
    id: string;
    year: string;
  }>;
};

export default async function VorabpauschaleReviewTablePage({
  params,
}: VorabpauschaleReviewTablePageProps) {
  const { id, year } = await params;

  return <ReviewTableWorkspace clientId={id} year={year} />;
}
