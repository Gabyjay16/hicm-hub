export default function StatusBadge({ status }) {
  const styles = {
    Pending: "bg-amber-100 text-amber-900",
    Reviewing: "bg-indigo-100 text-indigo-900",
    Resolved: "bg-emerald-100 text-emerald-900",
    pending: "bg-amber-100 text-amber-900",
    approved: "bg-emerald-100 text-emerald-900",
    rejected: "bg-rose-100 text-rose-900",
  };
  return <span className={`badge ${styles[status] || "bg-slate-100 text-slate-700"}`}>{status}</span>;
}
