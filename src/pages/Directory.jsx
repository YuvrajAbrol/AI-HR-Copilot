import { useMemo, useState } from "react";
import { Users, Search, Mail, MapPin, Building2 } from "lucide-react";
import { PageHeader } from "../components/ui/PageHeader.jsx";
import { Card } from "../components/ui/Card.jsx";
import { Avatar } from "../components/ui/Avatar.jsx";
import { LoadingState } from "../components/ui/Spinner.jsx";
import { useAsync } from "../hooks/useAsync.js";
import { getEmployees } from "../services/api.js";

export function Directory() {
  const { data: employees, loading } = useAsync(getEmployees);
  const [query, setQuery] = useState("");
  const [dept, setDept] = useState("All");

  const departments = useMemo(() => {
    if (!employees) return ["All"];
    return ["All", ...new Set(employees.map((e) => e.department))];
  }, [employees]);

  const filtered = useMemo(() => {
    if (!employees) return [];
    const q = query.toLowerCase().trim();
    return employees.filter((e) => {
      const matchesDept = dept === "All" || e.department === dept;
      const matchesQuery =
        !q ||
        e.name.toLowerCase().includes(q) ||
        e.title.toLowerCase().includes(q) ||
        e.department.toLowerCase().includes(q) ||
        e.email.toLowerCase().includes(q);
      return matchesDept && matchesQuery;
    });
  }, [employees, query, dept]);

  if (loading) return <LoadingState label="Loading directory…" />;

  return (
    <div>
      <PageHeader
        icon={Users}
        title="Directory"
        description={`${employees.length} people across ${departments.length - 1} departments.`}
      />

      {/* Controls */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search
            size={18}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, role, or department…"
            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-700 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
          />
        </div>
        <select
          value={dept}
          onChange={(e) => setDept(e.target.value)}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
        >
          {departments.map((d) => (
            <option key={d}>{d}</option>
          ))}
        </select>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <Card className="p-10 text-center text-sm text-slate-400">
          No employees match your search.
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((e) => (
            <Card key={e.id} className="p-5 transition-shadow hover:shadow-md">
              <div className="flex items-center gap-3">
                <Avatar initials={e.initials} name={e.name} size="lg" />
                <div className="min-w-0">
                  <p className="truncate font-semibold text-slate-900">{e.name}</p>
                  <p className="truncate text-sm text-slate-500">{e.title}</p>
                </div>
              </div>
              <div className="mt-4 space-y-2 text-sm text-slate-500">
                <p className="flex items-center gap-2">
                  <Building2 size={15} className="text-slate-400" /> {e.department}
                </p>
                <p className="flex items-center gap-2">
                  <MapPin size={15} className="text-slate-400" /> {e.location}
                </p>
                <a
                  href={`mailto:${e.email}`}
                  className="flex items-center gap-2 text-brand-600 hover:underline"
                >
                  <Mail size={15} /> <span className="truncate">{e.email}</span>
                </a>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
