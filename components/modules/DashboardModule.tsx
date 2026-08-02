"use client";

import {
  Users,
  Banknote,
  Briefcase,
  ShieldCheck,
  CalendarClock,
  Target,
  GraduationCap,
  TrendingUp,
  AlertTriangle,
} from "lucide-react";
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useWorkspace } from "@/lib/workspace";
import { visibleEmployees, ROLE_META } from "@/lib/rbac";
import { StatTile, SectionHeader, ProgressBar } from "@/components/ui/Misc";
import { Badge } from "@/components/ui/Badge";
import { formatCurrency } from "@/lib/format";
import type { Department } from "@/lib/types";

const DEPTS: Department[] = ["Engineering", "Sales", "Human Resources", "Marketing", "Executive"];
const PIE = ["#6366f1", "#0ea5e9", "#10b981", "#f59e0b", "#f43f5e", "#a855f7", "#64748b", "#14b8a6", "#eab308"];
const tip = { borderRadius: 8, border: "1px solid #e4e4e7", fontSize: 12 } as const;

export function DashboardModule() {
  const { role, currentUser, data } = useWorkspace();
  const scope = visibleEmployees(role, currentUser.id, data.employees);

  if (role === "employee") return <EmployeeDashboard />;

  const headcount = scope.length;
  const monthlyPayroll = scope.reduce((s, e) => s + e.comp.baseSalary / 12, 0);
  const openReqs = data.candidates.filter((c) => c.stage !== "Hired").length;
  const avgCompliance = Math.round(scope.reduce((s, e) => s + e.training.compliancePct, 0) / headcount);
  const pendingPto = scope.flatMap((e) => e.pto.requests).filter((r) => r.status === "Pending").length;

  const deptData = DEPTS.map((d) => ({ department: d.replace("Human Resources", "HR"), count: scope.filter((e) => e.department === d).length })).filter((d) => d.count);
  const nineBox = Array.from({ length: 9 }, (_, i) => ({ box: i + 1, count: scope.filter((e) => e.performance.nineBox === i + 1).length }));
  const flagged = data.auditLogs.filter((l) => l.status === "denied").slice(0, 5);

  return (
    <div>
      <SectionHeader
        title={role === "admin" ? "Company Overview" : "Team Overview"}
        description={`${ROLE_META[role].label} · ${ROLE_META[role].scope} · ${headcount} people in scope`}
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label={role === "admin" ? "Headcount" : "Team Size"} value={headcount} icon={Users} sub="Active in scope" />
        <StatTile label="Monthly Payroll" value={formatCurrency(monthlyPayroll, true)} icon={Banknote} tone="emerald" sub="Gross, in scope" />
        <StatTile label="Open Requisitions" value={openReqs} icon={Briefcase} tone="amber" sub="Across pipeline" />
        <StatTile label="Compliance Rate" value={`${avgCompliance}%`} icon={ShieldCheck} tone={avgCompliance > 85 ? "emerald" : "amber"} sub="Training completion" />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-lg border border-zinc-200 bg-white p-4 lg:col-span-2">
          <p className="mb-3 text-sm font-semibold text-zinc-800">Headcount by Department</p>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={deptData} margin={{ left: -22, right: 6, top: 4 }}>
                <XAxis dataKey="department" tick={{ fontSize: 11, fill: "#a1a1aa" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#a1a1aa" }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip contentStyle={tip} cursor={{ fill: "#f4f4f5" }} />
                <Bar dataKey="count" radius={[4, 4, 0, 0]} fill="#3f3f46" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-lg border border-zinc-200 bg-white p-4">
          <p className="mb-3 text-sm font-semibold text-zinc-800">9-Box Distribution</p>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={nineBox.filter((n) => n.count)} dataKey="count" nameKey="box" innerRadius={40} outerRadius={80} paddingAngle={2}>
                  {nineBox.filter((n) => n.count).map((_, i) => (
                    <Cell key={i} fill={PIE[i % PIE.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tip} formatter={(v: number, _n, p) => [`${v} people`, `Box ${p.payload.box}`]} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-lg border border-zinc-200 bg-white">
          <div className="flex items-center justify-between border-b border-zinc-100 px-4 py-2.5">
            <p className="text-sm font-semibold text-zinc-800">Pending Approvals</p>
            <Badge tone="amber">{pendingPto} PTO requests</Badge>
          </div>
          <div className="p-4">
            <div className="flex items-center gap-2 text-sm text-zinc-600">
              <CalendarClock size={16} className="text-amber-500" />
              {pendingPto} time-off requests awaiting review
            </div>
            <div className="mt-3 flex items-center gap-2 text-sm text-zinc-600">
              <TrendingUp size={16} className="text-emerald-500" />
              {data.expenses.filter((e) => e.status === "Pending").length} expense reimbursements pending
            </div>
          </div>
        </div>

        {role === "admin" && (
          <div className="rounded-lg border border-zinc-200 bg-white">
            <div className="flex items-center justify-between border-b border-zinc-100 px-4 py-2.5">
              <p className="text-sm font-semibold text-zinc-800">Security Flags</p>
              <Badge tone="rose">{flagged.length} denied</Badge>
            </div>
            <ul className="divide-y divide-zinc-50">
              {flagged.map((f) => (
                <li key={f.id} className="flex items-center gap-2 px-4 py-2 text-xs">
                  <AlertTriangle size={14} className="shrink-0 text-rose-500" />
                  <span className="text-zinc-600">{f.actor} — {f.action}</span>
                  <span className="ml-auto font-mono text-zinc-400">{f.timestamp.slice(5, 16)}</span>
                </li>
              ))}
              {flagged.length === 0 && <li className="px-4 py-6 text-center text-xs text-zinc-400">No flagged access.</li>}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

function EmployeeDashboard() {
  const { currentUser } = useWorkspace();
  const p = currentUser.pto;
  const latest = currentUser.paystubs[currentUser.paystubs.length - 1];

  return (
    <div>
      <SectionHeader title={`Welcome, ${currentUser.firstName}`} description="Your personal HR overview (self-service access)." />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Vacation Left" value={`${p.vacationTotal - p.vacationUsed}d`} icon={CalendarClock} tone="accent" sub={`of ${p.vacationTotal} days`} />
        <StatTile label="Sick Days Left" value={`${p.sickTotal - p.sickUsed}d`} icon={CalendarClock} tone="emerald" sub={`of ${p.sickTotal} days`} />
        <StatTile label="Next Net Pay" value={formatCurrency(latest.net)} icon={Banknote} tone="emerald" sub={latest.period} />
        <StatTile label="Training" value={`${currentUser.training.compliancePct}%`} icon={GraduationCap} tone={currentUser.training.compliancePct > 85 ? "emerald" : "amber"} sub="Compliance complete" />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-lg border border-zinc-200 bg-white">
          <div className="flex items-center gap-2 border-b border-zinc-100 px-4 py-2.5">
            <Target size={15} className="text-accent-600" />
            <p className="text-sm font-semibold text-zinc-800">My Goals</p>
          </div>
          <ul className="divide-y divide-zinc-50">
            {currentUser.performance.goals.map((g) => (
              <li key={g.id} className="px-4 py-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-zinc-800">{g.objective}</p>
                  <Badge status={g.status} />
                </div>
                <p className="mb-1.5 text-xs text-zinc-400">{g.keyResult}</p>
                <ProgressBar value={g.progress} tone={g.progress > 65 ? "emerald" : g.progress > 40 ? "amber" : "rose"} />
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-lg border border-zinc-200 bg-white">
          <div className="flex items-center gap-2 border-b border-zinc-100 px-4 py-2.5">
            <GraduationCap size={15} className="text-accent-600" />
            <p className="text-sm font-semibold text-zinc-800">Training & Compliance</p>
          </div>
          <ul className="divide-y divide-zinc-50">
            {currentUser.training.courses.map((c) => (
              <li key={c.name} className="flex items-center justify-between px-4 py-2.5 text-sm">
                <span className="text-zinc-700">{c.name}</span>
                <Badge status={c.status} />
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
