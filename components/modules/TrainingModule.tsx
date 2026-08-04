"use client";

import { useMemo, useState } from "react";
import { GraduationCap, Clock, AlertTriangle, BookOpen, Check, Award } from "lucide-react";
import { useWorkspace } from "@/lib/workspace";
import { visibleEmployees, ROLE_META } from "@/lib/rbac";
import { Tabs } from "@/components/ui/Tabs";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { StatTile, SectionHeader, ProgressBar } from "@/components/ui/Misc";
import type { CourseStatus, Department, Employee } from "@/lib/types";

const NOW = new Date("2026-07-31T00:00:00Z");

const COURSE_DEADLINES: Record<string, string> = {
  "Security Awareness 2026": "2026-08-15",
  "Code of Conduct": "2026-09-01",
  "Data Privacy & GDPR": "2026-08-10",
  "Anti-Harassment": "2026-10-01",
  "Inclusive Leadership": "2026-09-15",
};

const SKILL_CATALOG = [
  { name: "Advanced TypeScript Patterns", category: "Engineering", level: "Advanced", hours: 8 },
  { name: "Distributed Systems Fundamentals", category: "Engineering", level: "Intermediate", hours: 12 },
  { name: "Enterprise Negotiation", category: "Sales", level: "Intermediate", hours: 6 },
  { name: "Storytelling for Marketers", category: "Marketing", level: "Beginner", hours: 4 },
  { name: "People Management 101", category: "Leadership", level: "Beginner", hours: 5 },
  { name: "Data Storytelling with Charts", category: "Analytics", level: "Intermediate", hours: 7 },
  { name: "Executive Presence", category: "Leadership", level: "Advanced", hours: 6 },
  { name: "Financial Modeling Essentials", category: "Finance", level: "Intermediate", hours: 9 },
];

const LEVEL_TONE: Record<string, "emerald" | "amber" | "rose"> = {
  Beginner: "emerald",
  Intermediate: "amber",
  Advanced: "rose",
};

function progressFor(status: CourseStatus): number {
  return status === "Completed" ? 100 : status === "In Progress" ? 55 : status === "Overdue" ? 30 : 0;
}
function daysUntil(dateStr: string): number {
  return Math.round((new Date(dateStr + "T00:00:00Z").getTime() - NOW.getTime()) / 86400000);
}

export function TrainingModule() {
  const { role, currentUser, data } = useWorkspace();
  const [tab, setTab] = useState("compliance");
  const scope = useMemo(
    () => visibleEmployees(role, currentUser.id, data.employees),
    [role, currentUser.id, data.employees]
  );

  const tabs = [
    { id: "compliance", label: "Mandatory Compliance" },
    { id: "catalog", label: "Skill Development" },
    ...(role !== "employee" ? [{ id: "matrix", label: "Completion Matrix" }] : []),
  ];

  return (
    <div>
      <SectionHeader title="Training & Learning" description={`Compliance and skill development · ${ROLE_META[role].scope}`} />

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="My Compliance" value={`${currentUser.training.compliancePct}%`} icon={GraduationCap} tone={currentUser.training.compliancePct > 85 ? "emerald" : "amber"} />
        <StatTile label="Courses Assigned" value={currentUser.training.courses.length} icon={BookOpen} />
        <StatTile label="Overdue" value={currentUser.training.courses.filter((c) => c.status === "Overdue").length} icon={AlertTriangle} tone={currentUser.training.courses.some((c) => c.status === "Overdue") ? "rose" : "emerald"} />
        <StatTile label="Catalog Courses" value={SKILL_CATALOG.length} icon={Award} tone="accent" />
      </div>

      <div className="mb-4">
        <Tabs active={tab} onChange={setTab} tabs={tabs} />
      </div>

      {tab === "compliance" && <ComplianceCourses employee={currentUser} />}
      {tab === "catalog" && <SkillCatalog />}
      {tab === "matrix" && role !== "employee" && <CompletionMatrix scope={scope} />}
    </div>
  );
}

function ComplianceCourses({ employee }: { employee: Employee }) {
  return (
    <div className="space-y-2">
      {employee.training.courses.map((c) => {
        const due = COURSE_DEADLINES[c.name];
        const days = due ? daysUntil(due) : null;
        const progress = progressFor(c.status);
        const overdue = c.status === "Overdue" || (days !== null && days < 0 && c.status !== "Completed");
        return (
          <div key={c.name} className="rounded-lg border border-zinc-200 bg-white p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className={`flex h-8 w-8 items-center justify-center rounded-md ${c.status === "Completed" ? "bg-emerald-50 text-emerald-600" : overdue ? "bg-rose-50 text-rose-600" : "bg-zinc-100 text-zinc-500"}`}>
                  {c.status === "Completed" ? <Check size={16} /> : <GraduationCap size={16} />}
                </span>
                <div>
                  <p className="text-sm font-medium text-zinc-800">{c.name}</p>
                  <p className="text-xs text-zinc-400">Mandatory compliance training</p>
                </div>
              </div>
              <Badge status={c.status} />
            </div>
            <div className="mt-3 flex items-center gap-3">
              <ProgressBar value={progress} tone={c.status === "Completed" ? "emerald" : overdue ? "rose" : "accent"} />
              <span className="w-10 shrink-0 text-right text-xs tabular-nums text-zinc-500">{progress}%</span>
            </div>
            <div className="mt-2 flex items-center gap-1.5 text-xs">
              <Clock size={12} className={overdue ? "text-rose-500" : "text-zinc-400"} />
              {c.status === "Completed" ? (
                <span className="text-emerald-600">Completed {c.completedDate ?? ""}</span>
              ) : days === null ? (
                <span className="text-zinc-400">No deadline set</span>
              ) : days < 0 ? (
                <span className="font-medium text-rose-600">Overdue by {Math.abs(days)} days</span>
              ) : (
                <span className={days <= 14 ? "font-medium text-amber-600" : "text-zinc-500"}>Due in {days} days ({due})</span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function SkillCatalog() {
  const [enrolled, setEnrolled] = useState<Set<string>>(new Set());
  const toggle = (name: string) =>
    setEnrolled((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });

  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
      {SKILL_CATALOG.map((c) => {
        const isEnrolled = enrolled.has(c.name);
        return (
          <div key={c.name} className="flex flex-col rounded-lg border border-zinc-200 bg-white p-4">
            <div className="flex items-center justify-between">
              <span className="flex h-9 w-9 items-center justify-center rounded-md bg-accent-50 text-accent-600">
                <BookOpen size={17} />
              </span>
              <Badge tone={LEVEL_TONE[c.level]}>{c.level}</Badge>
            </div>
            <p className="mt-2.5 text-sm font-semibold text-zinc-900">{c.name}</p>
            <p className="text-xs text-zinc-400">{c.category}</p>
            <div className="mt-2 flex items-center gap-1.5 text-xs text-zinc-500">
              <Clock size={12} /> {c.hours} hours · self-paced
            </div>
            <div className="mt-3 pt-1">
              <Button
                size="sm"
                variant={isEnrolled ? "secondary" : "primary"}
                className="w-full"
                onClick={() => toggle(c.name)}
              >
                {isEnrolled ? (
                  <>
                    <Check size={13} /> Enrolled
                  </>
                ) : (
                  "Enroll"
                )}
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function CompletionMatrix({ scope }: { scope: Employee[] }) {
  const depts = ["Engineering", "Sales", "Human Resources", "Marketing", "Executive"] as Department[];
  const rows = depts
    .map((d) => {
      const people = scope.filter((e) => e.department === d);
      if (!people.length) return null;
      const avg = Math.round(people.reduce((s, e) => s + e.training.compliancePct, 0) / people.length);
      const overdue = people.reduce((s, e) => s + e.training.courses.filter((c) => c.status === "Overdue").length, 0);
      return { department: d, count: people.length, avg, overdue };
    })
    .filter(Boolean) as { department: Department; count: number; avg: number; overdue: number }[];

  return (
    <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white">
      <div className="border-b border-zinc-100 px-4 py-2.5">
        <p className="text-sm font-semibold text-zinc-800">Completion by Department</p>
        <p className="text-xs text-zinc-400">Average compliance completion and overdue courses across your scope.</p>
      </div>
      <table className="w-full text-xs">
        <thead className="bg-zinc-50 text-[11px] uppercase text-zinc-500">
          <tr>
            <th className="px-4 py-2 text-left font-medium">Department</th>
            <th className="px-4 py-2 text-left font-medium">People</th>
            <th className="px-4 py-2 text-left font-medium">Avg Completion</th>
            <th className="px-4 py-2 text-left font-medium">Overdue</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100">
          {rows.map((r) => (
            <tr key={r.department}>
              <td className="px-4 py-2.5 font-medium text-zinc-800">{r.department}</td>
              <td className="px-4 py-2.5 tabular-nums text-zinc-600">{r.count}</td>
              <td className="px-4 py-2.5">
                <div className="flex items-center gap-2">
                  <div className="w-32">
                    <ProgressBar value={r.avg} tone={r.avg > 85 ? "emerald" : r.avg > 65 ? "amber" : "rose"} />
                  </div>
                  <span className="tabular-nums text-zinc-600">{r.avg}%</span>
                </div>
              </td>
              <td className="px-4 py-2.5">
                {r.overdue > 0 ? (
                  <span className="inline-flex items-center gap-1 font-medium text-rose-600">
                    <AlertTriangle size={12} /> {r.overdue} overdue
                  </span>
                ) : (
                  <span className="text-emerald-600">On track</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
