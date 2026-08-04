"use client";

import { Mail, Phone, MapPin, Calendar, Briefcase, DollarSign, Star, Check, Clock } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ProgressBar } from "@/components/ui/Misc";
import { formatCurrency, formatDate } from "@/lib/format";
import type { Candidate, CandidateStage } from "@/lib/types";

const STAGES: CandidateStage[] = ["Applied", "Screening", "Interview", "Offer", "Hired"];

export function CandidateSlideOver({ candidate }: { candidate: Candidate }) {
  const stageIndex = STAGES.indexOf(candidate.stage);
  const scoreTone = candidate.matchScore >= 90 ? "emerald" : candidate.matchScore >= 78 ? "accent" : candidate.matchScore >= 68 ? "amber" : "rose";

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b border-zinc-200 px-5 pb-4 pt-5">
        <div className="flex items-start gap-3 pr-8">
          <Avatar initials={candidate.initials} seed={candidate.name} name={candidate.name} size="lg" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h2 className="truncate text-base font-semibold text-zinc-900">{candidate.name}</h2>
              <Badge status={candidate.compliance}>{candidate.compliance}</Badge>
            </div>
            <p className="text-sm text-zinc-500">{candidate.role}</p>
            <p className="text-xs text-zinc-400">{candidate.id} · {candidate.department} · via {candidate.source}</p>
          </div>
          <div className="text-right">
            <p className="text-lg font-semibold tabular-nums text-zinc-900">{candidate.matchScore}%</p>
            <p className="text-[10px] uppercase tracking-wide text-zinc-400">AI match</p>
          </div>
        </div>
        <div className="mt-3">
          <ProgressBar value={candidate.matchScore} tone={scoreTone} />
        </div>
      </div>

      <div className="flex-1 space-y-5 overflow-y-auto px-5 py-4">
        {/* Interview progress */}
        <section>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-zinc-400">Interview Progress</p>
          <div className="flex items-center">
            {STAGES.map((s, i) => {
              const done = i < stageIndex;
              const current = i === stageIndex;
              return (
                <div key={s} className="flex flex-1 flex-col items-center">
                  <div className="flex w-full items-center">
                    <div className={`h-0.5 flex-1 ${i === 0 ? "opacity-0" : done || current ? "bg-accent-400" : "bg-zinc-200"}`} />
                    <span
                      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold ${
                        done ? "bg-accent-500 text-white" : current ? "bg-accent-100 text-accent-700 ring-2 ring-accent-400" : "bg-zinc-100 text-zinc-400"
                      }`}
                    >
                      {done ? <Check size={12} /> : i + 1}
                    </span>
                    <div className={`h-0.5 flex-1 ${i === STAGES.length - 1 ? "opacity-0" : done ? "bg-accent-400" : "bg-zinc-200"}`} />
                  </div>
                  <span className={`mt-1 text-[10px] ${current ? "font-semibold text-accent-700" : "text-zinc-400"}`}>{s}</span>
                </div>
              );
            })}
          </div>
        </section>

        {/* Key facts */}
        <section className="grid grid-cols-2 gap-3">
          <Fact icon={Briefcase} label="Target Position" value={candidate.role} />
          <Fact icon={DollarSign} label="Expected Salary" value={formatCurrency(candidate.expectedSalary)} />
          <Fact icon={Calendar} label="Sourced Date" value={formatDate(candidate.appliedDate)} />
          <Fact icon={Star} label="Experience" value={`${candidate.yearsExp} years`} />
          <Fact icon={Mail} label="Email" value={candidate.email} />
          <Fact icon={Phone} label="Phone" value={candidate.phone} />
          <Fact icon={MapPin} label="Location" value={candidate.location} />
          <Fact icon={Clock} label="Stage" value={candidate.stage} />
        </section>

        {/* Resume summary */}
        <section>
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-zinc-400">Resume Summary</p>
          <p className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-sm leading-relaxed text-zinc-600">{candidate.summary}</p>
        </section>

        {/* Skills */}
        <section>
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-zinc-400">Key Skills</p>
          <div className="flex flex-wrap gap-1.5">
            {candidate.skills.map((s) => (
              <span key={s} className="rounded-md border border-zinc-200 bg-white px-2 py-0.5 text-xs text-zinc-600">{s}</span>
            ))}
          </div>
        </section>

        {/* Scorecards */}
        <section>
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-zinc-400">Recruiter Scorecards</p>
          <div className="space-y-2">
            {candidate.scorecards.map((sc, i) => (
              <div key={i} className="rounded-lg border border-zinc-200 p-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-zinc-800">{sc.focus}</p>
                  <span className="flex items-center gap-0.5">
                    {Array.from({ length: 5 }, (_, s) => (
                      <Star key={s} size={12} className={s < sc.rating ? "fill-amber-400 text-amber-400" : "text-zinc-200"} />
                    ))}
                  </span>
                </div>
                <p className="mt-1 text-xs text-zinc-500">&ldquo;{sc.note}&rdquo;</p>
                <p className="mt-1 text-[11px] text-zinc-400">— {sc.interviewer}</p>
              </div>
            ))}
            {candidate.scorecards.length === 0 && (
              <p className="rounded-lg border border-dashed border-zinc-200 py-4 text-center text-xs text-zinc-400">No scorecards submitted yet.</p>
            )}
          </div>
        </section>
      </div>

      {/* Footer actions */}
      <div className="flex items-center justify-end gap-2 border-t border-zinc-200 px-5 py-3">
        <Button variant="secondary" size="sm">Reject</Button>
        <Button variant="primary" size="sm">Advance Stage</Button>
      </div>
    </div>
  );
}

function Fact({ icon: Icon, label, value }: { icon: typeof Mail; label: string; value: string }) {
  return (
    <div className="rounded-lg border border-zinc-200 p-2.5">
      <p className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-zinc-400">
        <Icon size={12} /> {label}
      </p>
      <p className="mt-0.5 truncate text-sm text-zinc-800">{value}</p>
    </div>
  );
}
