"use client";

import { useMemo, useState } from "react";
import { createColumnHelper, type ColumnDef } from "@tanstack/react-table";
import { HeartPulse, Eye, Smile, Check, PiggyBank, ShieldCheck } from "lucide-react";
import { useWorkspace } from "@/lib/workspace";
import { visibleEmployees, ROLE_META } from "@/lib/rbac";
import { DataTable } from "@/components/ui/DataTable";
import { Tabs } from "@/components/ui/Tabs";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { StatTile, SectionHeader, ProgressBar } from "@/components/ui/Misc";
import { formatCurrency } from "@/lib/format";
import type { Employee } from "@/lib/types";

type EnrollStatus = "Active" | "Pending" | "Opted-Out";

interface HealthPlan {
  id: string;
  name: string;
  type: string;
  icon: typeof HeartPulse;
  premium: number;
  deductible: string;
  oopMax: string;
  coverage: string;
  highlights: string[];
  featured?: boolean;
}

const HEALTH_PLANS: HealthPlan[] = [
  {
    id: "ppo",
    name: "Medical PPO",
    type: "Preferred Provider",
    icon: HeartPulse,
    premium: 240,
    deductible: "$1,000 / $2,000",
    oopMax: "$4,000 / $8,000",
    coverage: "90% in-network after deductible",
    highlights: ["No referrals needed", "Nationwide network", "Low deductible"],
    featured: true,
  },
  {
    id: "hdhp",
    name: "Medical HDHP + HSA",
    type: "High Deductible",
    icon: ShieldCheck,
    premium: 95,
    deductible: "$3,200 / $6,400",
    oopMax: "$6,000 / $12,000",
    coverage: "80% in-network after deductible",
    highlights: ["HSA-eligible", "$1,200 employer HSA seed", "Lowest premium"],
  },
  {
    id: "dental",
    name: "Dental Complete",
    type: "PPO Dental",
    icon: Smile,
    premium: 28,
    deductible: "$50 / $150",
    oopMax: "$1,500 annual max",
    coverage: "100% preventive, 80% basic",
    highlights: ["2 cleanings/yr free", "Orthodontia included", "Wide network"],
  },
  {
    id: "vision",
    name: "Vision Plus",
    type: "Vision",
    icon: Eye,
    premium: 12,
    deductible: "$10 copay",
    oopMax: "$150 frame allowance",
    coverage: "Annual exam + lenses",
    highlights: ["$150 frames/yr", "Contacts covered", "Lasik discount"],
  },
];

const MATCH_CAP = 5; // company matches 100% up to 5% of salary

export function BenefitsModule() {
  const { role, currentUser, data } = useWorkspace();
  const [tab, setTab] = useState("plans");

  const scope = useMemo(
    () => visibleEmployees(role, currentUser.id, data.employees),
    [role, currentUser.id, data.employees]
  );

  return (
    <div>
      <SectionHeader title="Benefits" description={`Health, dental, vision & retirement · ${ROLE_META[role].scope}`} />

      <div className="mb-4">
        <Tabs
          active={tab}
          onChange={setTab}
          tabs={[
            { id: "plans", label: "Health & Dental" },
            { id: "401k", label: "401(k) & Retirement" },
            { id: "enrollment", label: "Enrollment Directory", count: scope.length },
          ]}
        />
      </div>

      {tab === "plans" && <PlanCards />}
      {tab === "401k" && <Retirement salary={currentUser.comp.baseSalary} />}
      {tab === "enrollment" && <EnrollmentDirectory scope={scope} />}
    </div>
  );
}

function PlanCards() {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
      {HEALTH_PLANS.map((p) => {
        const Icon = p.icon;
        return (
          <div
            key={p.id}
            className={`flex flex-col rounded-lg border bg-white p-4 ${p.featured ? "border-accent-300 ring-1 ring-accent-200" : "border-zinc-200"}`}
          >
            <div className="flex items-center justify-between">
              <span className={`flex h-9 w-9 items-center justify-center rounded-md ${p.featured ? "bg-accent-50 text-accent-600" : "bg-zinc-100 text-zinc-500"}`}>
                <Icon size={18} />
              </span>
              {p.featured && <Badge tone="accent">Most popular</Badge>}
            </div>
            <p className="mt-2.5 text-sm font-semibold text-zinc-900">{p.name}</p>
            <p className="text-xs text-zinc-400">{p.type}</p>
            <div className="mt-2 flex items-baseline gap-1">
              <span className="text-xl font-semibold tabular-nums text-zinc-900">{formatCurrency(p.premium)}</span>
              <span className="text-xs text-zinc-400">/mo premium</span>
            </div>
            <dl className="mt-3 space-y-1.5 border-t border-zinc-100 pt-3 text-xs">
              <Row label="Deductible" value={p.deductible} />
              <Row label="Out-of-pocket" value={p.oopMax} />
              <Row label="Coverage" value={p.coverage} />
            </dl>
            <ul className="mt-3 space-y-1">
              {p.highlights.map((h) => (
                <li key={h} className="flex items-center gap-1.5 text-xs text-zinc-600">
                  <Check size={12} className="text-emerald-500" /> {h}
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <dt className="text-zinc-400">{label}</dt>
      <dd className="text-right font-medium text-zinc-700">{value}</dd>
    </div>
  );
}

function Retirement({ salary }: { salary: number }) {
  const [contribPct, setContribPct] = useState(6);
  const employeeAnnual = (salary * contribPct) / 100;
  const matchPct = Math.min(contribPct, MATCH_CAP);
  const companyAnnual = (salary * matchPct) / 100;
  const total = employeeAnnual + companyAnnual;
  const gettingFullMatch = contribPct >= MATCH_CAP;

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <div className="rounded-lg border border-zinc-200 bg-white p-4 lg:col-span-2">
        <div className="mb-3 flex items-center gap-2">
          <PiggyBank size={16} className="text-accent-600" />
          <p className="text-sm font-semibold text-zinc-800">401(k) Contribution Planner</p>
        </div>
        <p className="text-xs text-zinc-500">
          Company matches <span className="font-semibold text-zinc-700">100% up to {MATCH_CAP}%</span> of eligible pay. Adjust your contribution to see the match.
        </p>

        <div className="mt-4">
          <div className="mb-1 flex items-center justify-between text-xs">
            <span className="text-zinc-500">Your contribution</span>
            <span className="font-semibold tabular-nums text-zinc-900">{contribPct}%</span>
          </div>
          <input
            type="range"
            min={0}
            max={15}
            value={contribPct}
            onChange={(e) => setContribPct(Number(e.target.value))}
            className="w-full accent-indigo-600"
          />
          <div className="mt-1 flex justify-between text-[10px] text-zinc-400">
            <span>0%</span>
            <span>Match cap {MATCH_CAP}%</span>
            <span>15%</span>
          </div>
        </div>

        {/* Stacked bar */}
        <div className="mt-4">
          <div className="flex h-4 w-full overflow-hidden rounded-full bg-zinc-100">
            <div className="bg-accent-500" style={{ width: `${(employeeAnnual / (salary * 0.2)) * 100}%` }} />
            <div className="bg-emerald-500" style={{ width: `${(companyAnnual / (salary * 0.2)) * 100}%` }} />
          </div>
          <div className="mt-2 flex gap-4 text-xs">
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-accent-500" /> You: {formatCurrency(employeeAnnual)}</span>
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-emerald-500" /> Employer match: {formatCurrency(companyAnnual)}</span>
          </div>
        </div>

        {!gettingFullMatch && (
          <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            You&apos;re leaving free money on the table — contribute {MATCH_CAP}% to capture the full employer match.
          </div>
        )}
      </div>

      <div className="space-y-3">
        <StatTile label="Annual Contribution" value={formatCurrency(total)} icon={PiggyBank} tone="accent" sub="You + employer" />
        <StatTile label="Employer Match" value={formatCurrency(companyAnnual)} tone="emerald" sub={`${matchPct}% of salary`} />
        <div className="rounded-lg border border-zinc-200 bg-white p-4">
          <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">Match Captured</p>
          <div className="mt-2 flex items-center gap-2">
            <ProgressBar value={(matchPct / MATCH_CAP) * 100} tone={gettingFullMatch ? "emerald" : "amber"} />
            <span className="text-xs font-semibold tabular-nums text-zinc-600">{Math.round((matchPct / MATCH_CAP) * 100)}%</span>
          </div>
        </div>
      </div>
    </div>
  );
}

interface EnrollRow {
  employee: Employee;
  medicalPlan: string;
  dental: boolean;
  vision: boolean;
  status: EnrollStatus;
}

const enrollCol = createColumnHelper<EnrollRow>();

function EnrollmentDirectory({ scope }: { scope: Employee[] }) {
  const [filter, setFilter] = useState<"All" | EnrollStatus>("All");

  const rows: EnrollRow[] = useMemo(
    () =>
      scope.map((e) => {
        const h = e.id.charCodeAt(4) + e.id.charCodeAt(5) + e.id.charCodeAt(6);
        const status: EnrollStatus = h % 10 === 0 ? "Opted-Out" : h % 7 === 0 ? "Pending" : "Active";
        return {
          employee: e,
          medicalPlan: status === "Opted-Out" ? "—" : h % 2 === 0 ? "Medical PPO" : "HDHP + HSA",
          dental: status !== "Opted-Out" && h % 3 !== 0,
          vision: status !== "Opted-Out" && h % 4 !== 0,
          status,
        };
      }),
    [scope]
  );

  const filtered = filter === "All" ? rows : rows.filter((r) => r.status === filter);
  const counts = {
    Active: rows.filter((r) => r.status === "Active").length,
    Pending: rows.filter((r) => r.status === "Pending").length,
    "Opted-Out": rows.filter((r) => r.status === "Opted-Out").length,
  };

  const columns = useMemo<ColumnDef<EnrollRow, any>[]>(
    () => [
      enrollCol.accessor((r) => r.employee.name, {
        id: "emp",
        header: "Employee",
        cell: (c) => (
          <div className="flex items-center gap-2">
            <Avatar initials={c.row.original.employee.initials} seed={c.row.original.employee.name} name={c.row.original.employee.name} size="xs" />
            <div>
              <p className="font-medium text-zinc-800">{c.row.original.employee.name}</p>
              <p className="text-[11px] text-zinc-400">{c.row.original.employee.department}</p>
            </div>
          </div>
        ),
      }),
      enrollCol.accessor((r) => r.medicalPlan, { id: "medical", header: "Medical Plan" }),
      enrollCol.accessor((r) => (r.dental ? "Enrolled" : "—"), {
        id: "dental",
        header: "Dental",
        cell: (c) => (c.row.original.dental ? <Check size={14} className="text-emerald-500" /> : <span className="text-zinc-300">—</span>),
      }),
      enrollCol.accessor((r) => (r.vision ? "Enrolled" : "—"), {
        id: "vision",
        header: "Vision",
        cell: (c) => (c.row.original.vision ? <Check size={14} className="text-emerald-500" /> : <span className="text-zinc-300">—</span>),
      }),
      enrollCol.accessor((r) => r.status, {
        id: "status",
        header: "Enrollment",
        cell: (c) => {
          const s = c.getValue() as EnrollStatus;
          return <Badge status={s === "Opted-Out" ? "Not Started" : s === "Active" ? "Active" : "Pending"}>{s}</Badge>;
        },
      }),
    ],
    []
  );

  const filters: ("All" | EnrollStatus)[] = ["All", "Active", "Pending", "Opted-Out"];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Enrolled (Active)" value={counts.Active} icon={HeartPulse} tone="emerald" />
        <StatTile label="Pending" value={counts.Pending} tone="amber" />
        <StatTile label="Opted-Out" value={counts["Opted-Out"]} tone="zinc" />
        <StatTile label="Participation" value={`${Math.round((counts.Active / (rows.length || 1)) * 100)}%`} tone="accent" />
      </div>
      <DataTable
        columns={columns}
        data={filtered}
        searchPlaceholder="Search enrollment directory…"
        toolbar={
          <div className="inline-flex rounded-md border border-zinc-200 bg-white p-0.5">
            {filters.map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`rounded px-2 py-1 text-[11px] font-medium transition-colors ${
                  filter === f ? "bg-zinc-900 text-white" : "text-zinc-500 hover:text-zinc-800"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        }
      />
    </div>
  );
}
