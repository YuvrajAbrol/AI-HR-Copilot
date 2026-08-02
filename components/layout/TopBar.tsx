"use client";

import { useState } from "react";
import { Search, ChevronDown, Bot, ShieldCheck, Lock, UserCog, User, Check, ChevronRight } from "lucide-react";
import { useWorkspace } from "@/lib/workspace";
import { ROLE_META } from "@/lib/rbac";
import { MODULE_LABEL } from "@/lib/modules";
import { Avatar } from "@/components/ui/Avatar";
import { KeyCap } from "@/components/ui/Misc";
import type { Role } from "@/lib/types";

const ROLE_ICON: Record<Role, typeof ShieldCheck> = {
  admin: ShieldCheck,
  manager: UserCog,
  employee: User,
};

export function TopBar() {
  const {
    role,
    setRole,
    currentUser,
    activeModule,
    selectedEmployee,
    setPaletteOpen,
    toggleCopilot,
  } = useWorkspace();
  const [roleOpen, setRoleOpen] = useState(false);
  const meta = ROLE_META[role];

  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b border-zinc-200 bg-white px-4">
      {/* Breadcrumbs */}
      <nav className="flex items-center gap-1.5 text-sm">
        <span className="text-zinc-400">Workspace</span>
        <ChevronRight size={14} className="text-zinc-300" />
        <span className="font-medium text-zinc-800">{MODULE_LABEL[activeModule]}</span>
        {selectedEmployee && (
          <>
            <ChevronRight size={14} className="text-zinc-300" />
            <span className="text-zinc-500">{selectedEmployee.name}</span>
          </>
        )}
      </nav>

      {/* Global search → command palette */}
      <button
        type="button"
        onClick={() => setPaletteOpen(true)}
        className="ml-auto hidden h-9 w-72 items-center gap-2 rounded-md border border-zinc-200 bg-zinc-50 px-3 text-sm text-zinc-400 transition-colors hover:bg-white md:flex"
      >
        <Search size={15} />
        <span>Search or jump to…</span>
        <span className="ml-auto flex items-center gap-0.5">
          <KeyCap>⌘</KeyCap>
          <KeyCap>K</KeyCap>
        </span>
      </button>

      {/* View As (RBAC switch) */}
      <div className="relative">
        <button
          type="button"
          onClick={() => setRoleOpen((v) => !v)}
          className="flex h-9 items-center gap-2 rounded-md border border-zinc-200 bg-white px-2.5 text-sm text-zinc-700 transition-colors hover:bg-zinc-50"
        >
          <span
            className={`h-2 w-2 rounded-full ${
              role === "admin" ? "bg-emerald-500" : role === "manager" ? "bg-sky-500" : "bg-amber-500"
            }`}
          />
          <span className="hidden sm:inline text-zinc-400">View as:</span>
          <span className="font-medium">{meta.label}</span>
          <ChevronDown size={14} className={`text-zinc-400 transition-transform ${roleOpen ? "rotate-180" : ""}`} />
        </button>

        {roleOpen && (
          <>
            <div className="fixed inset-0 z-30" onClick={() => setRoleOpen(false)} />
            <div className="absolute right-0 top-full z-40 mt-1.5 w-72 overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-lg">
              <p className="border-b border-zinc-100 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
                Simulate access role
              </p>
              {(Object.keys(ROLE_META) as Role[]).map((r) => {
                const m = ROLE_META[r];
                const Icon = ROLE_ICON[r];
                return (
                  <button
                    key={r}
                    type="button"
                    onClick={() => {
                      setRole(r);
                      setRoleOpen(false);
                    }}
                    className={`flex w-full items-start gap-2.5 px-3 py-2.5 text-left transition-colors hover:bg-zinc-50 ${
                      role === r ? "bg-zinc-50" : ""
                    }`}
                  >
                    <span className="mt-0.5 flex h-7 w-7 items-center justify-center rounded-md bg-zinc-100 text-zinc-600">
                      <Icon size={15} />
                    </span>
                    <span className="flex-1">
                      <span className="flex items-center gap-1.5 text-sm font-medium text-zinc-800">
                        {m.label}
                        {role === r && <Check size={13} className="text-emerald-500" />}
                      </span>
                      <span className="block text-xs text-zinc-400">
                        {m.tier} · {m.scope}
                      </span>
                    </span>
                  </button>
                );
              })}
              <div className="flex items-center gap-1.5 border-t border-zinc-100 bg-zinc-50 px-3 py-2 text-[11px] text-zinc-500">
                <Lock size={12} /> {meta.clearance}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Copilot toggle */}
      <button
        type="button"
        onClick={toggleCopilot}
        className="flex h-9 items-center gap-1.5 rounded-md border border-zinc-200 bg-white px-2.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50"
      >
        <Bot size={16} className="text-accent-600" />
        <span className="hidden sm:inline">Copilot</span>
      </button>

      {/* User */}
      <div className="flex items-center gap-2 border-l border-zinc-200 pl-3">
        <Avatar initials={currentUser.initials} seed={currentUser.name} size="sm" />
        <div className="hidden leading-tight lg:block">
          <p className="text-xs font-medium text-zinc-800">{currentUser.name}</p>
          <p className="text-[11px] text-zinc-400">{currentUser.title}</p>
        </div>
      </div>
    </header>
  );
}
