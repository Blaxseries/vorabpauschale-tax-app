import { ClientDetailWorkspace } from "./client-detail-workspace";

type ClientFilePageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function ClientFilePage({ params }: ClientFilePageProps) {
  const { id } = await params;
  return <ClientDetailWorkspace clientId={id} />;
}
