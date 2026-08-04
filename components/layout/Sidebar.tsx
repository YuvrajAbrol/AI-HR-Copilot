"use client";

import {
  LayoutDashboard,
  Users,
  CalendarClock,
  Target,
  Banknote,
  Briefcase,
  ShieldCheck,
  HeartPulse,
  GraduationCap,
  Bot,
  Command,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { MODULES, type AppModuleId } from "@/lib/modules";
import { canAccessModule } from "@/lib/rbac";
import { useWorkspace } from "@/lib/workspace";
import { KeyCap } from "@/components/ui/Misc";

const ICONS: Record<AppModuleId, LucideIcon> = {
  dashboard: LayoutDashboard,
  "core-hr": Users,
  time: CalendarClock,
  performance: Target,
  benefits: HeartPulse,
  training: GraduationCap,
  payroll: Banknote,
  ats: Briefcase,
  compliance: ShieldCheck,
};

const GROUP_ORDER = ["Overview", "People", "Finance", "Talent", "Governance"] as const;

export function Sidebar() {
  const { role, activeModule, setModule, setPaletteOpen, toggleCopilot } = useWorkspace();

  const accessible = MODULES.filter((m) => canAccessModule(role, m.id));
  const groups = GROUP_ORDER.map((g) => ({
    group: g,
    items: accessible.filter((m) => m.group === g),
  })).filter((g) => g.items.length);

  return (
    <aside className="flex h-full w-60 shrink-0 flex-col border-r border-zinc-200 bg-white">
      {/* Brand */}
      <div className="flex h-14 items-center gap-2.5 border-b border-zinc-200 px-4">
        <span className="flex h-8 w-8 items-center justify-center rounded-md bg-zinc-900 text-white">
          <ShieldCheck size={17} />
        </span>
        <div className="leading-tight">
          <p className="text-[13px] font-semibold text-zinc-900">HR Copilot</p>
          <p className="text-[11px] text-zinc-400">Team ClosedAI</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-2 py-3">
        {groups.map(({ group, items }) => (
          <div key={group} className="mb-3">
            <p className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
              {group}
            </p>
            {items.map((m) => {
              const Icon = ICONS[m.id];
              const active = activeModule === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setModule(m.id)}
                  title={m.description}
                  className={`group flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-[13px] transition-colors ${
                    active
                      ? "bg-zinc-100 font-medium text-zinc-900"
                      : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900"
                  }`}
                >
                  <Icon size={16} className={active ? "text-zinc-900" : "text-zinc-400 group-hover:text-zinc-600"} />
                  <span className="truncate">{m.label}</span>
                </button>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Footer actions */}
      <div className="border-t border-zinc-200 p-2">
        <button
          type="button"
          onClick={toggleCopilot}
          className="mb-1 flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-[13px] text-zinc-600 transition-colors hover:bg-zinc-50 hover:text-zinc-900"
        >
          <Bot size={16} className="text-accent-500" />
          <span>AI Copilot</span>
          <span className="ml-auto flex items-center gap-0.5">
            <KeyCap>⌘</KeyCap>
            <KeyCap>J</KeyCap>
          </span>
        </button>
        <button
          type="button"
          onClick={() => setPaletteOpen(true)}
          className="flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-[13px] text-zinc-600 transition-colors hover:bg-zinc-50 hover:text-zinc-900"
        >
          <Command size={16} className="text-zinc-400" />
          <span>Command Menu</span>
          <span className="ml-auto flex items-center gap-0.5">
            <KeyCap>⌘</KeyCap>
            <KeyCap>K</KeyCap>
          </span>
        </button>
      </div>
    </aside>
  );
}
