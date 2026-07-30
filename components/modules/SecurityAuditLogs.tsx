"use client";

import { ShieldAlert, Database, Search, Mail, Wrench, ShieldX, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { AUDIT_LOGS } from "@/lib/mockData";
import type { BackendSystem } from "@/lib/types";

const SYSTEM_ICON: Record<BackendSystem, typeof Database> = {
  "Azure SQL": Database,
  "Azure AI Search": Search,
  "Microsoft Graph API": Mail,
  "MCP Tool": Wrench,
  "Guardrail Engine": ShieldX,
};

const STATUS_ICON = {
  success: CheckCircle2,
  blocked: XCircle,
  warning: AlertTriangle,
};

export function SecurityAuditLogs() {
  const counts = {
    success: AUDIT_LOGS.filter((l) => l.status === "success").length,
    blocked: AUDIT_LOGS.filter((l) => l.status === "blocked").length,
    warning: AUDIT_LOGS.filter((l) => l.status === "warning").length,
  };

  return (
    <div>
      <PageHeader
        icon={ShieldAlert}
        title="Security Audit Logs"
        description="Immutable trail of every agent tool dispatch, with RBAC tier and outcome."
      />

      <div className="mb-5 grid grid-cols-3 gap-4">
        <Card className="p-4">
          <p className="text-xs font-medium text-slate-500">Successful calls</p>
          <p className="mt-1 text-2xl font-bold text-emerald-600">{counts.success}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-medium text-slate-500">Blocked (RBAC/Guardrail)</p>
          <p className="mt-1 text-2xl font-bold text-rose-600">{counts.blocked}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-medium text-slate-500">Warnings</p>
          <p className="mt-1 text-2xl font-bold text-amber-600">{counts.warning}</p>
        </Card>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-400">
                <th className="px-5 py-3 font-medium">Timestamp</th>
                <th className="px-5 py-3 font-medium">Actor</th>
                <th className="px-5 py-3 font-medium">Action</th>
                <th className="px-5 py-3 font-medium">System</th>
                <th className="px-5 py-3 font-medium">Resource</th>
                <th className="px-5 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {AUDIT_LOGS.map((log) => {
                const SysIcon = SYSTEM_ICON[log.system];
                const StatusIcon = STATUS_ICON[log.status];
                return (
                  <tr key={log.id} className="transition-colors hover:bg-slate-50/60">
                    <td className="px-5 py-3 font-mono text-xs text-slate-500">{log.timestamp}</td>
                    <td className="px-5 py-3">
                      <span className="font-medium text-slate-800">{log.actor}</span>
                      <span className="block text-xs text-slate-400">{log.rbacTier}</span>
                    </td>
                    <td className="px-5 py-3 text-slate-600">{log.action}</td>
                    <td className="px-5 py-3">
                      <span className="inline-flex items-center gap-1.5 text-slate-600">
                        <SysIcon size={14} className="text-slate-400" />
                        {log.system}
                      </span>
                    </td>
                    <td className="px-5 py-3 font-mono text-xs text-slate-500">{log.resource}</td>
                    <td className="px-5 py-3">
                      <span
                        className={`inline-flex items-center gap-1 text-xs font-medium ${
                          log.status === "success"
                            ? "text-emerald-600"
                            : log.status === "blocked"
                              ? "text-rose-600"
                              : "text-amber-600"
                        }`}
                      >
                        <StatusIcon size={14} /> {log.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
