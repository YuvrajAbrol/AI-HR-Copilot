import {
  Brain,
  Database,
  Search,
  ShieldCheck,
  Wallet,
  GraduationCap,
  Users,
  Sparkles,
  Check,
  Loader2,
} from "lucide-react";

const ICONS = {
  brain: Brain,
  database: Database,
  search: Search,
  shield: ShieldCheck,
  wallet: Wallet,
  graduation: GraduationCap,
  users: Users,
  sparkles: Sparkles,
};

const KIND_ACCENT = {
  route: "text-violet-600 bg-violet-50",
  tool: "text-brand-600 bg-brand-50",
  synthesize: "text-emerald-600 bg-emerald-50",
};

// Visualizes the agent's multi-tool orchestration: intent routing -> tool
// calls -> synthesis. Steps stream in and flip from "running" to "done".
export function AgentTrace({ trace = [] }) {
  if (!trace.length) return null;

  return (
    <div className="mb-2 space-y-1.5 rounded-xl border border-slate-200 bg-slate-50/70 p-3">
      <p className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
        <Sparkles size={12} /> Agent activity
      </p>
      {trace.map((step) => {
        const Icon = ICONS[step.icon] || Sparkles;
        const accent = KIND_ACCENT[step.kind] || "text-slate-600 bg-slate-100";
        const running = step.status === "running";
        return (
          <div
            key={step.id}
            className="animate-fade-in-up flex items-center gap-2.5 text-sm"
          >
            <span
              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg ${accent}`}
            >
              <Icon size={13} />
            </span>
            <span
              className={`flex-1 ${running ? "text-slate-500" : "text-slate-700"}`}
            >
              {step.label}
              {running && <AnimatedDots />}
            </span>
            {running ? (
              <Loader2 size={14} className="animate-spin text-slate-400" />
            ) : (
              <Check size={14} className="text-emerald-500" />
            )}
          </div>
        );
      })}
    </div>
  );
}

function AnimatedDots() {
  return (
    <span className="ml-0.5 inline-flex">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="inline-block"
          style={{
            animation: "pulse-dot 1.2s infinite",
            animationDelay: `${i * 0.2}s`,
          }}
        >
          .
        </span>
      ))}
    </span>
  );
}
