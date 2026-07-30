import type { ReactNode } from "react";

type Tone = "slate" | "indigo" | "emerald" | "amber" | "rose" | "sky" | "violet";

const TONES: Record<Tone, string> = {
  slate: "bg-slate-100 text-slate-600 ring-slate-500/20",
  indigo: "bg-brand-50 text-brand-700 ring-brand-600/20",
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
  Cleared: "emerald",
  Pending: "amber",
  Flagged: "rose",
  complete: "emerald",
  "in-progress": "indigo",
  pending: "slate",
  success: "emerald",
  blocked: "rose",
  warning: "amber",
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
  const resolved = tone ?? (status ? STATUS_TONE[status] ?? "slate" : "slate");
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${TONES[resolved]} ${className}`}
    >
      {children ?? status}
    </span>
  );
}
