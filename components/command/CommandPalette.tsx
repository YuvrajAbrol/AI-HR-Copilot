"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Search, CornerDownLeft, Bot, ArrowRight } from "lucide-react";
import { useWorkspace } from "@/lib/workspace";
import { MODULES } from "@/lib/modules";
import { canAccessModule, visibleEmployees } from "@/lib/rbac";
import { Avatar } from "@/components/ui/Avatar";
import { KeyCap } from "@/components/ui/Misc";
import type { ModuleId } from "@/lib/copilot";

interface Item {
  id: string;
  group: string;
  label: string;
  hint?: string;
  render?: () => React.ReactNode;
  run: () => void;
}

export function CommandPalette() {
  const {
    paletteOpen,
    setPaletteOpen,
    role,
    currentUser,
    data,
    setModule,
    openEmployee,
    sendMessage,
  } = useWorkspace();
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (paletteOpen) {
      setQuery("");
      setActive(0);
    }
  }, [paletteOpen]);

  const scope = useMemo(
    () => visibleEmployees(role, currentUser.id, data.employees),
    [role, currentUser.id, data.employees]
  );

  const items = useMemo<Item[]>(() => {
    const nav: Item[] = MODULES.filter((m) => canAccessModule(role, m.id)).map((m) => ({
      id: `nav-${m.id}`,
      group: "Navigate",
      label: m.label,
      hint: m.description,
      run: () => {
        setModule(m.id as ModuleId);
        setPaletteOpen(false);
      },
    }));

    const people: Item[] = scope.slice(0, 40).map((e) => ({
      id: `emp-${e.id}`,
      group: "People",
      label: e.name,
      hint: `${e.title} · ${e.department}`,
      render: () => (
        <span className="flex items-center gap-2">
          <Avatar initials={e.initials} seed={e.name} size="xs" />
          <span>
            <span className="text-zinc-800">{e.name}</span>
            <span className="ml-2 text-xs text-zinc-400">{e.title}</span>
          </span>
        </span>
      ),
      run: () => {
        setModule("core-hr");
        openEmployee(e.id);
        setPaletteOpen(false);
      },
    }));

    const q = query.trim();
    const actions: Item[] = q
      ? [
          {
            id: "ask",
            group: "Copilot",
            label: `Ask copilot: “${q}”`,
            hint: "RBAC-verified query",
            run: () => {
              sendMessage(q);
              setPaletteOpen(false);
            },
          },
        ]
      : [];

    return [...actions, ...nav, ...people];
  }, [role, scope, query, setModule, openEmployee, sendMessage, setPaletteOpen]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (it) => it.id === "ask" || it.label.toLowerCase().includes(q) || it.hint?.toLowerCase().includes(q)
    );
  }, [items, query]);

  useEffect(() => setActive(0), [query]);

  useEffect(() => {
    if (!paletteOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActive((a) => Math.min(a + 1, filtered.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActive((a) => Math.max(a - 1, 0));
      } else if (e.key === "Enter") {
        e.preventDefault();
        filtered[active]?.run();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [paletteOpen, filtered, active]);

  // Group for display while keeping a flat index for keyboard nav.
  let runningIndex = -1;
  const groups = ["Copilot", "Navigate", "People"].map((g) => ({
    group: g,
    items: filtered.filter((it) => it.group === g),
  })).filter((g) => g.items.length);

  return (
    <AnimatePresence>
      {paletteOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setPaletteOpen(false)}
          className="fixed inset-0 z-[60] flex items-start justify-center bg-zinc-900/40 p-4 pt-[12vh]"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.98, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: -8 }}
            transition={{ duration: 0.15 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-xl overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-2xl"
          >
            <div className="flex items-center gap-2 border-b border-zinc-200 px-3">
              <Search size={16} className="text-zinc-400" />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search modules, people, or ask the copilot…"
                className="h-12 flex-1 bg-transparent text-sm text-zinc-800 outline-none placeholder:text-zinc-400"
              />
              <KeyCap>Esc</KeyCap>
            </div>

            <div className="max-h-[52vh] overflow-y-auto py-1.5">
              {groups.map(({ group, items: gItems }) => (
                <div key={group} className="mb-1">
                  <p className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-zinc-400">{group}</p>
                  {gItems.map((it) => {
                    runningIndex += 1;
                    const idx = runningIndex;
                    const isActive = idx === active;
                    return (
                      <button
                        key={it.id}
                        onMouseEnter={() => setActive(idx)}
                        onClick={it.run}
                        className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm ${
                          isActive ? "bg-zinc-100" : ""
                        }`}
                      >
                        {it.id === "ask" && <Bot size={15} className="text-accent-600" />}
                        <span className="flex-1 truncate">
                          {it.render ? it.render() : <span className="text-zinc-800">{it.label}</span>}
                          {it.hint && it.id !== "emp" && !it.render && (
                            <span className="ml-2 text-xs text-zinc-400">{it.hint}</span>
                          )}
                        </span>
                        {isActive ? (
                          <CornerDownLeft size={13} className="text-zinc-400" />
                        ) : (
                          <ArrowRight size={13} className="text-zinc-300" />
                        )}
                      </button>
                    );
                  })}
                </div>
              ))}
              {filtered.length === 0 && (
                <p className="px-3 py-8 text-center text-sm text-zinc-400">No results.</p>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
