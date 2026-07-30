"use client";

import { ShieldCheck, Lock, ChevronDown, BadgeCheck } from "lucide-react";
import { useState } from "react";
import { useWorkspace } from "@/lib/store";
import { ROLE_PROFILES, CURRENT_ADMIN } from "@/lib/mockData";
import type { SecurityRole } from "@/lib/types";

export function SecurityBar() {
  const { role, roleProfile, setRole } = useWorkspace();
  const [open, setOpen] = useState(false);

  const isAdmin = role === "admin";

  return (
    <header className="z-30 flex h-14 shrink-0 items-center justify-between border-b border-slate-800 bg-slate-900 px-4 text-slate-100">
      {/* Brand */}
      <div className="flex items-center gap-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600 shadow-sm shadow-brand-600/40">
          <ShieldCheck size={20} />
        </span>
        <div className="leading-tight">
          <p className="text-sm font-bold tracking-tight">HR Copilot Workspace</p>
          <p className="text-[11px] text-slate-400">Operations &amp; Command Center · Team ClosedAI</p>
        </div>
      </div>

      {/* Security indicator + role switch */}
      <div className="flex items-center gap-3">
        <div
          className={`hidden items-center gap-2 rounded-lg border px-3 py-1.5 text-xs md:flex ${
            isAdmin
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
              : "border-amber-500/30 bg-amber-500/10 text-amber-300"
          }`}
        >
          <Lock size={13} />
          <span className="font-medium">
            Authenticated: {roleProfile.label}
          </span>
          <span className="text-slate-500">|</span>
          <span>RBAC {roleProfile.rbacTier}</span>
          <span className="text-slate-500">|</span>
          <span className="inline-flex items-center gap-1">
            <BadgeCheck size={13} /> {roleProfile.clearance}
          </span>
        </div>

        {/* Role simulator */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-200 transition-colors hover:bg-slate-700"
          >
            <span className={`h-2 w-2 rounded-full ${isAdmin ? "bg-emerald-400" : "bg-amber-400"}`} />
            Simulate role
            <ChevronDown size={14} className={`transition-transform ${open ? "rotate-180" : ""}`} />
          </button>

          {open && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
              <div className="absolute right-0 top-full z-20 mt-1.5 w-64 overflow-hidden rounded-xl border border-slate-200 bg-white text-slate-700 shadow-xl">
                {(Object.keys(ROLE_PROFILES) as SecurityRole[]).map((r) => {
                  const p = ROLE_PROFILES[r];
                  return (
                    <button
                      key={r}
                      type="button"
                      onClick={() => {
                        setRole(r);
                        setOpen(false);
                      }}
                      className={`flex w-full items-start gap-2.5 px-3 py-2.5 text-left transition-colors hover:bg-slate-50 ${
                        role === r ? "bg-brand-50/60" : ""
                      }`}
                    >
                      <span
                        className={`mt-0.5 flex h-7 w-7 items-center justify-center rounded-lg ${
                          r === "admin" ? "bg-emerald-100 text-emerald-600" : "bg-amber-100 text-amber-600"
                        }`}
                      >
                        {r === "admin" ? <ShieldCheck size={15} /> : <Lock size={15} />}
                      </span>
                      <span>
                        <span className="block text-sm font-semibold text-slate-800">{p.label}</span>
                        <span className="block text-xs text-slate-500">
                          {p.rbacTier} · {p.canViewPayroll ? "Payroll visible" : "Payroll masked"}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>

        <div className="hidden items-center gap-2 border-l border-slate-700 pl-3 sm:flex">
          <div className="text-right leading-tight">
            <p className="text-xs font-semibold">{CURRENT_ADMIN.name}</p>
            <p className="text-[11px] text-slate-400">{CURRENT_ADMIN.title}</p>
          </div>
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-600 text-xs font-bold">
            JR
          </span>
        </div>
      </div>
    </header>
  );
}
