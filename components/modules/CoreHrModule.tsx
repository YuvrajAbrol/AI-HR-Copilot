"use client";

import { useMemo, useState } from "react";
import { createColumnHelper, type ColumnDef } from "@tanstack/react-table";
import { ShieldAlert, Network } from "lucide-react";
import { useWorkspace } from "@/lib/workspace";
import { visibleEmployees, canViewCompensation, ROLE_META } from "@/lib/rbac";
import { DataTable } from "@/components/ui/DataTable";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Tabs } from "@/components/ui/Tabs";
import { SectionHeader, RbacNotice } from "@/components/ui/Misc";
import { formatCurrency, mask } from "@/lib/format";
import type { Employee } from "@/lib/types";

const col = createColumnHelper<Employee>();

export function CoreHrModule() {
  const { role, currentUser, data, openEmployee } = useWorkspace();
  const [tab, setTab] = useState("directory");
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
      />

      {role !== "admin" && (
        <RbacNotice>
          <ShieldAlert size={14} />
          {role === "manager"
            ? "Manager view: scoped to your direct and skip-level reports. Compensation for others outside your line is masked."
            : "Self-service view: you can only see your own record. Company directory is restricted."}
        </RbacNotice>
      )}

      <div className="mb-4">
        <Tabs
          active={tab}
          onChange={setTab}
          tabs={[
            { id: "directory", label: "Directory", count: scope.length },
            { id: "org", label: "Org Chart" },
          ]}
        />
      </div>

      {tab === "directory" && (
        <DataTable
          columns={columns}
          data={scope}
          searchPlaceholder="Search employees by name, team, department…"
          onRowClick={(e) => openEmployee(e.id)}
        />
      )}

      {tab === "org" && <OrgChart scope={scope} all={data.employees} onSelect={openEmployee} />}
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
  const scopeIds = new Set(scope.map((e) => e.id));
  const childrenOf = (id: string | null) =>
    all.filter((e) => e.managerId === id && scopeIds.has(e.id));

  const roots = scope.filter((e) => !e.managerId || !scopeIds.has(e.managerId ?? ""));

  const Node = ({ emp, depth }: { emp: Employee; depth: number }) => {
    const reports = childrenOf(emp.id);
    return (
      <div>
        <button
          type="button"
          onClick={() => onSelect(emp.id)}
          style={{ marginLeft: depth * 20 }}
          className="mb-1.5 flex w-full max-w-md items-center gap-2.5 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-left transition-colors hover:border-accent-300 hover:bg-accent-50/40"
        >
          <Avatar initials={emp.initials} seed={emp.name} size="sm" />
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-zinc-800">{emp.name}</p>
            <p className="truncate text-xs text-zinc-400">{emp.title} · {emp.department}</p>
          </div>
          {reports.length > 0 && (
            <span className="ml-auto rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] font-medium text-zinc-500">
              {reports.length}
            </span>
          )}
        </button>
        {reports.map((r) => (
          <Node key={r.id} emp={r} depth={depth + 1} />
        ))}
      </div>
    );
  };

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4">
      <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-zinc-800">
        <Network size={15} className="text-zinc-400" /> Reporting Structure
      </p>
      <div className="overflow-x-auto">
        {roots.map((r) => (
          <Node key={r.id} emp={r} depth={0} />
        ))}
      </div>
    </div>
  );
}
