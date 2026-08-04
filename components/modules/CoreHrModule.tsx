"use client";

import { useMemo, useState } from "react";
import { createColumnHelper, type ColumnDef } from "@tanstack/react-table";
import { ShieldAlert, Network, Table2, ChevronRight, ChevronDown } from "lucide-react";
import { useWorkspace } from "@/lib/workspace";
import { visibleEmployees, canViewCompensation, ROLE_META } from "@/lib/rbac";
import { DataTable } from "@/components/ui/DataTable";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Tooltip } from "@/components/ui/Tooltip";
import { SectionHeader, RbacNotice } from "@/components/ui/Misc";
import { formatCurrency, mask } from "@/lib/format";
import type { Employee } from "@/lib/types";

const col = createColumnHelper<Employee>();

export function CoreHrModule() {
  const { role, currentUser, data, openEmployee } = useWorkspace();
  const [view, setView] = useState<"table" | "org">("table");
  const scope = useMemo(
    () => visibleEmployees(role, currentUser.id, data.employees),
    [role, currentUser.id, data.employees]
  );
  const nameById = useMemo(() => new Map(data.employees.map((e) => [e.id, e.name])), [data.employees]);

  const columns = useMemo<ColumnDef<Employee, any>[]>(
    () => [
      col.accessor((e) => e.name, {
        id: "name",
        header: "Employee",
        cell: (c) => {
          const e = c.row.original;
          return (
            <div className="flex items-center gap-2">
              <Avatar initials={e.initials} seed={e.name} size="sm" />
              <div className="min-w-0">
                <p className="truncate font-medium text-zinc-800">{e.name}</p>
                <p className="truncate text-[11px] text-zinc-400">{e.title}</p>
              </div>
            </div>
          );
        },
      }),
      col.accessor((e) => e.employeeId, { id: "id", header: "ID", cell: (c) => <span className="font-mono text-zinc-500">{c.getValue() as string}</span> }),
      col.accessor((e) => e.department, { id: "dept", header: "Department" }),
      col.accessor((e) => e.team, { id: "team", header: "Team" }),
      col.accessor((e) => (e.managerId ? nameById.get(e.managerId) ?? "—" : "—"), { id: "manager", header: "Manager" }),
      col.accessor((e) => e.location, { id: "location", header: "Location" }),
      col.accessor((e) => e.status, {
        id: "status",
        header: "Status",
        cell: (c) => <Badge status={c.getValue() as string} />,
      }),
      col.accessor((e) => e.comp.baseSalary, {
        id: "salary",
        header: "Base Salary",
        cell: (c) => {
          const e = c.row.original;
          const canComp = canViewCompensation(role, currentUser.id, e.id, data.employees);
          return (
            <span className="tabular-nums">
              {mask(formatCurrency(e.comp.baseSalary), canComp)}
            </span>
          );
        },
      }),
      col.accessor((e) => e.performance.rating, {
        id: "rating",
        header: "Rating",
        cell: (c) => <span className="tabular-nums">{(c.getValue() as number).toFixed(1)}</span>,
      }),
    ],
    [role, currentUser.id, data.employees, nameById]
  );

  return (
    <div>
      <SectionHeader
        title="Employee Database"
        description={`${scope.length} record${scope.length === 1 ? "" : "s"} · ${ROLE_META[role].scope}`}
        actions={
          <div className="inline-flex rounded-md border border-zinc-200 bg-white p-0.5">
            <button
              type="button"
              onClick={() => setView("table")}
              className={`inline-flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-medium transition-colors ${
                view === "table" ? "bg-zinc-900 text-white" : "text-zinc-500 hover:text-zinc-800"
              }`}
            >
              <Table2 size={13} /> Table View
            </button>
            <button
              type="button"
              onClick={() => setView("org")}
              className={`inline-flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-medium transition-colors ${
                view === "org" ? "bg-zinc-900 text-white" : "text-zinc-500 hover:text-zinc-800"
              }`}
            >
              <Network size={13} /> Org Chart Hierarchy
            </button>
          </div>
        }
      />

      {role !== "admin" && (
        <RbacNotice>
          <ShieldAlert size={14} />
          {role === "manager"
            ? "Manager view: scoped to your direct and skip-level reports. Compensation for others outside your line is masked."
            : "Self-service view: you can only see your own record. Company directory is restricted."}
        </RbacNotice>
      )}

      {view === "table" && (
        <DataTable
          columns={columns}
          data={scope}
          searchPlaceholder="Search employees by name, team, department…"
          onRowClick={(e) => openEmployee(e.id)}
        />
      )}

      {view === "org" && <OrgChart scope={scope} all={data.employees} onSelect={openEmployee} />}
    </div>
  );
}

function OrgChart({
  scope,
  all,
  onSelect,
}: {
  scope: Employee[];
  all: Employee[];
  onSelect: (id: string) => void;
}) {
  const scopeIds = useMemo(() => new Set(scope.map((e) => e.id)), [scope]);
  const nameById = useMemo(() => new Map(all.map((e) => [e.id, e])), [all]);

  const childrenOf = (id: string | null) => all.filter((e) => e.managerId === id && scopeIds.has(e.id));

  // Count all transitive reports within scope for node badges.
  const totalReports = (id: string): number => {
    const kids = childrenOf(id);
    return kids.reduce((sum, k) => sum + 1 + totalReports(k.id), 0);
  };

  const roots = scope.filter((e) => !e.managerId || !scopeIds.has(e.managerId ?? ""));

  // Expanded by default down to the first couple of levels.
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const toggle = (id: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const Node = ({ emp, depth }: { emp: Employee; depth: number }) => {
    const reports = childrenOf(emp.id);
    const hasReports = reports.length > 0;
    const isCollapsed = collapsed.has(emp.id);
    return (
      <div>
        <div
          style={{ marginLeft: depth * 22 }}
          className="mb-1.5 flex max-w-lg items-center gap-1.5"
        >
          <button
            type="button"
            onClick={() => hasReports && toggle(emp.id)}
            className={`flex h-6 w-6 shrink-0 items-center justify-center rounded ${
              hasReports ? "text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700" : "invisible"
            }`}
            aria-label={isCollapsed ? "Expand" : "Collapse"}
          >
            {isCollapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
          </button>
          <Tooltip content={<span className="block text-xs text-zinc-700">{emp.name} — reports to {emp.managerId ? nameById.get(emp.managerId)?.name ?? "—" : "Board"}</span>}>
            <button
              type="button"
              onClick={() => onSelect(emp.id)}
              className="flex flex-1 items-center gap-2.5 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-left transition-colors hover:border-accent-300 hover:bg-accent-50/40"
            >
              <Avatar initials={emp.initials} seed={emp.name} name={emp.name} size="sm" />
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium text-zinc-800">{emp.name}</span>
                <span className="block truncate text-xs text-zinc-400">{emp.title} · {emp.department}</span>
              </span>
              {hasReports && (
                <span className="ml-auto flex items-center gap-1 whitespace-nowrap rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] font-medium text-zinc-500">
                  {reports.length} direct · {totalReports(emp.id)} total
                </span>
              )}
            </button>
          </Tooltip>
        </div>
        {hasReports && !isCollapsed && reports.map((r) => <Node key={r.id} emp={r} depth={depth + 1} />)}
      </div>
    );
  };

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="flex items-center gap-2 text-sm font-semibold text-zinc-800">
          <Network size={15} className="text-zinc-400" /> Reporting Structure
        </p>
        <div className="flex gap-1.5 text-xs">
          <button onClick={() => setCollapsed(new Set())} className="rounded border border-zinc-200 px-2 py-1 text-zinc-500 hover:bg-zinc-50">
            Expand all
          </button>
          <button
            onClick={() => setCollapsed(new Set(all.filter((e) => childrenOf(e.id).length).map((e) => e.id)))}
            className="rounded border border-zinc-200 px-2 py-1 text-zinc-500 hover:bg-zinc-50"
          >
            Collapse all
          </button>
        </div>
      </div>
      <div className="overflow-x-auto">
        {roots.map((r) => (
          <Node key={r.id} emp={r} depth={0} />
        ))}
      </div>
    </div>
  );
}
