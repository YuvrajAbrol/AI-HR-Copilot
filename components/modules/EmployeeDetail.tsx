"use client";

import { ArrowLeft, Mail, Phone, MapPin, Briefcase, CalendarClock, Plane, Send, FileText } from "lucide-react";
import { motion } from "framer-motion";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Card, CardHeader } from "@/components/ui/Card";
import { useWorkspace } from "@/lib/store";
import { formatCurrency, formatDate, formatDateRange, hoursToDays, maskValue } from "@/lib/format";

export function EmployeeDetail() {
  const { focusedEmployee, roleProfile, setView, openEmail } = useWorkspace();

  if (!focusedEmployee) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-400">
        No employee selected. Open the directory to pick one.
      </div>
    );
  }

  const e = focusedEmployee;
  const ptoPct = Math.round((e.ptoRemainingHours / e.ptoAccruedHours) * 100);

  const draftApprovalEmail = () =>
    openEmail({
      to: e.email,
      subject: `PTO Request Approval — ${e.name}`,
      body: `Hi ${e.name.split(" ")[0]},\n\nYour upcoming time-off request has been reviewed and approved. You currently have ${e.ptoRemainingHours} PTO hours available, which is within policy (up to 10 consecutive business days).\n\nEnjoy your time off!\n\nBest,\nHR Operations`,
      context: `AI-drafted for ${e.name} · Microsoft Graph API`,
    });

  return (
    <div>
      <button
        type="button"
        onClick={() => setView("directory")}
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition-colors hover:text-slate-800"
      >
        <ArrowLeft size={16} /> Back to directory
      </button>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="grid grid-cols-1 gap-5 lg:grid-cols-3"
      >
        {/* Identity + contact */}
        <Card className="lg:col-span-1">
          <div className="flex flex-col items-center border-b border-slate-100 p-6 text-center">
            <Avatar initials={e.initials} name={e.name} size="lg" />
            <p className="mt-3 text-lg font-bold text-slate-900">{e.name}</p>
            <p className="text-sm text-slate-500">{e.title}</p>
            <div className="mt-2 flex items-center gap-2">
              <Badge status={e.status} />
              <Badge tone="indigo">{e.employmentType}</Badge>
            </div>
          </div>
          <div className="space-y-3 p-5 text-sm">
            <Detail icon={Mail} label="Email" value={maskValue(e.email, roleProfile.canViewPII)} />
            <Detail icon={Phone} label="Phone" value={maskValue(e.phone, roleProfile.canViewPII)} />
            <Detail icon={MapPin} label="Location" value={e.location} />
            <Detail icon={Briefcase} label="Department" value={e.department} />
            <Detail icon={CalendarClock} label="Start Date" value={formatDate(e.startDate)} />
          </div>
        </Card>

        {/* PTO + comp */}
        <div className="space-y-5 lg:col-span-2">
          <Card>
            <CardHeader title="Time Off" subtitle="Balance & upcoming leave" icon={Plane} />
            <div className="p-5">
              <div className="mb-1.5 flex items-center justify-between text-sm">
                <span className="font-medium text-slate-600">PTO Remaining</span>
                <span className="text-slate-500">
                  <span className="font-semibold text-slate-800">{e.ptoRemainingHours} hrs</span> ·{" "}
                  {hoursToDays(e.ptoRemainingHours)} of {e.ptoAccruedHours} accrued
                </span>
              </div>
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
                <div className="h-full rounded-full bg-brand-500" style={{ width: `${ptoPct}%` }} />
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                <MiniStat label="Remaining" value={`${e.ptoRemainingHours} hrs`} />
                <MiniStat label="Used YTD" value={`${e.ptoUsedHours} hrs`} />
                <MiniStat
                  label="Upcoming Leave"
                  value={
                    e.upcomingLeave
                      ? formatDateRange(e.upcomingLeave.start, e.upcomingLeave.end)
                      : "None"
                  }
                />
              </div>

              <div className="mt-4 flex items-start gap-2 rounded-lg border border-brand-100 bg-brand-50/60 p-3 text-xs text-slate-600">
                <FileText size={15} className="mt-0.5 shrink-0 text-brand-600" />
                <span>
                  <span className="font-semibold text-slate-800">Policy (PTO_2026.pdf §4.2):</span>{" "}
                  Up to 10 consecutive business days permitted without additional approval. This
                  request is within policy.
                </span>
              </div>

              <button
                type="button"
                onClick={draftApprovalEmail}
                className="mt-4 inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
              >
                <Send size={15} /> Draft Approval Email
              </button>
            </div>
          </Card>

          <Card>
            <CardHeader title="Compensation" subtitle="RBAC-gated" icon={Briefcase} />
            <div className="grid grid-cols-2 gap-3 p-5 sm:grid-cols-3">
              <MiniStat label="Annual Salary" value={maskValue(formatCurrency(e.annualSalary), roleProfile.canViewPayroll)} />
              <MiniStat label="Pay Rate" value={maskValue(e.payRate, roleProfile.canViewPayroll)} />
              <MiniStat label="Next Payday" value={formatDate(e.nextPayday)} />
              <MiniStat label="Manager" value={e.managerName} />
            </div>
          </Card>
        </div>
      </motion.div>
    </div>
  );
}

function Detail({ icon: Icon, label, value }: { icon: typeof Mail; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-400">
        <Icon size={15} />
      </span>
      <div className="min-w-0">
        <p className="text-[11px] uppercase tracking-wide text-slate-400">{label}</p>
        <p className="truncate text-slate-700">{value}</p>
      </div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-100 bg-slate-50/70 p-3">
      <p className="text-[11px] uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-0.5 text-sm font-semibold text-slate-900">{value}</p>
    </div>
  );
}
