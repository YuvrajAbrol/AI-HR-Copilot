"use client";

import {
  LayoutDashboard,
  Users,
  Wallet,
  UserPlus,
  BookText,
  ShieldAlert,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useWorkspace } from "@/lib/store";
import type { ViewId } from "@/lib/types";

interface NavItem {
  label: string;
  icon: LucideIcon;
  view: ViewId;
  matches: ViewId[];
  hint: string;
}

const NAV: NavItem[] = [
  { label: "Dashboard", icon: LayoutDashboard, view: "dashboard", matches: ["dashboard"], hint: "Executive insights" },
  { label: "Employee Directory", icon: Users, view: "directory", matches: ["directory", "employee-detail"], hint: "Org roster" },
  { label: "Payroll & Benefits", icon: Wallet, view: "payroll", matches: ["payroll"], hint: "Compensation" },
  { label: "Onboarding & Resumes", icon: UserPlus, view: "onboarding", matches: ["onboarding", "resume-screener"], hint: "Hiring workflows" },
  { label: "Policy Knowledge Base", icon: BookText, view: "policy", matches: ["policy"], hint: "RAG · Azure AI Search" },
  { label: "Security Audit Logs", icon: ShieldAlert, view: "audit", matches: ["audit"], hint: "Tool dispatch trail" },
];

export function Sidebar() {
  const { activeView, setView } = useWorkspace();

  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-slate-200 bg-white md:flex">
      <div className="px-3 py-4">
        <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
          Workspace
        </p>
        <nav className="space-y-1">
          {NAV.map(({ label, icon: Icon, view, matches, hint }) => {
            const active = matches.includes(activeView);
            return (
              <button
                key={view}
                type="button"
                onClick={() => setView(view)}
                className={`group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors ${
                  active
                    ? "bg-brand-50 text-brand-700"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <Icon
                  size={18}
                  className={active ? "text-brand-600" : "text-slate-400 group-hover:text-slate-600"}
                />
                <span className="flex-1">
                  <span className="block font-medium leading-tight">{label}</span>
                  <span className="block text-[11px] text-slate-400">{hint}</span>
                </span>
                {active && <span className="h-1.5 w-1.5 rounded-full bg-brand-600" />}
              </button>
            );
          })}
        </nav>
      </div>

      <div className="mt-auto p-3">
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
            Connected systems
          </p>
          <ul className="mt-2 space-y-1.5 text-xs text-slate-500">
            {["Azure SQL Database", "Azure AI Search", "Microsoft Graph API", "MCP Tool Gateway"].map(
              (s) => (
                <li key={s} className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  {s}
                </li>
              )
            )}
          </ul>
        </div>
      </div>
    </aside>
  );
}
