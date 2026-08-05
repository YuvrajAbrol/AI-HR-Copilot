"use client"

import {
  Briefcase,
  Building2,
  CalendarDays,
  FileText,
  Mail,
  MapPin,
  Shield,
  User,
  Users,
} from "lucide-react"
import type { CanvasArtifact } from "@/lib/canvas-store"
import { cn } from "@/lib/utils"

// ---------------------------------------------------------------------------
// Shared presentational helpers
// ---------------------------------------------------------------------------
function initials(name: string): string {
  return (name || "?")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("")
}

function Avatar({ name, className }: { name: string; className?: string }) {
  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.06] font-semibold text-neutral-200",
        className,
      )}
    >
      {initials(name)}
    </span>
  )
}

function Field({
  icon: Icon,
  label,
  value,
}: {
  icon?: React.ComponentType<{ className?: string }>
  label: string
  value?: React.ReactNode
}) {
  if (value == null || value === "") return null
  return (
    <div className="flex flex-col gap-0.5">
      <span className="flex items-center gap-1.5 text-[10.5px] font-medium uppercase tracking-wide text-neutral-500">
        {Icon && <Icon className="h-3 w-3" />}
        {label}
      </span>
      <span className="text-[13px] text-neutral-100">{value}</span>
    </div>
  )
}

function CardTitle({
  title,
  subtitle,
  name,
}: {
  title: string
  subtitle?: string
  name?: string
}) {
  return (
    <div className="flex items-center gap-3">
      {name && <Avatar name={name} className="h-11 w-11 text-[14px]" />}
      <div className="min-w-0">
        <p className="truncate text-[15px] font-semibold text-neutral-50">{title}</p>
        {subtitle && <p className="truncate text-[12.5px] text-neutral-400">{subtitle}</p>}
      </div>
    </div>
  )
}

function Panel({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "rounded-xl border border-white/[0.07] bg-white/[0.02] p-4",
        className,
      )}
    >
      {children}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Module renderers (keyed by tool result shape)
// ---------------------------------------------------------------------------
function EmployeeProfile({ data }: { data: any }) {
  const e = data?.employee ?? {}
  return (
    <div className="flex flex-col gap-3">
      <Panel>
        <CardTitle title={e.name} subtitle={e.title} name={e.name} />
      </Panel>
      <Panel>
        <div className="grid grid-cols-2 gap-x-4 gap-y-4">
          <Field icon={Building2} label="Department" value={e.department} />
          <Field icon={Briefcase} label="Employment" value={e.employment_type} />
          <Field icon={User} label="Manager" value={e.manager || "—"} />
          <Field icon={MapPin} label="Location" value={e.location} />
          <Field icon={Mail} label="Email" value={e.email} />
          <Field icon={CalendarDays} label="Start date" value={e.start_date} />
          <Field label="Employee ID" value={e.id} />
        </div>
      </Panel>
    </div>
  )
}

function Pto({ data }: { data: any }) {
  const e = data?.employee ?? {}
  const pto = data?.pto ?? {}
  const total = Number(pto.accrual_days_per_year) || 0
  const used = Number(pto.used_days) || 0
  const remaining = Number(pto.remaining_days) ?? Math.max(0, total - used)
  const usedPct = total > 0 ? Math.min(100, Math.round((used / total) * 100)) : 0

  return (
    <div className="flex flex-col gap-3">
      <Panel>
        <CardTitle title={e.name} subtitle="Paid time off" name={e.name} />
      </Panel>
      <Panel>
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Remaining", value: remaining, strong: true },
            { label: "Used", value: used },
            { label: "Annual", value: total },
          ].map((m) => (
            <div key={m.label} className="flex flex-col items-center gap-0.5 rounded-lg bg-white/[0.03] py-3">
              <span
                className={cn(
                  "text-[22px] font-semibold tabular-nums",
                  m.strong ? "text-neutral-50" : "text-neutral-300",
                )}
              >
                {m.value}
              </span>
              <span className="text-[10.5px] uppercase tracking-wide text-neutral-500">{m.label}</span>
            </div>
          ))}
        </div>
        <div className="mt-4">
          <div className="mb-1.5 flex items-center justify-between text-[11px] text-neutral-500">
            <span>{used} used</span>
            <span>{usedPct}% of {total} days</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-white/[0.06]">
            <div
              className="h-full rounded-full bg-neutral-200 transition-all"
              style={{ width: `${usedPct}%` }}
            />
          </div>
        </div>
        {pto.as_of && (
          <p className="mt-3 text-[11px] text-neutral-500">As of {pto.as_of}</p>
        )}
      </Panel>
    </div>
  )
}

function OrgChart({ data }: { data: any }) {
  const e = data?.employee ?? {}
  const peers: any[] = Array.isArray(data?.peers) ? data.peers : []
  const reports: any[] = Array.isArray(data?.reports) ? data.reports : []

  const PersonRow = ({ p }: { p: any }) => (
    <div className="flex items-center gap-2.5 rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2">
      <Avatar name={p.name} className="h-7 w-7 text-[11px]" />
      <div className="min-w-0">
        <p className="truncate text-[13px] text-neutral-100">{p.name}</p>
        {p.title && <p className="truncate text-[11px] text-neutral-500">{p.title}</p>}
      </div>
    </div>
  )

  return (
    <div className="flex flex-col gap-3">
      {data?.manager && (
        <div>
          <p className="mb-1.5 text-[10.5px] font-medium uppercase tracking-wide text-neutral-500">Reports to</p>
          <PersonRow p={{ name: data.manager }} />
        </div>
      )}

      <Panel className="border-white/15 bg-white/[0.05]">
        <div className="flex items-center gap-3">
          <Avatar name={e.name} className="h-10 w-10 text-[13px]" />
          <div className="min-w-0">
            <p className="truncate text-[14px] font-semibold text-neutral-50">{e.name}</p>
            {e.title && <p className="truncate text-[12px] text-neutral-400">{e.title}</p>}
          </div>
        </div>
      </Panel>

      <div>
        <p className="mb-1.5 flex items-center gap-1.5 text-[10.5px] font-medium uppercase tracking-wide text-neutral-500">
          <Users className="h-3 w-3" /> Direct reports ({reports.length})
        </p>
        <div className="flex flex-col gap-1.5">
          {reports.length > 0 ? (
            reports.map((r, i) => <PersonRow key={i} p={r} />)
          ) : (
            <p className="rounded-lg border border-dashed border-white/[0.08] px-3 py-2 text-[12px] text-neutral-500">
              No direct reports
            </p>
          )}
        </div>
      </div>

      {peers.length > 0 && (
        <div>
          <p className="mb-1.5 text-[10.5px] font-medium uppercase tracking-wide text-neutral-500">
            Peers ({peers.length})
          </p>
          <div className="flex flex-col gap-1.5">
            {peers.map((p, i) => (
              <PersonRow key={i} p={p} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function Benefits({ data }: { data: any }) {
  const e = data?.employee ?? {}
  const b = data?.benefits ?? {}
  return (
    <div className="flex flex-col gap-3">
      <Panel>
        <CardTitle title={e.name} subtitle="Benefits enrollment" name={e.name} />
      </Panel>
      <Panel>
        <div className="flex flex-col gap-4">
          <Field icon={Shield} label="Medical" value={b.medical} />
          <Field icon={Shield} label="Dental" value={b.dental} />
          <Field icon={Shield} label="Vision" value={b.vision} />
          <div className="grid grid-cols-2 gap-4">
            <Field
              label="401(k) contribution"
              value={b.retirement_401k_percent != null ? `${b.retirement_401k_percent}%` : undefined}
            />
            <Field
              label="Employer match"
              value={b.employer_match_percent != null ? `${b.employer_match_percent}%` : undefined}
            />
          </div>
        </div>
      </Panel>
    </div>
  )
}

function Policy({ data }: { data: any }) {
  const results: any[] = Array.isArray(data?.results) ? data.results : []
  return (
    <div className="flex flex-col gap-3">
      {data?.query && (
        <p className="text-[12px] text-neutral-500">
          Results for <span className="text-neutral-300">“{data.query}”</span>
        </p>
      )}
      {results.map((r, i) => (
        <Panel key={i}>
          <div className="flex items-start gap-2">
            <FileText className="mt-0.5 h-4 w-4 shrink-0 text-neutral-400" />
            <div className="min-w-0">
              <p className="text-[13.5px] font-semibold text-neutral-50">{r.title}</p>
              {r.section && <p className="text-[11.5px] text-neutral-400">{r.section}</p>}
            </div>
          </div>
          {r.snippet && (
            <p className="mt-2.5 text-[12.5px] leading-relaxed text-neutral-300">{r.snippet}</p>
          )}
          {r.source && (
            <p className="mt-2.5 border-t border-white/[0.06] pt-2 text-[11px] text-neutral-500">
              Source: {r.source}
            </p>
          )}
        </Panel>
      ))}
    </div>
  )
}

function JsonFallback({ data }: { data: any }) {
  return (
    <Panel className="p-3">
      <pre className="overflow-x-auto whitespace-pre-wrap break-words font-mono text-[11.5px] leading-relaxed text-neutral-300">
        {JSON.stringify(data, null, 2)}
      </pre>
    </Panel>
  )
}

// ---------------------------------------------------------------------------
// Dispatcher
// ---------------------------------------------------------------------------
export function CanvasModuleRenderer({ artifact }: { artifact: CanvasArtifact }) {
  switch (artifact.module) {
    case "employee_profile":
      return <EmployeeProfile data={artifact.data} />
    case "pto":
      return <Pto data={artifact.data} />
    case "org_chart":
      return <OrgChart data={artifact.data} />
    case "benefits":
      return <Benefits data={artifact.data} />
    case "policy":
      return <Policy data={artifact.data} />
    default:
      return <JsonFallback data={artifact.data} />
  }
}

export const MODULE_LABEL: Record<CanvasArtifact["module"], string> = {
  employee_profile: "Profile",
  pto: "PTO",
  org_chart: "Org chart",
  benefits: "Benefits",
  policy: "Policy",
  json: "Data",
}
