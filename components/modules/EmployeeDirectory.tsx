"use client";

import { useMemo, useState } from "react";
import { Users, Search } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmployeeCard } from "@/components/dashboard/EmployeeCard";
import { EMPLOYEES } from "@/lib/mockData";

export function EmployeeDirectory() {
  const [query, setQuery] = useState("");
  const [dept, setDept] = useState("All");

  const departments = useMemo(
    () => ["All", ...Array.from(new Set(EMPLOYEES.map((e) => e.department)))],
    []
  );

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    return EMPLOYEES.filter((e) => {
      const matchesDept = dept === "All" || e.department === dept;
      const matchesQuery =
        !q ||
        e.name.toLowerCase().includes(q) ||
        e.title.toLowerCase().includes(q) ||
        e.department.toLowerCase().includes(q);
      return matchesDept && matchesQuery;
    });
  }, [query, dept]);

  return (
    <div>
      <PageHeader
        icon={Users}
        title="Employee Directory"
        description={`${EMPLOYEES.length} employees · ${departments.length - 1} departments`}
      />

      <div className="mb-5 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, role, or department…"
            className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-700 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
          />
        </div>
        <select
          value={dept}
          onChange={(e) => setDept(e.target.value)}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
        >
          {departments.map((d) => (
            <option key={d}>{d}</option>
          ))}
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-400">
          No employees match your search.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {filtered.map((e) => (
            <EmployeeCard key={e.id} employee={e} />
          ))}
        </div>
      )}
    </div>
  );
}
