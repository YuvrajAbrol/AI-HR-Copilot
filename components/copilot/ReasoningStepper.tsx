"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ShieldCheck, Database, Search, Mail, EyeOff, Sparkles, ShieldX, Check, Loader2, Ban } from "lucide-react";
import type { ReasoningStep, StepSystem } from "@/lib/copilot";

const META: Record<StepSystem, { icon: typeof ShieldCheck; cls: string }> = {
  rbac: { icon: ShieldCheck, cls: "bg-emerald-100 text-emerald-600" },
  sql: { icon: Database, cls: "bg-sky-100 text-sky-600" },
  search: { icon: Search, cls: "bg-accent-100 text-accent-600" },
  graph: { icon: Mail, cls: "bg-indigo-100 text-indigo-600" },
  mask: { icon: EyeOff, cls: "bg-amber-100 text-amber-600" },
  synth: { icon: Sparkles, cls: "bg-violet-100 text-violet-600" },
  guardrail: { icon: ShieldX, cls: "bg-rose-100 text-rose-600" },
};

// Visualizes the agent's perception-action loop. The first step is always an
// RBAC clearance check, reinforcing that access is verified before any query.
export function ReasoningStepper({ steps }: { steps: ReasoningStep[] }) {
  if (!steps.length) return null;
  return (
    <div className="mb-2 rounded-lg border border-zinc-200 bg-zinc-50 p-2">
      <p className="mb-1.5 flex items-center gap-1.5 px-1 text-[10px] font-semibold uppercase tracking-wide text-zinc-400">
        <Sparkles size={11} /> Agent reasoning
      </p>
      <div className="space-y-0.5">
        <AnimatePresence initial={false}>
          {steps.map((s) => {
            const { icon: Icon, cls } = META[s.system];
            const running = s.status === "running";
            const denied = s.status === "denied";
            return (
              <motion.div
                key={s.id}
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center gap-2 px-1 py-1"
              >
                <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded ${denied ? "bg-rose-100 text-rose-600" : cls}`}>
                  <Icon size={11} />
                </span>
                <span className={`flex-1 text-xs ${denied ? "font-medium text-rose-700" : running ? "text-zinc-500" : "text-zinc-700"}`}>
                  {s.label}
                </span>
                {running ? (
                  <Loader2 size={13} className="animate-spin text-zinc-400" />
                ) : denied ? (
                  <Ban size={13} className="text-rose-500" />
                ) : (
                  <Check size={13} className="text-emerald-500" />
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
