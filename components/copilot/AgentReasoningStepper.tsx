"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  Brain,
  Database,
  Search,
  Mail,
  Wrench,
  ShieldX,
  Sparkles,
  Check,
  Loader2,
  Ban,
} from "lucide-react";
import type { ReasoningStep, StepSystem } from "@/lib/types";

const SYSTEM_META: Record<StepSystem, { icon: typeof Brain; className: string }> = {
  intent: { icon: Brain, className: "bg-violet-100 text-violet-600" },
  sql: { icon: Database, className: "bg-sky-100 text-sky-600" },
  search: { icon: Search, className: "bg-brand-100 text-brand-600" },
  graph: { icon: Mail, className: "bg-indigo-100 text-indigo-600" },
  mcp: { icon: Wrench, className: "bg-emerald-100 text-emerald-600" },
  guardrail: { icon: ShieldX, className: "bg-rose-100 text-rose-600" },
  synth: { icon: Sparkles, className: "bg-amber-100 text-amber-600" },
};

// The perception-action loop visualizer. Each tool dispatch animates in and
// flips from a spinner to a check (or a block icon when a guardrail fires).
export function AgentReasoningStepper({ steps }: { steps: ReasoningStep[] }) {
  if (!steps.length) return null;

  return (
    <div className="mb-2 rounded-xl border border-slate-200 bg-slate-50/80 p-2.5">
      <p className="mb-2 flex items-center gap-1.5 px-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
        <Sparkles size={12} /> Agent Reasoning
      </p>
      <div className="relative space-y-0.5">
        <AnimatePresence initial={false}>
          {steps.map((step, i) => {
            const meta = SYSTEM_META[step.system];
            const Icon = meta.icon;
            const running = step.status === "running";
            const blocked = step.status === "blocked";
            return (
              <motion.div
                key={step.id}
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.25 }}
                className="relative flex items-start gap-2.5 rounded-lg px-1 py-1.5"
              >
                {/* connector line */}
                {i < steps.length - 1 && (
                  <span className="absolute left-[15px] top-8 h-[calc(100%-1rem)] w-px bg-slate-200" />
                )}
                <span
                  className={`z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg ${
                    blocked ? "bg-rose-100 text-rose-600" : meta.className
                  }`}
                >
                  <Icon size={13} />
                </span>
                <div className="min-w-0 flex-1 pt-0.5">
                  <p
                    className={`text-[13px] leading-snug ${
                      blocked ? "font-medium text-rose-700" : running ? "text-slate-500" : "text-slate-700"
                    }`}
                  >
                    {step.label}
                    {running && <AnimatedDots />}
                  </p>
                  {step.detail && <p className="text-[11px] text-slate-400">{step.detail}</p>}
                </div>
                <span className="pt-0.5">
                  {running ? (
                    <Loader2 size={14} className="animate-spin text-slate-400" />
                  ) : blocked ? (
                    <Ban size={14} className="text-rose-500" />
                  ) : (
                    <Check size={14} className="text-emerald-500" />
                  )}
                </span>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}

function AnimatedDots() {
  return (
    <span className="ml-0.5 inline-flex">
      {[0, 1, 2].map((i) => (
        <span key={i} style={{ animation: "pulse-dot 1.2s infinite", animationDelay: `${i * 0.2}s` }}>
          .
        </span>
      ))}
    </span>
  );
}
