import { redirect } from "next/navigation";

type VorabpauschaleModuleIndexProps = {
  params: Promise<{
    id: string;
    year: string;
  }>;
};

export default async function VorabpauschaleModuleIndexPage({
  params,
}: VorabpauschaleModuleIndexProps) {
  const { id, year } = await params;
  redirect(`/clients/${id}/years/${year}/modules/vorabpauschale/review-table`);
}
