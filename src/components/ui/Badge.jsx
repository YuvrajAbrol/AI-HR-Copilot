const STATUS_STYLES = {
  Approved: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  Pending: "bg-amber-50 text-amber-700 ring-amber-600/20",
  Rejected: "bg-rose-50 text-rose-700 ring-rose-600/20",
  Completed: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  "In Progress": "bg-brand-50 text-brand-700 ring-brand-600/20",
  "Not Started": "bg-slate-100 text-slate-600 ring-slate-500/20",
  default: "bg-slate-100 text-slate-600 ring-slate-500/20",
};

export function Badge({ status, children, className = "" }) {
  const style = STATUS_STYLES[status] || STATUS_STYLES.default;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${style} ${className}`}
    >
      {children || status}
    </span>
  );
}
