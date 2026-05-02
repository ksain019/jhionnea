export default function StatCard({
  label,
  value,
  sub,
  color = "text-primary",
}: {
  label: string;
  value: string | number;
  sub?: string;
  color?: string;
}) {
  return (
    <div className="bg-card-bg rounded-xl border border-card-border p-6 hover:shadow-md transition-shadow">
      <p className="text-sm text-muted mb-1">{label}</p>
      <p className={`text-3xl font-bold ${color}`}>{value}</p>
      {sub && <p className="text-xs text-muted mt-1">{sub}</p>}
    </div>
  );
}
