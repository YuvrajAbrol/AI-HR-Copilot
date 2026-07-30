"use client";

import {
  LayoutDashboard,
  Users2,
  CalendarCheck2,
  Wallet,
  TrendingUp,
  Lock,
} from "lucide-react";
import {
  Area,
  AreaChart,
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
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardHeader } from "@/components/ui/Card";
import { EmployeeCard } from "./EmployeeCard";
import { useWorkspace } from "@/lib/store";
import {
  DEPARTMENT_HEADCOUNT,
  EMPLOYEES,
  PAYROLL_DISTRIBUTION,
  PTO_TREND,
} from "@/lib/mockData";
import { formatCurrency } from "@/lib/format";

const PIE_COLORS = ["#818cf8", "#4f46e5", "#6366f1", "#3730a3"];

function KpiTile({
  icon: Icon,
  label,
  value,
  delta,
  accent,
}: {
  icon: typeof Users2;
  label: string;
  value: string;
  delta?: string;
  accent: string;
}) {
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-slate-500">{label}</p>
          <p className="mt-1.5 text-2xl font-bold tracking-tight text-slate-900">{value}</p>
          {delta && (
            <p className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-emerald-600">
              <TrendingUp size={12} /> {delta}
            </p>
          )}
        </div>
        <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${accent}`}>
          <Icon size={20} />
        </span>
      </div>
    </Card>
  );
}

export function ExecutiveDashboard() {
  const { roleProfile } = useWorkspace();
  const totalHeadcount = DEPARTMENT_HEADCOUNT.reduce((s, d) => s + d.headcount, 0);
  const openReqs = DEPARTMENT_HEADCOUNT.reduce((s, d) => s + d.openReqs, 0);
  const totalPayroll = PAYROLL_DISTRIBUTION.reduce((s, d) => s + d.totalCost, 0);
  const spotlight = EMPLOYEES.slice(0, 2);

  return (
    <div>
      <PageHeader
        icon={LayoutDashboard}
        title="Executive HR Dashboard"
        description="Workforce insights across headcount, time off, and compensation."
      />

      {/* KPI tiles */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiTile icon={Users2} label="Total Headcount" value={String(totalHeadcount)} delta="+12 QoQ" accent="bg-brand-50 text-brand-600" />
        <KpiTile icon={CalendarCheck2} label="PTO Approved (Aug)" value="664 hrs" delta="+8% MoM" accent="bg-sky-50 text-sky-600" />
        <KpiTile icon={Users2} label="Open Requisitions" value={String(openReqs)} accent="bg-amber-50 text-amber-600" />
        <KpiTile
          icon={roleProfile.canViewPayroll ? Wallet : Lock}
          label="Monthly Payroll"
          value={roleProfile.canViewPayroll ? formatCurrency(totalPayroll, true) : "•••••"}
          accent="bg-emerald-50 text-emerald-600"
        />
      </div>

      {/* Charts */}
      <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="PTO Trends" subtitle="Requested vs. approved hours" icon={CalendarCheck2} />
          <div className="h-64 p-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={PTO_TREND} margin={{ left: -20, right: 8, top: 8 }}>
                <defs>
                  <linearGradient id="req" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#818cf8" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#818cf8" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="app" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#4f46e5" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="#4f46e5" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Area type="monotone" dataKey="requested" stroke="#818cf8" strokeWidth={2} fill="url(#req)" />
                <Area type="monotone" dataKey="approved" stroke="#4f46e5" strokeWidth={2} fill="url(#app)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <CardHeader title="Payroll Distribution" subtitle="By compensation band" icon={Wallet} />
          <div className="h-64 p-4">
            {roleProfile.canViewPayroll ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={PAYROLL_DISTRIBUTION}
                    dataKey="employees"
                    nameKey="band"
                    innerRadius={45}
                    outerRadius={80}
                    paddingAngle={2}
                  >
                    {PAYROLL_DISTRIBUTION.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-sm text-slate-400">
                <Lock size={28} className="text-slate-300" />
                <p>Payroll analytics are masked for RBAC Level 2.</p>
              </div>
            )}
          </div>
        </Card>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Department Headcount" subtitle="Active employees by team" icon={Users2} />
          <div className="h-56 p-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={DEPARTMENT_HEADCOUNT} margin={{ left: -20, right: 8, top: 8 }}>
                <XAxis dataKey="department" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} interval={0} />
                <YAxis tick={{ fontSize: 12, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "#f1f5f9" }} />
                <Bar dataKey="headcount" radius={[6, 6, 0, 0]} fill="#4f46e5" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <div className="space-y-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Employee spotlight</p>
          {spotlight.map((e) => (
            <EmployeeCard key={e.id} employee={e} />
          ))}
        </div>
      </div>
    </div>
  );
}

const tooltipStyle = {
  borderRadius: 10,
  border: "1px solid #e2e8f0",
  fontSize: 12,
  boxShadow: "0 4px 12px rgba(15,23,42,0.08)",
} as const;
