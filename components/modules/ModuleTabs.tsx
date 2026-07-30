"use client";

import { ClipboardList, ScanSearch } from "lucide-react";
import { useWorkspace } from "@/lib/store";
import type { ViewId } from "@/lib/types";

const TABS: { view: ViewId; label: string; icon: typeof ClipboardList }[] = [
  { view: "onboarding", label: "Onboarding Tracker", icon: ClipboardList },
  { view: "resume-screener", label: "Resume Screener", icon: ScanSearch },
];

export function ModuleTabs({ active }: { active: ViewId }) {
  const { setView } = useWorkspace();
  return (
    <div className="mb-5 inline-flex rounded-lg border border-slate-200 bg-white p-1">
      {TABS.map(({ view, label, icon: Icon }) => (
        <button
          key={view}
          type="button"
          onClick={() => setView(view)}
          className={`inline-flex items-center gap-2 rounded-md px-3.5 py-1.5 text-sm font-medium transition-colors ${
            active === view ? "bg-brand-600 text-white" : "text-slate-600 hover:bg-slate-50"
          }`}
        >
          <Icon size={15} />
          {label}
        </button>
      ))}
    </div>
  );
}
