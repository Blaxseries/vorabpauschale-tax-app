type StatCardProps = {
  title: string;
  value: string;
  detail: string;
};

export function StatCard({ title, value, detail }: StatCardProps) {
  return (
    <article className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
      <h2 className="text-sm font-medium uppercase tracking-wide text-zinc-500">
        {title}
      </h2>
      <p className="mt-3 text-3xl font-semibold text-zinc-900">{value}</p>
      <p className="mt-2 text-sm text-zinc-600">{detail}</p>
    </article>
  );
}
