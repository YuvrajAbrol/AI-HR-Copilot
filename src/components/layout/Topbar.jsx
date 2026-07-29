import { Bell, Search, Sparkles } from "lucide-react";
import { Avatar } from "../ui/Avatar.jsx";
import { useCopilot } from "../../context/CopilotContext.jsx";
import { currentUser } from "../../data/mockData.js";

export function Topbar() {
  const { toggle, isOpen } = useCopilot();

  return (
    <header className="flex h-16 shrink-0 items-center justify-between gap-4 border-b border-slate-200 bg-white/80 px-6 backdrop-blur">
      <div className="relative hidden max-w-md flex-1 sm:block">
        <Search
          size={18}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
        />
        <input
          type="text"
          placeholder="Search people, policies, requests…"
          className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-10 pr-4 text-sm text-slate-700 outline-none transition focus:border-brand-400 focus:bg-white focus:ring-2 focus:ring-brand-100"
        />
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        <button
          type="button"
          onClick={toggle}
          className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-semibold transition-colors ${
            isOpen
              ? "bg-brand-100 text-brand-700"
              : "bg-brand-600 text-white shadow-sm shadow-brand-600/30 hover:bg-brand-700"
          }`}
        >
          <Sparkles size={16} />
          <span className="hidden sm:inline">Ask Copilot</span>
        </button>

        <button
          type="button"
          className="relative flex h-10 w-10 items-center justify-center rounded-xl text-slate-500 transition-colors hover:bg-slate-100"
        >
          <Bell size={20} />
          <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-white" />
        </button>

        <div className="flex items-center gap-2 pl-1">
          <Avatar initials={currentUser.avatarInitials} name={currentUser.name} size="sm" />
          <div className="hidden text-right leading-tight lg:block">
            <p className="text-sm font-semibold text-slate-800">{currentUser.name}</p>
            <p className="text-xs text-slate-400">{currentUser.title}</p>
          </div>
        </div>
      </div>
    </header>
  );
}
