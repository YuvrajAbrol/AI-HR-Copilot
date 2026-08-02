"use client";

import { useState } from "react";
import {
  Mail,
  Phone,
  MapPin,
  Calendar,
  Building2,
  BadgeCheck,
  Lock,
  FileText,
  Download,
  TrendingUp,
} from "lucide-react";
import { useWorkspace } from "@/lib/workspace";
import { canViewCompensation, canViewPII, canEditRecords } from "@/lib/rbac";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Tabs } from "@/components/ui/Tabs";
import { ProgressBar } from "@/components/ui/Misc";
import { formatCurrency, formatDate, formatDateRange, mask } from "@/lib/format";
import type { Employee } from "@/lib/types";

export function EmployeeSlideOver({ employee }: { employee: Employee }) {
  const { role, currentUser, data } = useWorkspace();
  const [tab, setTab] = useState("profile");

  const canComp = canViewCompensation(role, currentUser.id, employee.id, data.employees);
  const canPII = canViewPII(role, currentUser.id, employee.id, data.employees);
  const manager = data.employees.find((e) => e.id === employee.managerId);

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b border-zinc-200 px-5 pb-4 pt-5">
        <div className="flex items-start gap-3 pr-8">
          <Avatar initials={employee.initials} seed={employee.name} size="lg" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h2 className="truncate text-base font-semibold text-zinc-900">{employee.name}</h2>
              <Badge status={employee.status} />
            </div>
            <p className="text-sm text-zinc-500">{employee.title}</p>
            <p className="text-xs text-zinc-400">
              {employee.employeeId} · {employee.department} · {employee.level}
            </p>
          </div>
          {canEditRecords(role) && (
            <Button size="sm" variant="secondary">
              Edit
            </Button>
          )}
        </div>
      </div>

      <div className="px-5 pt-3">
        <Tabs
          active={tab}
          onChange={setTab}
          tabs={[
            { id: "profile", label: "Profile" },
            { id: "comp", label: "Compensation" },
            { id: "time", label: "Time Off" },
            { id: "perf", label: "Performance" },
            { id: "docs", label: "Documents", count: employee.documents.length },
          ]}
        />
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4">
        {tab === "profile" && (
          <div className="space-y-4">
            <Grid>
              <Info icon={Mail} label="Email" value={mask(employee.email, canPII)} />
              <Info icon={Phone} label="Phone" value={mask(employee.phone, canPII)} />
              <Info icon={MapPin} label="Location" value={employee.location} />
              <Info icon={Building2} label="Team" value={employee.team} />
              <Info icon={Calendar} label="Start Date" value={formatDate(employee.startDate)} />
              <Info icon={BadgeCheck} label="Tenure" value={`${employee.tenureYears} yrs`} />
              <Info icon={Calendar} label="Date of Birth" value={mask(formatDate(employee.dob), canPII)} />
              <Info icon={MapPin} label="Address" value={mask(employee.address, canPII)} />
            </Grid>
            <div className="rounded-lg border border-zinc-200 p-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">Reporting Line</p>
              <p className="mt-1 text-sm text-zinc-700">
                Reports to <span className="font-medium">{manager ? manager.name : "Board of Directors"}</span>
                {manager && <span className="text-zinc-400"> · {manager.title}</span>}
              </p>
            </div>
          </div>
        )}

        {tab === "comp" &&
          (canComp ? (
            <div className="space-y-4">
              <Grid>
                <Info icon={TrendingUp} label="Base Salary" value={formatCurrency(employee.comp.baseSalary)} />
                <Info icon={TrendingUp} label="Bonus Target" value={formatCurrency(employee.comp.bonusTarget)} />
                <Info icon={TrendingUp} label="Equity Units" value={employee.comp.equityUnits.toLocaleString()} />
                <Info icon={TrendingUp} label="Total Target" value={formatCurrency(employee.comp.baseSalary + employee.comp.bonusTarget)} />
              </Grid>
              <div>
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-zinc-400">Compensation History</p>
                <div className="overflow-hidden rounded-lg border border-zinc-200">
                  <table className="w-full text-xs">
                    <thead className="bg-zinc-50 text-[11px] uppercase text-zinc-500">
                      <tr>
                        <th className="px-3 py-1.5 text-left font-medium">Effective</th>
                        <th className="px-3 py-1.5 text-left font-medium">Base Salary</th>
                        <th className="px-3 py-1.5 text-left font-medium">Reason</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100">
                      {employee.comp.history.map((h, i) => (
                        <tr key={i}>
                          <td className="px-3 py-1.5 tabular-nums text-zinc-600">{formatDate(h.effectiveDate)}</td>
                          <td className="px-3 py-1.5 tabular-nums font-medium text-zinc-800">{formatCurrency(h.baseSalary)}</td>
                          <td className="px-3 py-1.5 text-zinc-500">{h.reason}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            <RestrictedPanel label="Compensation" />
          ))}

        {tab === "time" && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-2">
              <PtoTile label="Vacation" used={employee.pto.vacationUsed} total={employee.pto.vacationTotal} />
              <PtoTile label="Sick" used={employee.pto.sickUsed} total={employee.pto.sickTotal} />
              <PtoTile label="Personal" used={employee.pto.personalUsed} total={employee.pto.personalTotal} />
            </div>
            <div>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-zinc-400">Requests</p>
              <div className="overflow-hidden rounded-lg border border-zinc-200">
                <table className="w-full text-xs">
                  <thead className="bg-zinc-50 text-[11px] uppercase text-zinc-500">
                    <tr>
                      <th className="px-3 py-1.5 text-left font-medium">Type</th>
                      <th className="px-3 py-1.5 text-left font-medium">Dates</th>
                      <th className="px-3 py-1.5 text-left font-medium">Days</th>
                      <th className="px-3 py-1.5 text-left font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {employee.pto.requests.map((r) => (
                      <tr key={r.id}>
                        <td className="px-3 py-1.5 text-zinc-700">{r.type}</td>
                        <td className="px-3 py-1.5 text-zinc-600">{formatDateRange(r.start, r.end)}</td>
                        <td className="px-3 py-1.5 tabular-nums text-zinc-600">{r.days}</td>
                        <td className="px-3 py-1.5">
                          <Badge status={r.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {tab === "perf" && (
          <div className="space-y-4">
            <Grid>
              <Info icon={TrendingUp} label="Rating" value={`${employee.performance.rating} / 5`} />
              <Info icon={TrendingUp} label="Potential" value={employee.performance.potential} />
              <Info icon={TrendingUp} label="9-Box" value={`Box ${employee.performance.nineBox}`} />
              <Info icon={Calendar} label="Last Review" value={formatDate(employee.performance.lastReview)} />
            </Grid>
            <div>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-zinc-400">Goals & OKRs</p>
              <div className="space-y-2">
                {employee.performance.goals.map((g) => (
                  <div key={g.id} className="rounded-lg border border-zinc-200 p-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-zinc-800">{g.objective}</p>
                      <Badge status={g.status} />
                    </div>
                    <p className="mb-1.5 text-xs text-zinc-400">{g.keyResult}</p>
                    <div className="flex items-center gap-2">
                      <ProgressBar value={g.progress} tone={g.progress > 65 ? "emerald" : g.progress > 40 ? "amber" : "rose"} />
                      <span className="text-xs tabular-nums text-zinc-500">{g.progress}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {tab === "docs" && (
          <ul className="space-y-2">
            {employee.documents.map((d) => (
              <li key={d.name} className="flex items-center gap-3 rounded-lg border border-zinc-200 px-3 py-2">
                <FileText size={16} className="text-zinc-400" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-zinc-700">{d.name}</p>
                  <p className="text-xs text-zinc-400">
                    {d.type} · {d.size} · {formatDate(d.uploaded)}
                  </p>
                </div>
                <button className="flex h-7 w-7 items-center justify-center rounded-md text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700">
                  <Download size={15} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-3">{children}</div>;
}

function Info({ icon: Icon, label, value }: { icon: typeof Mail; label: string; value: string }) {
  return (
    <div className="rounded-lg border border-zinc-200 p-2.5">
      <p className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-zinc-400">
        <Icon size={12} /> {label}
      </p>
      <p className="mt-0.5 truncate text-sm text-zinc-800">{value}</p>
    </div>
  );
}

function PtoTile({ label, used, total }: { label: string; used: number; total: number }) {
  const left = total - used;
  return (
    <div className="rounded-lg border border-zinc-200 p-3 text-center">
      <p className="text-xl font-semibold tabular-nums text-zinc-900">{left}</p>
      <p className="text-[11px] text-zinc-400">{label} left / {total}</p>
    </div>
  );
}

function RestrictedPanel({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-zinc-300 bg-zinc-50 py-12 text-center">
      <Lock size={22} className="text-zinc-400" />
      <p className="text-sm font-medium text-zinc-600">{label} is restricted</p>
      <p className="max-w-xs text-xs text-zinc-400">
        Your current role isn&apos;t cleared to view this employee&apos;s {label.toLowerCase()}. Switch to HR Administrator to unlock.
      </p>
    </div>
  );
}
