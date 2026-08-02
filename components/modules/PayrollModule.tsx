"use client";

import { useMemo, useState } from "react";
import { createColumnHelper, type ColumnDef } from "@tanstack/react-table";
import { Banknote, Lock } from "lucide-react";
import { useWorkspace } from "@/lib/workspace";
import { visibleEmployees, canViewCompensation, ROLE_META } from "@/lib/rbac";
import { DataTable } from "@/components/ui/DataTable";
import { Tabs } from "@/components/ui/Tabs";
import { Badge } from "@/components/ui/Badge";
import { StatTile, SectionHeader, RbacNotice } from "@/components/ui/Misc";
import { formatCurrency, formatCurrencyCents, formatDate, mask } from "@/lib/format";
import type { Employee, Expense, Paystub, PayrollRun } from "@/lib/types";

export function PayrollModule() {
  const { role, currentUser, data } = useWorkspace();
  const [tab, setTab] = useState(role === "employee" ? "paystubs" : "runs");
  const isAdmin = role === "admin";

  const tabs = [
    ...(role !== "employee" ? [{ id: "runs", label: "Payroll Runs" }] : []),
    { id: "paystubs", label: "My Paystubs" },
    ...(role !== "employee" ? [{ id: "expenses", label: "Reimbursements" }] : []),
  ];

  return (
    <div>
      <SectionHeader
        title="Payroll & Compensation"
        description={`${ROLE_META[role].label} · ${isAdmin ? "Full financial access" : "Scoped & masked"}`}
      />

      {!isAdmin && (
        <RbacNotice>
          <Lock size={14} />
          {role === "manager"
            ? "Company-wide payroll totals are masked. You can view your own paystubs and team reimbursements."
            : "Self-service: only your own paystubs are visible."}
        </RbacNotice>
      )}

      <div className="mb-4">
        <Tabs active={tab} onChange={setTab} tabs={tabs} />
      </div>

      {tab === "runs" && <PayrollRuns runs={data.payrollRuns} canView={isAdmin} />}
      {tab === "paystubs" && <Paystubs stubs={currentUser.paystubs} />}
      {tab === "expenses" && (
        <Expenses
          expenses={data.expenses}
          scope={visibleEmployees(role, currentUser.id, data.employees)}
          canViewAll={role !== "employee"}
        />
      )}
    </div>
  );
}

const runCol = createColumnHelper<PayrollRun>();
function PayrollRuns({ runs, canView }: { runs: PayrollRun[]; canView: boolean }) {
  const total = runs.reduce((s, r) => s + r.grossTotal, 0);
  const columns = useMemo<ColumnDef<PayrollRun, any>[]>(
    () => [
      runCol.accessor((r) => r.period, { id: "period", header: "Pay Period", cell: (c) => <span className="font-medium text-zinc-800">{c.getValue() as string}</span> }),
      runCol.accessor((r) => r.payDate, { id: "payDate", header: "Pay Date", cell: (c) => formatDate(c.getValue() as string) }),
      runCol.accessor((r) => r.headcount, { id: "hc", header: "Headcount", cell: (c) => <span className="tabular-nums">{c.getValue() as number}</span> }),
      runCol.accessor((r) => r.grossTotal, { id: "gross", header: "Gross", cell: (c) => <span className="tabular-nums">{mask(formatCurrency(c.getValue() as number), canView)}</span> }),
      runCol.accessor((r) => r.taxTotal, { id: "tax", header: "Taxes", cell: (c) => <span className="tabular-nums text-rose-600">{mask(formatCurrency(c.getValue() as number), canView)}</span> }),
      runCol.accessor((r) => r.netTotal, { id: "net", header: "Net", cell: (c) => <span className="tabular-nums font-medium">{mask(formatCurrency(c.getValue() as number), canView)}</span> }),
      runCol.accessor((r) => r.status, { id: "status", header: "Status", cell: (c) => <Badge status={c.getValue() as string} /> }),
    ],
    [canView]
  );
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Annual Gross" value={mask(formatCurrency(total, true), canView)} icon={Banknote} tone="emerald" />
        <StatTile label="Runs Processed" value={runs.filter((r) => r.status === "Processed").length} />
        <StatTile label="Pending Run" value={runs.filter((r) => r.status === "Pending").length} tone="amber" />
        <StatTile label="Headcount" value={runs[0]?.headcount ?? 0} />
      </div>
      <DataTable columns={columns} data={runs} searchPlaceholder="Search payroll runs…" pageSize={12} />
    </div>
  );
}

const stubCol = createColumnHelper<Paystub>();
function Paystubs({ stubs }: { stubs: Paystub[] }) {
  const columns = useMemo<ColumnDef<Paystub, any>[]>(
    () => [
      stubCol.accessor((s) => s.period, { id: "period", header: "Period", cell: (c) => <span className="font-medium text-zinc-800">{c.getValue() as string}</span> }),
      stubCol.accessor((s) => s.payDate, { id: "payDate", header: "Pay Date", cell: (c) => formatDate(c.getValue() as string) }),
      stubCol.accessor((s) => s.gross, { id: "gross", header: "Gross", cell: (c) => <span className="tabular-nums">{formatCurrencyCents(c.getValue() as number)}</span> }),
      stubCol.accessor((s) => s.federalTax + s.stateTax, { id: "tax", header: "Income Tax", cell: (c) => <span className="tabular-nums text-rose-600">-{formatCurrencyCents(c.getValue() as number)}</span> }),
      stubCol.accessor((s) => s.fica + s.medicare, { id: "fica", header: "FICA + Med", cell: (c) => <span className="tabular-nums text-rose-600">-{formatCurrencyCents(c.getValue() as number)}</span> }),
      stubCol.accessor((s) => s.retirement401k, { id: "401k", header: "401(k)", cell: (c) => <span className="tabular-nums">-{formatCurrencyCents(c.getValue() as number)}</span> }),
      stubCol.accessor((s) => s.net, { id: "net", header: "Net Pay", cell: (c) => <span className="tabular-nums font-semibold text-zinc-900">{formatCurrencyCents(c.getValue() as number)}</span> }),
    ],
    []
  );
  const ytd = stubs.reduce((s, p) => s + p.net, 0);
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="YTD Net" value={formatCurrency(ytd)} icon={Banknote} tone="emerald" />
        <StatTile label="Latest Gross" value={formatCurrency(stubs[stubs.length - 1].gross)} />
        <StatTile label="Statements" value={stubs.length} sub="Trailing 12 months" />
        <StatTile label="401(k) YTD" value={formatCurrency(stubs.reduce((s, p) => s + p.retirement401k, 0))} tone="accent" />
      </div>
      <DataTable columns={columns} data={[...stubs].reverse()} searchPlaceholder="Search paystubs…" pageSize={12} />
    </div>
  );
}

const expCol = createColumnHelper<Expense>();
function Expenses({ expenses, scope, canViewAll }: { expenses: Expense[]; scope: Employee[]; canViewAll: boolean }) {
  const scopeIds = new Set(scope.map((e) => e.id));
  const rows = canViewAll ? expenses : expenses.filter((e) => scopeIds.has(e.employeeId));
  const columns = useMemo<ColumnDef<Expense, any>[]>(
    () => [
      expCol.accessor((e) => e.id, { id: "id", header: "ID", cell: (c) => <span className="font-mono text-zinc-500">{c.getValue() as string}</span> }),
      expCol.accessor((e) => e.employeeName, { id: "emp", header: "Employee", cell: (c) => <span className="font-medium text-zinc-800">{c.getValue() as string}</span> }),
      expCol.accessor((e) => e.category, { id: "cat", header: "Category" }),
      expCol.accessor((e) => e.date, { id: "date", header: "Date", cell: (c) => formatDate(c.getValue() as string) }),
      expCol.accessor((e) => e.amount, { id: "amount", header: "Amount", cell: (c) => <span className="tabular-nums">{formatCurrencyCents(c.getValue() as number)}</span> }),
      expCol.accessor((e) => e.status, { id: "status", header: "Status", cell: (c) => <Badge status={c.getValue() as string} /> }),
    ],
    []
  );
  return <DataTable columns={columns} data={rows} searchPlaceholder="Search reimbursements…" />;
}
