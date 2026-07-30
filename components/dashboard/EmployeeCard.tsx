"use client";

import { CalendarClock, UserRound, Wallet, Plane } from "lucide-react";
import { motion } from "framer-motion";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { useWorkspace } from "@/lib/store";
import { formatCurrency, formatDate, formatDateRange, hoursToDays, maskValue } from "@/lib/format";
import type { Employee } from "@/lib/types";

function Stat({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: typeof UserRound;
  label: string;
  value: string;
  accent: string;
}) {
  return (
    <div className="rounded-lg border border-slate-100 bg-slate-50/70 p-3">
      <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-slate-400">
        <Icon size={13} className={accent} /> {label}
      </div>
      <p className="mt-1 text-sm font-semibold text-slate-900">{value}</p>
    </div>
  );
}

export function EmployeeCard({ employee, highlight = false }: { employee: Employee; highlight?: boolean }) {
  const { roleProfile, focusEmployee } = useWorkspace();
  const ptoPct = Math.round((employee.ptoRemainingHours / employee.ptoAccruedHours) * 100);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className={`rounded-xl border bg-white p-4 shadow-sm transition-shadow hover:shadow-md ${
        highlight ? "border-brand-300 ring-2 ring-brand-100" : "border-slate-200"
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Avatar initials={employee.initials} name={employee.name} size="lg" />
          <div>
            <p className="font-semibold text-slate-900">{employee.name}</p>
            <p className="text-sm text-slate-500">{employee.title}</p>
            <p className="text-xs text-slate-400">
              {employee.department} · ID {employee.id}
            </p>
          </div>
        </div>
        <Badge status={employee.status} />
      </div>

      {/* PTO bar */}
      <div className="mt-4">
        <div className="mb-1 flex items-center justify-between text-xs">
          <span className="font-medium text-slate-600">PTO Remaining</span>
          <span className="text-slate-500">
            <span className="font-semibold text-slate-800">{employee.ptoRemainingHours} hrs</span> ·{" "}
            {hoursToDays(employee.ptoRemainingHours)}
          </span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
          <div className="h-full rounded-full bg-brand-500" style={{ width: `${ptoPct}%` }} />
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2.5">
        <Stat
          icon={Plane}
          label="Upcoming Leave"
          value={
            employee.upcomingLeave
              ? `${employee.upcomingLeave.type} · ${formatDateRange(employee.upcomingLeave.start, employee.upcomingLeave.end)}`
              : "None scheduled"
          }
          accent="text-sky-500"
        />
        <Stat icon={UserRound} label="Manager" value={employee.managerName} accent="text-violet-500" />
        <Stat
          icon={CalendarClock}
          label="Next Payday"
          value={formatDate(employee.nextPayday)}
          accent="text-emerald-500"
        />
        <Stat
          icon={Wallet}
          label="Annual Salary"
          value={maskValue(formatCurrency(employee.annualSalary), roleProfile.canViewPayroll)}
          accent="text-amber-500"
        />
      </div>

      {!highlight && (
        <button
          type="button"
          onClick={() => focusEmployee(employee.id)}
          className="mt-4 w-full rounded-lg border border-slate-200 py-2 text-sm font-medium text-slate-600 transition-colors hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700"
        >
          View full profile
        </button>
      )}
    </motion.div>
  );
}
