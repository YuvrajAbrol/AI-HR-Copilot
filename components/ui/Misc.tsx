import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export function StatTile({
  label,
  value,
  sub,
  icon: Icon,
  tone = "zinc",
}: {
  label: string;
  value: ReactNode;
  sub?: string;
  icon?: LucideIcon;
  tone?: "zinc" | "emerald" | "amber" | "rose" | "accent";
}) {
  const toneMap = {
    zinc: "text-zinc-400",
    emerald: "text-emerald-500",
    amber: "text-amber-500",
    rose: "text-rose-500",
    accent: "text-accent-500",
  };
  return (
    <div className="rounded-lg border border-zinc-200 bg-white px-4 py-3">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">{label}</p>
        {Icon && <Icon size={15} className={toneMap[tone]} />}
      </div>
      <p className="mt-1.5 text-xl font-semibold tabular-nums text-zinc-900">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-zinc-400">{sub}</p>}
    </div>
  );
}

export function ProgressBar({
  value,
  tone = "accent",
  className = "",
}: {
  value: number;
  tone?: "accent" | "emerald" | "amber" | "rose" | "zinc";
  className?: string;
}) {
  const toneMap = {
    accent: "bg-accent-500",
    emerald: "bg-emerald-500",
    amber: "bg-amber-500",
    rose: "bg-rose-500",
    zinc: "bg-zinc-400",
  };
  return (
    <div className={`h-1.5 w-full overflow-hidden rounded-full bg-zinc-100 ${className}`}>
      <div className={`h-full rounded-full ${toneMap[tone]}`} style={{ width: `${Math.min(100, value)}%` }} />
    </div>
  );
}

export function SectionHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-4 flex items-end justify-between gap-4">
      <div>
        <h1 className="text-lg font-semibold tracking-tight text-zinc-900">{title}</h1>
        {description && <p className="text-sm text-zinc-500">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

export function RbacNotice({ children }: { children: ReactNode }) {
  return (
    <div className="mb-4 flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
      {children}
    </div>
  );
}

export function KeyCap({ children }: { children: ReactNode }) {
  return (
    <kbd className="inline-flex h-5 min-w-5 items-center justify-center rounded border border-zinc-300 bg-zinc-50 px-1 text-[10px] font-medium text-zinc-500">
      {children}
    </kbd>
  );
}
