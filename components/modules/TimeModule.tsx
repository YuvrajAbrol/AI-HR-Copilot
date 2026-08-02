"use client";

import { useMemo, useState } from "react";
import { createColumnHelper, type ColumnDef } from "@tanstack/react-table";
import { CalendarClock, Plane } from "lucide-react";
import { useWorkspace } from "@/lib/workspace";
import { visibleEmployees, ROLE_META } from "@/lib/rbac";
import { DataTable } from "@/components/ui/DataTable";
import { Tabs } from "@/components/ui/Tabs";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { StatTile, SectionHeader } from "@/components/ui/Misc";
import { formatDateRange } from "@/lib/format";
import type { Employee, PtoRequest } from "@/lib/types";

interface RequestRow extends PtoRequest {
  employeeName: string;
  initials: string;
}

export function TimeModule() {
  const { role, currentUser, data } = useWorkspace();
  const [tab, setTab] = useState("calendar");

  const scope = useMemo(
    () => visibleEmployees(role, currentUser.id, data.employees),
    [role, currentUser.id, data.employees]
  );
  const requests: RequestRow[] = useMemo(
    () =>
      scope.flatMap((e) =>
        e.pto.requests.map((r) => ({ ...r, employeeName: e.name, initials: e.initials }))
      ),
    [scope]
  );
  const pending = requests.filter((r) => r.status === "Pending").length;

  return (
    <div>
      <SectionHeader title="Time & Attendance" description={`${ROLE_META[role].label} · ${ROLE_META[role].scope}`} />

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="In Scope" value={scope.length} icon={CalendarClock} />
        <StatTile label="Pending Requests" value={pending} tone="amber" />
        <StatTile label="Out This Month" value={requests.filter((r) => r.status === "Approved").length} icon={Plane} tone="accent" />
        <StatTile label="My Vacation Left" value={`${currentUser.pto.vacationTotal - currentUser.pto.vacationUsed}d`} tone="emerald" />
      </div>

      <div className="mb-4">
        <Tabs
          active={tab}
          onChange={setTab}
          tabs={[
            { id: "calendar", label: "Company Calendar" },
            { id: "timesheets", label: "My Timesheet" },
            { id: "requests", label: "Leave Requests", count: requests.length },
          ]}
        />
      </div>

      {tab === "calendar" && <LeaveCalendar scope={scope} holidays={data.holidays} />}
      {tab === "timesheets" && <Timesheet employee={currentUser} />}
      {tab === "requests" && <RequestsTable requests={requests} canApprove={role !== "employee"} />}
    </div>
  );
}

function LeaveCalendar({ scope, holidays }: { scope: Employee[]; holidays: { date: string; name: string }[] }) {
  const year = 2026;
  const month = 7; // August (0-indexed)
  const first = new Date(year, month, 1);
  const startPad = first.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const holidayMap = new Map(holidays.map((h) => [h.date, h.name]));

  const outByDay = (dateStr: string) =>
    scope.filter((e) =>
      e.pto.requests.some((r) => r.status === "Approved" && r.start <= dateStr && r.end >= dateStr)
    );

  const cells: (number | null)[] = [
    ...Array.from({ length: startPad }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4">
      <p className="mb-3 text-sm font-semibold text-zinc-800">August 2026 — Company Leave</p>
      <div className="grid grid-cols-7 gap-1">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
          <div key={d} className="pb-1 text-center text-[11px] font-medium uppercase tracking-wide text-zinc-400">
            {d}
          </div>
        ))}
        {cells.map((day, i) => {
          if (day === null) return <div key={`p${i}`} className="min-h-[76px] rounded-md bg-zinc-50/50" />;
          const dateStr = `${year}-08-${String(day).padStart(2, "0")}`;
          const out = outByDay(dateStr);
          const holiday = holidayMap.get(dateStr);
          const weekend = new Date(year, month, day).getDay() % 6 === 0;
          return (
            <div
              key={day}
              className={`min-h-[76px] rounded-md border border-zinc-100 p-1.5 ${weekend ? "bg-zinc-50/60" : "bg-white"}`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium text-zinc-500">{day}</span>
                {holiday && <span className="h-1.5 w-1.5 rounded-full bg-rose-400" title={holiday} />}
              </div>
              {holiday && <p className="mt-0.5 truncate text-[9px] text-rose-500">{holiday}</p>}
              <div className="mt-1 flex flex-wrap gap-0.5">
                {out.slice(0, 4).map((e) => (
                  <Avatar key={e.id} initials={e.initials} seed={e.name} size="xs" />
                ))}
                {out.length > 4 && (
                  <span className="flex h-6 items-center rounded bg-zinc-100 px-1 text-[9px] font-medium text-zinc-500">
                    +{out.length - 4}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-3 flex items-center gap-4 text-[11px] text-zinc-400">
        <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-rose-400" /> Holiday</span>
        <span>Avatars indicate approved leave</span>
      </div>
    </div>
  );
}

function Timesheet({ employee }: { employee: Employee }) {
  // Deterministic weekly hours from the employee id so it's stable.
  const seed = employee.id.charCodeAt(4) + employee.id.charCodeAt(5);
  const weeks = ["Jul 6–10", "Jul 13–17", "Jul 20–24", "Jul 27–31"];
  const rows = weeks.map((w, wi) => {
    const days = [0, 1, 2, 3, 4].map((d) => {
      const base = 8 + ((seed + wi * 3 + d) % 3) - 1; // 7..9
      return base;
    });
    return { week: w, days, total: days.reduce((a, b) => a + b, 0) };
  });

  return (
    <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white">
      <div className="border-b border-zinc-100 px-4 py-2.5">
        <p className="text-sm font-semibold text-zinc-800">Timesheet — {employee.name}</p>
        <p className="text-xs text-zinc-400">Logged hours, July 2026</p>
      </div>
      <table className="w-full text-xs">
        <thead className="bg-zinc-50 text-[11px] uppercase text-zinc-500">
          <tr>
            <th className="px-3 py-2 text-left font-medium">Week</th>
            {["Mon", "Tue", "Wed", "Thu", "Fri"].map((d) => (
              <th key={d} className="px-3 py-2 text-center font-medium">{d}</th>
            ))}
            <th className="px-3 py-2 text-right font-medium">Total</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100">
          {rows.map((r) => (
            <tr key={r.week}>
              <td className="px-3 py-2 font-medium text-zinc-700">{r.week}</td>
              {r.days.map((h, i) => (
                <td key={i} className="px-3 py-2 text-center tabular-nums text-zinc-600">{h.toFixed(1)}</td>
              ))}
              <td className="px-3 py-2 text-right font-semibold tabular-nums text-zinc-900">{r.total.toFixed(1)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const reqCol = createColumnHelper<RequestRow>();
function RequestsTable({ requests, canApprove }: { requests: RequestRow[]; canApprove: boolean }) {
  const columns = useMemo<ColumnDef<RequestRow, any>[]>(
    () => [
      reqCol.accessor((r) => r.employeeName, {
        id: "emp",
        header: "Employee",
        cell: (c) => {
          const r = c.row.original;
          return (
            <div className="flex items-center gap-2">
              <Avatar initials={r.initials} seed={r.employeeName} size="xs" />
              <span className="font-medium text-zinc-800">{r.employeeName}</span>
            </div>
          );
        },
      }),
      reqCol.accessor((r) => r.type, { id: "type", header: "Type" }),
      reqCol.accessor((r) => r.start, { id: "dates", header: "Dates", cell: (c) => formatDateRange(c.row.original.start, c.row.original.end) }),
      reqCol.accessor((r) => r.days, { id: "days", header: "Days", cell: (c) => <span className="tabular-nums">{c.getValue() as number}</span> }),
      reqCol.accessor((r) => r.reason, { id: "reason", header: "Reason" }),
      reqCol.accessor((r) => r.status, { id: "status", header: "Status", cell: (c) => <Badge status={c.getValue() as string} /> }),
      ...(canApprove
        ? [
            reqCol.display({
              id: "actions",
              header: "",
              cell: (c) =>
                c.row.original.status === "Pending" ? (
                  <div className="flex gap-1">
                    <button className="rounded bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700 hover:bg-emerald-100">Approve</button>
                    <button className="rounded bg-rose-50 px-2 py-0.5 text-[11px] font-medium text-rose-700 hover:bg-rose-100">Deny</button>
                  </div>
                ) : null,
            }),
          ]
        : []),
    ],
    [canApprove]
  );
  return <DataTable columns={columns} data={requests} searchPlaceholder="Search leave requests…" />;
}
