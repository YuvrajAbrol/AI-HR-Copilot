"use client";

import { UserPlus, Check, X, AlertTriangle, Send, Trophy } from "lucide-react";
import { motion } from "framer-motion";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { ModuleTabs } from "./ModuleTabs";
import { useWorkspace } from "@/lib/store";
import { CANDIDATES } from "@/lib/mockData";
import type { Candidate } from "@/lib/types";

function scoreColor(score: number): string {
  if (score >= 90) return "bg-emerald-500";
  if (score >= 80) return "bg-brand-500";
  if (score >= 70) return "bg-amber-500";
  return "bg-rose-500";
}

function CandidateRow({ candidate, rank }: { candidate: Candidate; rank: number }) {
  const { openEmail } = useWorkspace();
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: rank * 0.05 }}
    >
      <Card className={`p-4 ${rank === 0 ? "border-brand-300 ring-2 ring-brand-100" : ""}`}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          {/* Identity */}
          <div className="flex items-center gap-3 sm:w-64">
            <div className="relative">
              <Avatar initials={candidate.name.split(" ").map((n) => n[0]).join("")} name={candidate.name} size="md" />
              {rank === 0 && (
                <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-amber-400 text-white ring-2 ring-white">
                  <Trophy size={11} />
                </span>
              )}
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-slate-900">{candidate.name}</p>
              <p className="text-xs text-slate-500">
                {candidate.yearsExperience} yrs · {candidate.location}
              </p>
            </div>
          </div>

          {/* Score */}
          <div className="sm:w-52">
            <div className="mb-1 flex items-center justify-between text-xs">
              <span className="font-medium text-slate-500">Match score</span>
              <span className="font-bold text-slate-900">{candidate.matchScore}%</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
              <motion.div
                className={`h-full rounded-full ${scoreColor(candidate.matchScore)}`}
                initial={{ width: 0 }}
                animate={{ width: `${candidate.matchScore}%` }}
                transition={{ duration: 0.6, delay: rank * 0.05 }}
              />
            </div>
          </div>

          {/* Skills */}
          <div className="flex-1">
            <div className="flex flex-wrap gap-1.5">
              {candidate.topSkills.slice(0, 4).map((s) => (
                <span key={s} className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-xs text-emerald-700">
                  <Check size={11} /> {s}
                </span>
              ))}
              {candidate.missingSkills.slice(0, 2).map((s) => (
                <span key={s} className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
                  <X size={11} /> {s}
                </span>
              ))}
            </div>
          </div>

          {/* Compliance + action */}
          <div className="flex items-center gap-2 sm:flex-col sm:items-end">
            <Badge status={candidate.compliance}>
              {candidate.compliance === "Flagged" && <AlertTriangle size={11} />}
              {candidate.compliance}
            </Badge>
            <button
              type="button"
              onClick={() =>
                openEmail({
                  to: `${candidate.name.split(" ")[0].toLowerCase()}@example.com`,
                  subject: `Interview Invitation — ${candidate.role}`,
                  body: `Hi ${candidate.name.split(" ")[0]},\n\nThank you for applying to the ${candidate.role} role at Team ClosedAI. We were impressed by your background and would love to schedule an interview.\n\nCould you share your availability next week?\n\nBest,\nHR Operations`,
                  context: `AI-drafted for ${candidate.name} · Microsoft Graph API`,
                })
              }
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700"
            >
              <Send size={13} /> Invite
            </button>
          </div>
        </div>
        <p className="mt-3 border-t border-slate-100 pt-3 text-sm text-slate-500">{candidate.summary}</p>
      </Card>
    </motion.div>
  );
}

export function ResumeScreener() {
  const ranked = [...CANDIDATES].sort((a, b) => b.matchScore - a.matchScore);

  return (
    <div>
      <PageHeader
        icon={UserPlus}
        title="Onboarding & Resumes"
        description="AI-ranked candidate comparison for Senior Backend Developer."
      />
      <ModuleTabs active="resume-screener" />

      <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-brand-100 bg-brand-50/50 p-3 text-sm text-slate-600">
        <span className="font-semibold text-slate-800">Senior Backend Developer</span>
        <Badge tone="indigo">{ranked.length} candidates screened</Badge>
        <Badge tone="emerald">Ranked by skill match</Badge>
        <Badge tone="rose">1 compliance flag</Badge>
      </div>

      <div className="space-y-3">
        {ranked.map((c, i) => (
          <CandidateRow key={c.id} candidate={c} rank={i} />
        ))}
      </div>
    </div>
  );
}
