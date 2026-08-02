"use client";

import { useMemo } from "react";
import { createColumnHelper, type ColumnDef } from "@tanstack/react-table";
import { ShieldCheck, ShieldX, AlertTriangle, Database, Search, Mail, Wrench, KeyRound } from "lucide-react";
import { useWorkspace } from "@/lib/workspace";
import { DataTable } from "@/components/ui/DataTable";
import { StatTile, SectionHeader } from "@/components/ui/Misc";
import type { AuditLog, AuditSystem } from "@/lib/types";

const SYS_ICON: Record<AuditSystem, typeof Database> = {
  "Azure SQL": Database,
  "Azure AI Search": Search,
  "Microsoft Graph": Mail,
  "MCP Gateway": Wrench,
  "Auth / RBAC": KeyRound,
};

const col = createColumnHelper<AuditLog>();

export function ComplianceModule() {
  const { data } = useWorkspace();
  const logs = data.auditLogs;
  const denied = logs.filter((l) => l.status === "denied").length;
  const warnings = logs.filter((l) => l.status === "warning").length;

  const columns = useMemo<ColumnDef<AuditLog, any>[]>(
    () => [
      col.accessor((l) => l.timestamp, {
        id: "ts",
        header: "Timestamp",
        cell: (c) => <span className="font-mono text-[11px] text-zinc-500">{c.getValue() as string}</span>,
      }),
      col.accessor((l) => l.actor, {
        id: "actor",
        header: "Actor",
        cell: (c) => (
          <div>
            <p className="font-medium text-zinc-800">{c.getValue() as string}</p>
            <p className="text-[11px] text-zinc-400">{c.row.original.actorRole}</p>
          </div>
        ),
      }),
      col.accessor((l) => l.action, { id: "action", header: "Action" }),
      col.accessor((l) => l.system, {
        id: "system",
        header: "System",
        cell: (c) => {
          const s = c.getValue() as AuditSystem;
          const Icon = SYS_ICON[s];
          return (
            <span className="inline-flex items-center gap-1.5 text-zinc-600">
              <Icon size={13} className="text-zinc-400" /> {s}
            </span>
          );
        },
      }),
      col.accessor((l) => l.resource, {
        id: "resource",
        header: "Resource",
        cell: (c) => <span className="font-mono text-[11px] text-zinc-500">{c.getValue() as string}</span>,
      }),
      col.accessor((l) => l.ip, {
        id: "ip",
        header: "Source IP",
        cell: (c) => <span className="font-mono text-[11px] text-zinc-400">{c.getValue() as string}</span>,
      }),
      col.accessor((l) => l.status, {
        id: "status",
        header: "Result",
        cell: (c) => {
          const s = c.getValue() as AuditLog["status"];
          const map = {
            success: { icon: ShieldCheck, cls: "text-emerald-600" },
            denied: { icon: ShieldX, cls: "text-rose-600" },
            warning: { icon: AlertTriangle, cls: "text-amber-600" },
          } as const;
          const { icon: Icon, cls } = map[s];
          return (
            <span className={`inline-flex items-center gap-1 text-[11px] font-medium ${cls}`}>
              <Icon size={13} /> {s}
            </span>
          );
        },
      }),
    ],
    []
  );

  return (
    <div>
      <SectionHeader
        title="Compliance & Security"
        description="Immutable access audit trail — every read, export, and denied attempt is logged."
      />

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Total Events" value={logs.length} icon={ShieldCheck} />
        <StatTile label="Successful" value={logs.filter((l) => l.status === "success").length} tone="emerald" />
        <StatTile label="Denied" value={denied} icon={ShieldX} tone={denied ? "rose" : "emerald"} />
        <StatTile label="Warnings" value={warnings} icon={AlertTriangle} tone={warnings ? "amber" : "emerald"} />
      </div>

      <DataTable columns={columns} data={logs} searchPlaceholder="Search audit log by actor, action, resource…" pageSize={14} />
    </div>
  );
}
