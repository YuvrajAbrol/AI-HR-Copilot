"use client";

import { useMemo, useState } from "react";
import { Briefcase, AlertTriangle, Star } from "lucide-react";
import { motion } from "framer-motion";
import { useWorkspace } from "@/lib/workspace";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { SlideOver } from "@/components/ui/SlideOver";
import { StatTile, SectionHeader, ProgressBar } from "@/components/ui/Misc";
import { CandidateSlideOver } from "./CandidateSlideOver";
import { formatDate } from "@/lib/format";
import type { Candidate, CandidateStage } from "@/lib/types";

const STAGES: CandidateStage[] = ["Applied", "Screening", "Interview", "Offer", "Hired"];
const STAGE_TONE: Record<CandidateStage, string> = {
  Applied: "border-t-zinc-300",
  Screening: "border-t-sky-400",
  Interview: "border-t-accent-400",
  Offer: "border-t-amber-400",
  Hired: "border-t-emerald-400",
};

export function AtsModule() {
  const { data } = useWorkspace();
  const [roleFilter, setRoleFilter] = useState("All");
  const [selected, setSelected] = useState<Candidate | null>(null);

  const roles = useMemo(
    () => ["All", ...Array.from(new Set(data.candidates.map((c) => c.role)))],
    [data.candidates]
  );
  const candidates = useMemo(
    () => (roleFilter === "All" ? data.candidates : data.candidates.filter((c) => c.role === roleFilter)),
    [data.candidates, roleFilter]
  );

  const byStage = (s: CandidateStage) =>
    candidates.filter((c) => c.stage === s).sort((a, b) => b.matchScore - a.matchScore);

  const flagged = candidates.filter((c) => c.compliance === "Flagged").length;
  const avgScore = Math.round(candidates.reduce((s, c) => s + c.matchScore, 0) / (candidates.length || 1));

  return (
    <div>
      <SectionHeader
        title="Talent Acquisition"
        description="Candidate pipeline with AI match scoring and compliance screening."
        actions={
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="h-9 rounded-md border border-zinc-200 bg-white px-2.5 text-sm text-zinc-700 outline-none focus:border-accent-400 focus:ring-2 focus:ring-accent-100"
          >
            {roles.map((r) => (
              <option key={r}>{r}</option>
            ))}
          </select>
        }
      />

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Active Candidates" value={candidates.filter((c) => c.stage !== "Hired").length} icon={Briefcase} />
        <StatTile label="Avg Match Score" value={`${avgScore}%`} tone="accent" />
        <StatTile label="Compliance Flags" value={flagged} icon={AlertTriangle} tone={flagged ? "rose" : "emerald"} />
        <StatTile label="In Offer Stage" value={byStage("Offer").length} tone="amber" />
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3 xl:grid-cols-5">
        {STAGES.map((stage) => {
          const items = byStage(stage);
          return (
            <div key={stage} className="flex flex-col rounded-lg bg-zinc-100/70">
              <div className={`flex items-center justify-between rounded-t-lg border-t-2 bg-white px-3 py-2 ${STAGE_TONE[stage]}`}>
                <span className="text-xs font-semibold text-zinc-700">{stage}</span>
                <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] font-medium text-zinc-500">{items.length}</span>
              </div>
              <div className="flex flex-col gap-2 p-2">
                {items.map((c) => (
                  <CandidateCard key={c.id} candidate={c} onClick={() => setSelected(c)} />
                ))}
                {items.length === 0 && (
                  <p className="px-2 py-6 text-center text-[11px] text-zinc-400">Empty</p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <SlideOver open={!!selected} onClose={() => setSelected(null)} width="max-w-xl">
        {selected && <CandidateSlideOver candidate={selected} />}
      </SlideOver>
    </div>
  );
}

function CandidateCard({ candidate, onClick }: { candidate: Candidate; onClick: () => void }) {
  const scoreTone = candidate.matchScore >= 90 ? "emerald" : candidate.matchScore >= 78 ? "accent" : candidate.matchScore >= 68 ? "amber" : "rose";
  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={onClick}
      className="cursor-pointer rounded-md border border-zinc-200 bg-white p-2.5 shadow-sm transition-colors hover:border-accent-300 hover:bg-accent-50/30"
    >
      <div className="flex items-center gap-2">
        <Avatar initials={candidate.initials} seed={candidate.name} name={candidate.name} size="sm" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-medium text-zinc-800">{candidate.name}</p>
          <p className="truncate text-[11px] text-zinc-400">{candidate.yearsExp} yrs · {candidate.location}</p>
        </div>
        {candidate.matchScore >= 90 && <Star size={13} className="text-amber-400" />}
      </div>
      <p className="mt-1.5 truncate text-[11px] text-zinc-500">{candidate.role}</p>
      <div className="mt-1.5 flex items-center gap-1.5">
        <ProgressBar value={candidate.matchScore} tone={scoreTone} />
        <span className="text-[10px] font-semibold tabular-nums text-zinc-600">{candidate.matchScore}%</span>
      </div>
      <div className="mt-1.5 flex items-center justify-between">
        <Badge status={candidate.compliance}>
          {candidate.compliance === "Flagged" && <AlertTriangle size={10} />}
          {candidate.compliance}
        </Badge>
        <span className="text-[10px] text-zinc-400">{formatDate(candidate.appliedDate, { month: "short", day: "numeric" })}</span>
      </div>
    </motion.div>
  );
}
