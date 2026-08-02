import type { ReactNode } from "react";

export type Tone =
  | "zinc"
  | "accent"
  | "emerald"
  | "amber"
  | "rose"
  | "sky"
  | "violet";

const TONES: Record<Tone, string> = {
  zinc: "bg-zinc-100 text-zinc-600 ring-zinc-500/20",
  accent: "bg-accent-50 text-accent-700 ring-accent-600/20",
  emerald: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  amber: "bg-amber-50 text-amber-700 ring-amber-600/20",
  rose: "bg-rose-50 text-rose-700 ring-rose-600/20",
  sky: "bg-sky-50 text-sky-700 ring-sky-600/20",
  violet: "bg-violet-50 text-violet-700 ring-violet-600/20",
};

const STATUS_TONE: Record<string, Tone> = {
  Active: "emerald",
  "On Leave": "amber",
  Onboarding: "sky",
  Terminated: "zinc",
  Approved: "emerald",
  Pending: "amber",
  Rejected: "rose",
  Processed: "emerald",
  Draft: "zinc",
  Completed: "emerald",
  "On Track": "emerald",
  "In Progress": "sky",
  "At Risk": "amber",
  Behind: "rose",
  Overdue: "rose",
  "Not Started": "zinc",
  Cleared: "emerald",
  Flagged: "rose",
  success: "emerald",
  denied: "rose",
  warning: "amber",
  High: "emerald",
  Medium: "amber",
  Low: "zinc",
};

export function Badge({
  children,
  tone,
  status,
  className = "",
}: {
  children?: ReactNode;
  tone?: Tone;
  status?: string;
  className?: string;
}) {
  const resolved = tone ?? (status ? STATUS_TONE[status] ?? "zinc" : "zinc");
  return (
    <span
      className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-medium ring-1 ring-inset ${TONES[resolved]} ${className}`}
    >
      {children ?? status}
    </span>
  );
}
