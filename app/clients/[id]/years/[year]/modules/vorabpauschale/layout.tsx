import { ClientYearNav } from "@/components/client-year-nav";
import { VorabpauschaleModuleNav } from "@/components/vorabpauschale-module-nav";

type VorabpauschaleLayoutProps = {
  children: React.ReactNode;
  params: Promise<{ id: string; year: string } & Record<string, string>>;
};

export default async function VorabpauschaleLayout({
  children,
  params,
}: VorabpauschaleLayoutProps) {
  const resolved = await params;
  const id = resolved.id;
  const year = resolved.year;

  return (
    <div>
      <ClientYearNav clientId={id} year={year} />
      <VorabpauschaleModuleNav clientId={id} year={year} />
      {children}
    </div>
  );
}
