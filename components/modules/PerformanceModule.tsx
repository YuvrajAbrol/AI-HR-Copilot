"use client";

import { useMemo, useState } from "react";
import { createColumnHelper, type ColumnDef } from "@tanstack/react-table";
import { Target } from "lucide-react";
import { useWorkspace } from "@/lib/workspace";
import { visibleEmployees, ROLE_META } from "@/lib/rbac";
import { DataTable } from "@/components/ui/DataTable";
import { Tabs } from "@/components/ui/Tabs";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Tooltip } from "@/components/ui/Tooltip";
import { StatTile, SectionHeader, ProgressBar } from "@/components/ui/Misc";
import type { Employee } from "@/lib/types";

// 9-box cell metadata. Index by box number (1..9). Box = potentialTier*3 +
// performanceTier + 1, so 9 = high/high (Star), 1 = low/low (Risk).
const BOX_META: Record<number, { label: string; sub: string; tone: string }> = {
  1: { label: "Risk", sub: "Low Potential · Low Performance", tone: "bg-rose-50" },
  2: { label: "Effective", sub: "Low Potential · Med Performance", tone: "bg-amber-50" },
  3: { label: "High Professional", sub: "Low Potential · High Performance", tone: "bg-emerald-50" },
  4: { label: "Inconsistent Player", sub: "Med Potential · Low Performance", tone: "bg-amber-50" },
  5: { label: "Core Player", sub: "Med Potential · Med Performance", tone: "bg-zinc-50" },
  6: { label: "High Performer", sub: "Med Potential · High Performance", tone: "bg-emerald-50" },
  7: { label: "Potential Gem", sub: "High Potential · Low Performance", tone: "bg-amber-50" },
  8: { label: "High Potential", sub: "High Potential · Med Performance", tone: "bg-emerald-50" },
  9: { label: "Star", sub: "High Potential · High Performance", tone: "bg-emerald-100" },
};
// Visual grid order: top row = high potential (7,8,9), bottom = low (1,2,3).
const GRID_ROWS = [
  [7, 8, 9],
  [4, 5, 6],
  [1, 2, 3],
];

interface GoalRow {
  employeeName: string;
  initials: string;
  objective: string;
  keyResult: string;
  progress: number;
  status: string;
  dueDate: string;
}

export function PerformanceModule() {
  const { role, currentUser, data } = useWorkspace();
  const [tab, setTab] = useState(role === "employee" ? "goals" : "matrix");
  const scope = useMemo(
    () => visibleEmployees(role, currentUser.id, data.employees),
    [role, currentUser.id, data.employees]
  );

  const avgRating = (scope.reduce((s, e) => s + e.performance.rating, 0) / (scope.length || 1)).toFixed(1);
  const stars = scope.filter((e) => e.performance.nineBox === 9).length;
  const atRisk = scope.filter((e) => e.performance.nineBox === 1).length;

  const tabs = [
    ...(role !== "employee" ? [{ id: "matrix", label: "9-Box Matrix" }] : []),
    { id: "goals", label: role === "employee" ? "My Goals" : "Goals & OKRs" },
  ];

  return (
    <div>
      <SectionHeader title="Performance & OKRs" description={`${ROLE_META[role].label} · ${ROLE_META[role].scope}`} />

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Avg Rating" value={`${avgRating}/5`} icon={Target} tone="accent" />
        <StatTile label="Top Talent (Stars)" value={stars} tone="emerald" />
        <StatTile label="At Risk" value={atRisk} tone={atRisk ? "rose" : "emerald"} />
        <StatTile label="Reviews in Scope" value={scope.length} />
      </div>

      <div className="mb-4">
        <Tabs active={tab} onChange={setTab} tabs={tabs} />
      </div>

      {tab === "matrix" && <NineBox scope={scope} currentId={currentUser.id} />}
      {tab === "goals" && <Goals scope={scope} />}
    </div>
  );
}

function NineBox({ scope, currentId }: { scope: Employee[]; currentId: string }) {
  const inBox = (n: number) => scope.filter((e) => e.performance.nineBox === n);
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-zinc-900">9-Box Talent Performance &amp; Potential Matrix</h2>
          <p className="text-xs text-zinc-400">Hover an avatar for details · rows = potential, columns = performance</p>
        </div>
        <span className="hidden text-[11px] font-medium uppercase tracking-wide text-zinc-400 sm:block">▲ Potential</span>
      </div>

      {/* Grid with axis labels */}
      <div className="flex gap-2">
        {/* Row (potential) labels */}
        <div className="flex w-4 flex-col justify-around">
          {["High", "Med", "Low"].map((l) => (
            <span key={l} className="rotate-180 text-center text-[10px] font-medium uppercase tracking-wide text-zinc-400 [writing-mode:vertical-rl]">
              {l}
            </span>
          ))}
        </div>
        <div className="flex-1">
          <div className="grid grid-cols-3 gap-2">
            {GRID_ROWS.flat().map((box) => {
              const people = inBox(box);
              const meta = BOX_META[box];
              return (
                <div key={box} className={`min-h-[132px] rounded-lg border border-zinc-200 p-2 ${meta.tone}`}>
                  <div className="mb-0.5 flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-zinc-700">{meta.label}</span>
                    <span className="rounded bg-white/70 px-1.5 py-0.5 text-[10px] font-medium text-zinc-500">{people.length}</span>
                  </div>
                  <p className="mb-1.5 text-[9px] uppercase tracking-wide text-zinc-400">{meta.sub}</p>
                  <div className="flex flex-wrap gap-1">
                    {people.slice(0, 10).map((e) => (
                      <Tooltip key={e.id} content={<EmployeeHoverCard employee={e} />}>
                        <Avatar initials={e.initials} seed={e.name} name={e.name} size="xs" />
                      </Tooltip>
                    ))}
                    {people.length > 10 && (
                      <span className="flex h-6 items-center rounded bg-white/70 px-1 text-[10px] font-medium text-zinc-500">
                        +{people.length - 10}
                      </span>
                    )}
                  </div>
                  {people.some((e) => e.id === currentId) && (
                    <p className="mt-1 text-[10px] font-medium text-accent-600">Includes you</p>
                  )}
                </div>
              );
            })}
          </div>
          {/* Column (performance) labels */}
          <div className="mt-1.5 grid grid-cols-3 gap-2">
            {["Low", "Med", "High"].map((l) => (
              <span key={l} className="text-center text-[10px] font-medium uppercase tracking-wide text-zinc-400">
                {l}
              </span>
            ))}
          </div>
          <p className="mt-1 text-center text-[11px] font-medium uppercase tracking-wide text-zinc-400">Performance ▶</p>
        </div>
      </div>
    </div>
  );
}

function EmployeeHoverCard({ employee }: { employee: Employee }) {
  return (
    <span className="block">
      <span className="flex items-center gap-2">
        <Avatar initials={employee.initials} seed={employee.name} size="sm" />
        <span className="block">
          <span className="block text-xs font-semibold text-zinc-900">{employee.name}</span>
          <span className="block text-[11px] text-zinc-500">{employee.title}</span>
        </span>
      </span>
      <span className="mt-1.5 block border-t border-zinc-100 pt-1.5 text-[11px] text-zinc-500">
        <span className="block">Dept · <span className="text-zinc-700">{employee.department}</span></span>
        <span className="block">Rating · <span className="font-semibold text-zinc-700">{employee.performance.rating}/5</span> · {employee.performance.potential} potential</span>
      </span>
    </span>
  );
}

const goalCol = createColumnHelper<GoalRow>();
function Goals({ scope }: { scope: Employee[] }) {
  const rows: GoalRow[] = useMemo(
    () =>
      scope.flatMap((e) =>
        e.performance.goals.map((g) => ({
          employeeName: e.name,
          initials: e.initials,
          objective: g.objective,
          keyResult: g.keyResult,
          progress: g.progress,
          status: g.status,
          dueDate: g.dueDate,
        }))
      ),
    [scope]
  );

  const columns = useMemo<ColumnDef<GoalRow, any>[]>(
    () => [
      goalCol.accessor((r) => r.employeeName, {
        id: "emp",
        header: "Owner",
        cell: (c) => (
          <div className="flex items-center gap-2">
            <Avatar initials={c.row.original.initials} seed={c.row.original.employeeName} size="xs" />
            <span className="font-medium text-zinc-800">{c.row.original.employeeName}</span>
          </div>
        ),
      }),
      goalCol.accessor((r) => r.objective, { id: "obj", header: "Objective" }),
      goalCol.accessor((r) => r.keyResult, { id: "kr", header: "Key Result", cell: (c) => <span className="text-zinc-500">{c.getValue() as string}</span> }),
      goalCol.accessor((r) => r.progress, {
        id: "progress",
        header: "Progress",
        cell: (c) => {
          const v = c.getValue() as number;
          return (
            <div className="flex w-28 items-center gap-2">
              <ProgressBar value={v} tone={v > 65 ? "emerald" : v > 40 ? "amber" : "rose"} />
              <span className="text-[11px] tabular-nums text-zinc-500">{v}%</span>
            </div>
          );
        },
      }),
      goalCol.accessor((r) => r.status, { id: "status", header: "Status", cell: (c) => <Badge status={c.getValue() as string} /> }),
    ],
    []
  );

  return <DataTable columns={columns} data={rows} searchPlaceholder="Search goals & objectives…" />;
}
