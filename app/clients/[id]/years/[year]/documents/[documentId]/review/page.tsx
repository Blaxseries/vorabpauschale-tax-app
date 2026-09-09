import { ClientYearNav } from "@/components/client-year-nav";
import { ExtractedPositionsReview } from "@/components/extracted-positions-review";

type DocumentReviewPageProps = {
  params: Promise<{
    id: string;
    year: string;
    documentId: string;
  }>;
};

export const dynamic = "force-dynamic";

export default async function DocumentReviewPage({ params }: DocumentReviewPageProps) {
  const { id, year, documentId } = await params;

  return (
    <div>
      <ClientYearNav clientId={id} year={year} />
      <ExtractedPositionsReview clientId={id} year={year} documentId={documentId} />
    </div>
  );
}
