import { NavLink } from "react-router-dom";
import { Bot, ChevronsLeft } from "lucide-react";
import { NAV_ITEMS } from "../../config/navigation.js";

export function Sidebar({ collapsed, onToggle }) {
  return (
    <aside
      className={`flex h-full flex-col border-r border-slate-200 bg-white transition-all duration-300 ${
        collapsed ? "w-[76px]" : "w-64"
      }`}
    >
      {/* Brand */}
      <div className="flex h-16 items-center gap-3 px-4">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-600 text-white shadow-sm shadow-brand-600/30">
          <Bot size={22} />
        </span>
        {!collapsed && (
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-slate-900">HR Copilot</p>
            <p className="truncate text-xs text-slate-400">Contoso Inc.</p>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-1 px-3 py-4">
        {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            title={collapsed ? label : undefined}
            className={({ isActive }) =>
              `group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-brand-50 text-brand-700"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              } ${collapsed ? "justify-center" : ""}`
            }
          >
            {({ isActive }) => (
              <>
                <Icon
                  size={20}
                  className={isActive ? "text-brand-600" : "text-slate-400 group-hover:text-slate-600"}
                />
                {!collapsed && <span>{label}</span>}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Collapse toggle */}
      <div className="border-t border-slate-100 p-3">
        <button
          type="button"
          onClick={onToggle}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-800"
        >
          <ChevronsLeft
            size={20}
            className={`transition-transform ${collapsed ? "rotate-180" : ""}`}
          />
          {!collapsed && <span>Collapse</span>}
        </button>
      </div>
    </aside>
  );
}
