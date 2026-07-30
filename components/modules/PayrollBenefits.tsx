"use client";

import { Wallet, Lock, Heart, Smile, ShieldCheck } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { useWorkspace } from "@/lib/store";
import { EMPLOYEES, PAYROLL_DISTRIBUTION } from "@/lib/mockData";
import { formatCurrency, maskValue } from "@/lib/format";

const BENEFITS = [
  { icon: Heart, iconClass: "bg-rose-50 text-rose-600", plan: "Contoso PPO Plus", kind: "Health", detail: "$25 PCP copay · $1,200 deductible" },
  { icon: Smile, iconClass: "bg-sky-50 text-sky-600", plan: "DeltaCare Premier", kind: "Dental", detail: "Preventive 100% · $2,000 annual max" },
  { icon: ShieldCheck, iconClass: "bg-violet-50 text-violet-600", plan: "VSP Choice", kind: "Vision", detail: "$10 exam · $150 frames allowance" },
];

export function PayrollBenefits() {
  const { roleProfile } = useWorkspace();
  const canView = roleProfile.canViewPayroll;
  const totalCost = PAYROLL_DISTRIBUTION.reduce((s, d) => s + d.totalCost, 0);

  return (
    <div>
      <PageHeader
        icon={Wallet}
        title="Payroll & Benefits"
        description="Compensation registry and benefit plan summaries."
        actions={
          !canView ? (
            <Badge tone="amber">
              <Lock size={12} /> Payroll masked · RBAC {roleProfile.rbacTier}
            </Badge>
          ) : undefined
        }
      />

      {/* Distribution */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {PAYROLL_DISTRIBUTION.map((band) => (
          <Card key={band.band} className="p-4">
            <p className="text-xs font-medium text-slate-500">{band.band}</p>
            <p className="mt-1.5 text-xl font-bold text-slate-900">{band.employees}</p>
            <p className="text-xs text-slate-400">employees</p>
            <p className="mt-2 text-sm font-semibold text-brand-700">
              {maskValue(formatCurrency(band.totalCost, true), canView)}
            </p>
          </Card>
        ))}
      </div>

      {/* Payroll register */}
      <Card className="mt-5">
        <CardHeader
          title="Compensation Register"
          subtitle={canView ? "Full access" : "Sensitive fields masked for your tier"}
          icon={Wallet}
        />
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-400">
                <th className="px-5 py-3 font-medium">Employee</th>
                <th className="px-5 py-3 font-medium">Department</th>
                <th className="px-5 py-3 text-right font-medium">Annual Salary</th>
                <th className="px-5 py-3 text-right font-medium">Pay Rate</th>
                <th className="px-5 py-3 text-right font-medium">Next Payday</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {EMPLOYEES.map((e) => (
                <tr key={e.id} className="transition-colors hover:bg-slate-50/60">
                  <td className="px-5 py-3">
                    <span className="font-medium text-slate-800">{e.name}</span>
                    <span className="block text-xs text-slate-400">{e.title}</span>
                  </td>
                  <td className="px-5 py-3 text-slate-600">{e.department}</td>
                  <td className={`px-5 py-3 text-right ${canView ? "font-semibold text-slate-900" : "text-slate-400"}`}>
                    {maskValue(formatCurrency(e.annualSalary), canView)}
                  </td>
                  <td className={`px-5 py-3 text-right ${canView ? "text-slate-600" : "text-slate-400"}`}>
                    {maskValue(e.payRate, canView)}
                  </td>
                  <td className="px-5 py-3 text-right text-slate-600">Aug 1</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="border-t border-slate-100 px-5 py-3 text-right text-sm">
          <span className="text-slate-500">Total monthly payroll: </span>
          <span className="font-bold text-slate-900">{maskValue(formatCurrency(totalCost, true), canView)}</span>
        </div>
      </Card>

      {/* Benefits */}
      <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {BENEFITS.map((b) => (
          <Card key={b.kind} className="p-5">
            <div className="flex items-center gap-3">
              <span className={`flex h-11 w-11 items-center justify-center rounded-xl ${b.iconClass}`}>
                <b.icon size={22} />
              </span>
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-400">{b.kind}</p>
                <p className="font-semibold text-slate-900">{b.plan}</p>
              </div>
            </div>
            <p className="mt-3 text-sm text-slate-500">{b.detail}</p>
            <Badge tone="emerald" className="mt-3">Active</Badge>
          </Card>
        ))}
      </div>
    </div>
  );
}
