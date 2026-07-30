import { Database, Search, Mail, Wrench, ShieldX } from "lucide-react";
import type { BackendSystem } from "@/lib/types";

const META: Record<BackendSystem, { icon: typeof Database; className: string }> = {
  "Azure SQL": { icon: Database, className: "bg-sky-50 text-sky-700 ring-sky-600/20" },
  "Azure AI Search": { icon: Search, className: "bg-violet-50 text-violet-700 ring-violet-600/20" },
  "Microsoft Graph API": { icon: Mail, className: "bg-brand-50 text-brand-700 ring-brand-600/20" },
  "MCP Tool": { icon: Wrench, className: "bg-emerald-50 text-emerald-700 ring-emerald-600/20" },
  "Guardrail Engine": { icon: ShieldX, className: "bg-rose-50 text-rose-700 ring-rose-600/20" },
};

export function ToolBadge({ system }: { system: BackendSystem }) {
  const { icon: Icon, className } = META[system];
  return (
    <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset ${className}`}>
      <Icon size={11} /> {system}
    </span>
  );
}
