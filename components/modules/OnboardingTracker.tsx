"use client";

import { useState } from "react";
import { UserPlus, Check, Circle, Clock, Send } from "lucide-react";
import { motion } from "framer-motion";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { ModuleTabs } from "./ModuleTabs";
import { useWorkspace } from "@/lib/store";
import { ONBOARDING_HIRES } from "@/lib/mockData";
import { formatDate } from "@/lib/format";
import type { OnboardingTask } from "@/lib/types";

export function OnboardingTracker() {
  const { openEmail } = useWorkspace();
  const hire = ONBOARDING_HIRES[0];
  const [tasks, setTasks] = useState<OnboardingTask[]>(hire.tasks);

  const completed = tasks.filter((t) => t.status === "complete").length;
  const pct = Math.round((completed / tasks.length) * 100);

  const cycle = (id: string) =>
    setTasks((prev) =>
      prev.map((t) =>
        t.id === id
          ? {
              ...t,
              status:
                t.status === "pending" ? "in-progress" : t.status === "in-progress" ? "complete" : "pending",
            }
          : t
      )
    );

  return (
    <div>
      <PageHeader icon={UserPlus} title="Onboarding & Resumes" description="Hiring workflows and new-hire readiness." />
      <ModuleTabs active="onboarding" />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Hire summary */}
        <Card className="lg:col-span-1">
          <div className="flex flex-col items-center border-b border-slate-100 p-6 text-center">
            <Avatar initials={hire.initials} name={hire.name} size="lg" />
            <p className="mt-3 font-bold text-slate-900">{hire.name}</p>
            <p className="text-sm text-slate-500">{hire.role}</p>
            <Badge tone="sky" className="mt-2">Starts {formatDate(hire.startDate)}</Badge>
          </div>
          <div className="p-5">
            <div className="mb-1.5 flex items-center justify-between text-sm">
              <span className="font-medium text-slate-600">Readiness</span>
              <span className="font-semibold text-slate-800">{pct}%</span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
              <motion.div
                className="h-full rounded-full bg-brand-500"
                animate={{ width: `${pct}%` }}
                transition={{ duration: 0.4 }}
              />
            </div>
            <p className="mt-2 text-xs text-slate-400">
              {completed} of {tasks.length} tasks complete
            </p>
            <button
              type="button"
              onClick={() =>
                openEmail({
                  to: "liam.obrien@closedai.com",
                  subject: "Welcome to Team ClosedAI!",
                  body: `Hi Liam,\n\nWe're thrilled to welcome you to the Engineering team! Your first day is ${formatDate(
                    hire.startDate
                  )}. Your laptop and accounts are being provisioned, and your onboarding buddy will reach out shortly.\n\nSee you soon!\n\nBest,\nHR Operations`,
                  context: "AI-drafted welcome · Microsoft Graph API",
                })
              }
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-brand-600 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
            >
              <Send size={15} /> Draft Welcome Email
            </button>
          </div>
        </Card>

        {/* Checklist */}
        <Card className="lg:col-span-2">
          <div className="border-b border-slate-100 px-5 py-3.5">
            <h3 className="text-sm font-semibold text-slate-900">Onboarding Checklist</h3>
            <p className="text-xs text-slate-400">Click a step to advance its status</p>
          </div>
          <ul className="divide-y divide-slate-50">
            {tasks.map((t) => (
              <li key={t.id} className="flex items-center gap-3 px-5 py-3.5">
                <button
                  type="button"
                  onClick={() => cycle(t.id)}
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition-colors ${
                    t.status === "complete"
                      ? "bg-emerald-500 text-white"
                      : t.status === "in-progress"
                        ? "bg-brand-100 text-brand-600"
                        : "border-2 border-slate-200 text-transparent hover:border-brand-300"
                  }`}
                >
                  {t.status === "complete" ? <Check size={15} /> : t.status === "in-progress" ? <Clock size={14} /> : <Circle size={10} />}
                </button>
                <div className="min-w-0 flex-1">
                  <p className={`text-sm font-medium ${t.status === "complete" ? "text-slate-400 line-through" : "text-slate-800"}`}>
                    {t.label}
                  </p>
                  <p className="text-xs text-slate-400">
                    {t.owner} · due {formatDate(t.due)}
                  </p>
                </div>
                <Badge tone="slate">{t.category}</Badge>
                <Badge status={t.status} />
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}
