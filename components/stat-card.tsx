type StatCardProps = {
  title: string;
  value: string;
  detail: string;
};

export function StatCard({ title, value, detail }: StatCardProps) {
  return (
    <article className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
      <h2 className="text-sm font-medium text-zinc-600">{title}</h2>
      <p className="mt-2 text-3xl font-semibold text-zinc-900">{value}</p>
      <p className="mt-2 text-sm text-zinc-500">{detail}</p>
    </article>
  );
}
