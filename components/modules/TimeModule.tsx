"use client";

import { useCallback, useMemo, useState } from "react";
import { createColumnHelper, type ColumnDef } from "@tanstack/react-table";
import { CalendarClock, Plane, ChevronLeft, ChevronRight, Search, Send, Check, X } from "lucide-react";
import { useWorkspace } from "@/lib/workspace";
import { visibleEmployees, ROLE_META } from "@/lib/rbac";
import { DataTable } from "@/components/ui/DataTable";
import { Tabs } from "@/components/ui/Tabs";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { Tooltip } from "@/components/ui/Tooltip";
import { Button } from "@/components/ui/Button";
import { StatTile, SectionHeader } from "@/components/ui/Misc";
import { formatDate, formatDateRange } from "@/lib/format";
import type { Employee, PtoRequest, RequestStatus, Timesheet } from "@/lib/types";

interface RequestRow extends PtoRequest {
  employeeName: string;
  initials: string;
}
interface LeaveEvent {
  employee: Employee;
  type: PtoRequest["type"];
  start: string;
  end: string;
}

const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export function TimeModule() {
  const { role, currentUser, data } = useWorkspace();
  const [tab, setTab] = useState("calendar");

  const scope = useMemo(
    () => visibleEmployees(role, currentUser.id, data.employees),
    [role, currentUser.id, data.employees]
  );
  const requests: RequestRow[] = useMemo(
    () => scope.flatMap((e) => e.pto.requests.map((r) => ({ ...r, employeeName: e.name, initials: e.initials }))),
    [scope]
  );
  const pending = requests.filter((r) => r.status === "Pending").length;

  const canApprove = role !== "employee";
  const tabs = [
    { id: "calendar", label: "Company Calendar" },
    { id: "mytimesheet", label: "My Timesheet" },
    ...(canApprove ? [{ id: "approvals", label: "Timesheet Approvals" }] : []),
    { id: "requests", label: "Leave Requests", count: requests.length },
  ];

  return (
    <div>
      <SectionHeader title="Time & Attendance" description={`${ROLE_META[role].label} · ${ROLE_META[role].scope}`} />

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="In Scope" value={scope.length} icon={CalendarClock} />
        <StatTile label="Pending Leave" value={pending} tone="amber" />
        <StatTile label="Approved Leave" value={requests.filter((r) => r.status === "Approved").length} icon={Plane} tone="accent" />
        <StatTile label="My Vacation Left" value={`${currentUser.pto.vacationTotal - currentUser.pto.vacationUsed}d`} tone="emerald" />
      </div>

      <div className="mb-4">
        <Tabs active={tab} onChange={setTab} tabs={tabs} />
      </div>

      {tab === "calendar" && <LeaveCalendar scope={scope} holidays={data.holidays} />}
      {tab === "mytimesheet" && <MyTimesheet employee={currentUser} />}
      {tab === "approvals" && canApprove && <TimesheetApprovals scope={scope} all={data.timesheets} />}
      {tab === "requests" && <RequestsTable requests={requests} canApprove={canApprove} />}
    </div>
  );
}

// --------------------------- Calendar --------------------------------------
function LeaveCalendar({ scope, holidays }: { scope: Employee[]; holidays: { date: string; name: string }[] }) {
  const [cursor, setCursor] = useState({ year: 2026, month: 7 }); // August 2026
  const [search, setSearch] = useState("");

  const holidayMap = useMemo(() => new Map(holidays.map((h) => [h.date, h.name])), [holidays]);

  const term = search.trim().toLowerCase();

  // All approved leave events for matching employees (used for cross-month search).
  const allEvents: LeaveEvent[] = useMemo(
    () =>
      scope
        .filter((e) => !term || e.name.toLowerCase().includes(term) || e.department.toLowerCase().includes(term))
        .flatMap((e) => e.pto.requests.filter((r) => r.status === "Approved").map((r) => ({ employee: e, type: r.type, start: r.start, end: r.end })))
        .sort((a, b) => (a.start < b.start ? -1 : 1)),
    [scope, term]
  );

  const first = new Date(cursor.year, cursor.month, 1);
  const startPad = first.getDay();
  const daysInMonth = new Date(cursor.year, cursor.month + 1, 0).getDate();

  const outByDay = (dateStr: string) =>
    allEvents.filter((ev) => ev.start <= dateStr && ev.end >= dateStr);

  const cells: (number | null)[] = [
    ...Array.from({ length: startPad }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const shift = (delta: number) => {
    setCursor((c) => {
      const d = new Date(c.year, c.month + delta, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });
  };
  const jumpTo = (dateStr: string) => {
    const d = new Date(dateStr + "T00:00:00");
    setCursor({ year: d.getFullYear(), month: d.getMonth() });
  };

  const mm = String(cursor.month + 1).padStart(2, "0");

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_260px]">
      <div className="rounded-lg border border-zinc-200 bg-white p-4">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-semibold text-zinc-800">
            {MONTH_NAMES[cursor.month]} {cursor.year} — Company Leave
          </p>
          <div className="flex items-center gap-1">
            <button onClick={() => shift(-1)} className="flex h-7 items-center gap-1 rounded-md border border-zinc-200 px-2 text-xs text-zinc-600 hover:bg-zinc-50">
              <ChevronLeft size={14} /> Prev
            </button>
            <button onClick={() => setCursor({ year: 2026, month: 7 })} className="h-7 rounded-md border border-zinc-200 px-2 text-xs text-zinc-600 hover:bg-zinc-50">
              Today
            </button>
            <button onClick={() => shift(1)} className="flex h-7 items-center gap-1 rounded-md border border-zinc-200 px-2 text-xs text-zinc-600 hover:bg-zinc-50">
              Next <ChevronRight size={14} />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-1">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
            <div key={d} className="pb-1 text-center text-[11px] font-medium uppercase tracking-wide text-zinc-400">
              {d}
            </div>
          ))}
          {cells.map((day, i) => {
            if (day === null) return <div key={`p${i}`} className="min-h-[80px] rounded-md bg-zinc-50/50" />;
            const dateStr = `${cursor.year}-${mm}-${String(day).padStart(2, "0")}`;
            const out = outByDay(dateStr);
            const holiday = holidayMap.get(dateStr);
            const weekend = new Date(cursor.year, cursor.month, day).getDay() % 6 === 0;
            return (
              <div key={day} className={`min-h-[80px] rounded-md border border-zinc-100 p-1.5 ${weekend ? "bg-zinc-50/60" : "bg-white"}`}>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-medium text-zinc-500">{day}</span>
                  {holiday && <span className="h-1.5 w-1.5 rounded-full bg-rose-400" title={holiday} />}
                </div>
                {holiday && <p className="mt-0.5 truncate text-[9px] text-rose-500">{holiday}</p>}
                <div className="mt-1 flex flex-wrap gap-0.5">
                  {out.slice(0, 4).map((ev, idx) => (
                    <Tooltip key={`${ev.employee.id}-${idx}`} content={<LeaveHoverCard ev={ev} />}>
                      <Avatar initials={ev.employee.initials} seed={ev.employee.name} name={ev.employee.name} size="xs" />
                    </Tooltip>
                  ))}
                  {out.length > 4 && (
                    <span className="flex h-6 items-center rounded bg-zinc-100 px-1 text-[9px] font-medium text-zinc-500">+{out.length - 4}</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-3 flex items-center gap-4 text-[11px] text-zinc-400">
          <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-rose-400" /> Holiday</span>
          <span>Hover an avatar for leave details</span>
        </div>
      </div>

      {/* Search / cross-month event list */}
      <div className="rounded-lg border border-zinc-200 bg-white p-3">
        <div className="relative mb-2">
          <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter by name or department…"
            className="h-8 w-full rounded-md border border-zinc-200 bg-zinc-50 pl-8 pr-3 text-xs text-zinc-700 outline-none focus:border-accent-400 focus:bg-white focus:ring-2 focus:ring-accent-100"
          />
        </div>
        <p className="mb-1.5 px-0.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-400">
          {term ? `Matches across all months (${allEvents.length})` : `Upcoming leave (${allEvents.length})`}
        </p>
        <div className="max-h-[420px] space-y-1 overflow-y-auto">
          {allEvents.map((ev, i) => (
            <button
              key={`${ev.employee.id}-${i}`}
              onClick={() => jumpTo(ev.start)}
              className="flex w-full items-center gap-2 rounded-md border border-zinc-100 px-2 py-1.5 text-left transition-colors hover:border-accent-200 hover:bg-accent-50/40"
            >
              <Avatar initials={ev.employee.initials} seed={ev.employee.name} name={ev.employee.name} size="xs" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-xs font-medium text-zinc-700">{ev.employee.name}</span>
                <span className="block truncate text-[10px] text-zinc-400">{ev.type} · {formatDateRange(ev.start, ev.end)}</span>
              </span>
            </button>
          ))}
          {allEvents.length === 0 && <p className="px-1 py-6 text-center text-xs text-zinc-400">No matching leave.</p>}
        </div>
      </div>
    </div>
  );
}

function LeaveHoverCard({ ev }: { ev: LeaveEvent }) {
  return (
    <span className="block">
      <span className="flex items-center gap-2">
        <Avatar initials={ev.employee.initials} seed={ev.employee.name} size="sm" />
        <span className="block">
          <span className="block text-xs font-semibold text-zinc-900">{ev.employee.name}</span>
          <span className="block text-[11px] text-zinc-500">{ev.employee.title}</span>
        </span>
      </span>
      <span className="mt-1.5 block border-t border-zinc-100 pt-1.5 text-[11px]">
        <span className="block text-zinc-500">Leave · <span className="font-medium text-zinc-700">{ev.type}</span></span>
        <span className="block text-zinc-500">Dates · <span className="text-zinc-700">{formatDateRange(ev.start, ev.end)}</span></span>
      </span>
    </span>
  );
}

// --------------------------- My Timesheet ----------------------------------
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"];
type Cat = "regular" | "overtime" | "pto";

function MyTimesheet({ employee }: { employee: Employee }) {
  const seed = employee.id.charCodeAt(4) + employee.id.charCodeAt(5);
  const initial: Record<Cat, number[]> = {
    regular: DAYS.map((_, d) => 8 + ((seed + d) % 2)),
    overtime: DAYS.map((_, d) => ((seed + d) % 5 === 0 ? 2 : 0)),
    pto: DAYS.map(() => 0),
  };
  const [hours, setHours] = useState<Record<Cat, number[]>>(initial);
  const [status, setStatus] = useState<RequestStatus | "Draft">("Draft");

  const setCell = (cat: Cat, day: number, val: string) => {
    const n = Math.max(0, Math.min(24, Number(val) || 0));
    setHours((h) => ({ ...h, [cat]: h[cat].map((v, i) => (i === day ? n : v)) }));
    setStatus("Draft");
  };

  const catTotal = (cat: Cat) => hours[cat].reduce((a, b) => a + b, 0);
  const dayTotal = (day: number) => (["regular", "overtime", "pto"] as Cat[]).reduce((a, c) => a + hours[c][day], 0);
  const grand = (["regular", "overtime", "pto"] as Cat[]).reduce((a, c) => a + catTotal(c), 0);

  const catLabel: Record<Cat, string> = { regular: "Regular", overtime: "Overtime", pto: "PTO" };

  return (
    <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white">
      <div className="flex items-center justify-between border-b border-zinc-100 px-4 py-2.5">
        <div>
          <p className="text-sm font-semibold text-zinc-800">My Timesheet — Week of Jul 27, 2026</p>
          <p className="text-xs text-zinc-400">Enter daily hours and submit for manager approval.</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge status={status === "Draft" ? "Not Started" : status}>{status === "Draft" ? "Draft" : status}</Badge>
          <Button
            size="sm"
            variant={status === "Pending" ? "secondary" : "primary"}
            disabled={status === "Pending"}
            onClick={() => setStatus("Pending")}
          >
            <Send size={13} /> {status === "Pending" ? "Submitted" : "Submit for Approval"}
          </Button>
        </div>
      </div>
      <table className="w-full text-xs">
        <thead className="bg-zinc-50 text-[11px] uppercase text-zinc-500">
          <tr>
            <th className="px-3 py-2 text-left font-medium">Category</th>
            {DAYS.map((d) => (
              <th key={d} className="px-2 py-2 text-center font-medium">{d}</th>
            ))}
            <th className="px-3 py-2 text-right font-medium">Total</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100">
          {(["regular", "overtime", "pto"] as Cat[]).map((cat) => (
            <tr key={cat}>
              <td className="px-3 py-2 font-medium text-zinc-700">{catLabel[cat]}</td>
              {DAYS.map((_, d) => (
                <td key={d} className="px-2 py-1.5 text-center">
                  <input
                    type="number"
                    min={0}
                    max={24}
                    value={hours[cat][d]}
                    onChange={(e) => setCell(cat, d, e.target.value)}
                    className="h-7 w-12 rounded border border-zinc-200 bg-white text-center tabular-nums text-zinc-700 outline-none focus:border-accent-400 focus:ring-2 focus:ring-accent-100"
                  />
                </td>
              ))}
              <td className="px-3 py-2 text-right font-semibold tabular-nums text-zinc-900">{catTotal(cat).toFixed(1)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t border-zinc-200 bg-zinc-50">
            <td className="px-3 py-2 font-semibold text-zinc-700">Daily Total</td>
            {DAYS.map((_, d) => (
              <td key={d} className="px-2 py-2 text-center font-semibold tabular-nums text-zinc-700">{dayTotal(d).toFixed(1)}</td>
            ))}
            <td className="px-3 py-2 text-right font-bold tabular-nums text-zinc-900">{grand.toFixed(1)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

// --------------------------- Approvals -------------------------------------
const tsCol = createColumnHelper<Timesheet>();
function TimesheetApprovals({ scope, all }: { scope: Employee[]; all: Timesheet[] }) {
  const scopeIds = useMemo(() => new Set(scope.map((e) => e.id)), [scope]);
  const [sheets, setSheets] = useState<Timesheet[]>(() => all.filter((t) => scopeIds.has(t.employeeId)));

  const setStatus = useCallback(
    (id: string, status: RequestStatus) => setSheets((prev) => prev.map((t) => (t.id === id ? { ...t, status } : t))),
    []
  );

  const columns = useMemo<ColumnDef<Timesheet, any>[]>(
    () => [
      tsCol.accessor((t) => t.employeeName, {
        id: "emp",
        header: "Employee",
        cell: (c) => (
          <div className="flex items-center gap-2">
            <Avatar initials={c.row.original.initials} seed={c.row.original.employeeName} name={c.row.original.employeeName} size="xs" />
            <div>
              <p className="font-medium text-zinc-800">{c.row.original.employeeName}</p>
              <p className="text-[11px] text-zinc-400">{c.row.original.department}</p>
            </div>
          </div>
        ),
      }),
      tsCol.accessor((t) => t.weekOf, { id: "week", header: "Week Of", cell: (c) => formatDate(c.getValue() as string) }),
      tsCol.accessor((t) => t.regular, { id: "reg", header: "Regular", cell: (c) => <span className="tabular-nums">{(c.getValue() as number).toFixed(1)}</span> }),
      tsCol.accessor((t) => t.overtime, { id: "ot", header: "Overtime", cell: (c) => <span className="tabular-nums text-amber-600">{(c.getValue() as number).toFixed(1)}</span> }),
      tsCol.accessor((t) => t.pto, { id: "pto", header: "PTO", cell: (c) => <span className="tabular-nums">{(c.getValue() as number).toFixed(1)}</span> }),
      tsCol.accessor((t) => t.total, { id: "total", header: "Total", cell: (c) => <span className="font-semibold tabular-nums text-zinc-900">{(c.getValue() as number).toFixed(1)}</span> }),
      tsCol.accessor((t) => t.status, { id: "status", header: "Status", cell: (c) => <Badge status={c.getValue() as string} /> }),
      tsCol.display({
        id: "actions",
        header: "",
        cell: (c) =>
          c.row.original.status === "Pending" ? (
            <div className="flex gap-1">
              <button
                onClick={() => setStatus(c.row.original.id, "Approved")}
                className="inline-flex items-center gap-1 rounded bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700 hover:bg-emerald-100"
              >
                <Check size={11} /> Approve
              </button>
              <button
                onClick={() => setStatus(c.row.original.id, "Rejected")}
                className="inline-flex items-center gap-1 rounded bg-rose-50 px-2 py-0.5 text-[11px] font-medium text-rose-700 hover:bg-rose-100"
              >
                <X size={11} /> Reject
              </button>
            </div>
          ) : (
            <span className="text-[11px] text-zinc-300">—</span>
          ),
      }),
    ],
    [setStatus]
  );

  return <DataTable columns={columns} data={sheets} searchPlaceholder="Search submitted timesheets…" pageSize={12} />;
}

// --------------------------- Leave Requests --------------------------------
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
              <Avatar initials={r.initials} seed={r.employeeName} name={r.employeeName} size="xs" />
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
