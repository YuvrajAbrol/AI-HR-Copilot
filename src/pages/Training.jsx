import { useState } from "react";
import {
  GraduationCap,
  Clock,
  ShieldCheck,
  Lock,
  Rocket,
  BookOpen,
  Play,
  CheckCircle2,
} from "lucide-react";
import { PageHeader } from "../components/ui/PageHeader.jsx";
import { Card } from "../components/ui/Card.jsx";
import { Badge } from "../components/ui/Badge.jsx";
import { LoadingState } from "../components/ui/Spinner.jsx";
import { useAsync } from "../hooks/useAsync.js";
import { getTrainingCourses } from "../services/api.js";
import { formatDate } from "../lib/format.js";

const CATEGORY_META = {
  Compliance: { icon: ShieldCheck, accent: "bg-amber-50 text-amber-600" },
  Security: { icon: Lock, accent: "bg-rose-50 text-rose-600" },
  Leadership: { icon: Rocket, accent: "bg-violet-50 text-violet-600" },
  Career: { icon: BookOpen, accent: "bg-sky-50 text-sky-600" },
};

const FILTERS = ["All", "Compliance", "Security", "Leadership", "Career"];

function CourseCard({ course }) {
  const meta = CATEGORY_META[course.category] || CATEGORY_META.Career;
  const Icon = meta.icon;
  const done = course.status === "Completed";

  return (
    <Card className="flex flex-col p-5">
      <div className="flex items-start justify-between">
        <span className={`flex h-11 w-11 items-center justify-center rounded-xl ${meta.accent}`}>
          <Icon size={22} />
        </span>
        <Badge status={course.status} />
      </div>

      <h3 className="mt-4 text-base font-semibold text-slate-900">{course.title}</h3>
      <p className="mt-1 flex-1 text-sm text-slate-500">{course.description}</p>

      <div className="mt-4 flex items-center gap-3 text-xs text-slate-400">
        <span className="inline-flex items-center gap-1">
          <Clock size={13} /> {course.duration}
        </span>
        <span>·</span>
        <span>Due {formatDate(course.dueDate)}</span>
      </div>

      {course.progress > 0 && course.progress < 100 && (
        <div className="mt-3">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-brand-500"
              style={{ width: `${course.progress}%` }}
            />
          </div>
          <p className="mt-1 text-xs text-slate-400">{course.progress}% complete</p>
        </div>
      )}

      <button
        type="button"
        className={`mt-4 flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold transition-colors ${
          done
            ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
            : "bg-brand-600 text-white hover:bg-brand-700"
        }`}
      >
        {done ? (
          <>
            <CheckCircle2 size={16} /> View certificate
          </>
        ) : (
          <>
            <Play size={16} /> {course.progress > 0 ? "Resume" : "Start course"}
          </>
        )}
      </button>
    </Card>
  );
}

export function Training() {
  const { data: courses, loading } = useAsync(getTrainingCourses);
  const [filter, setFilter] = useState("All");

  if (loading) return <LoadingState label="Loading training catalog…" />;

  const filtered =
    filter === "All" ? courses : courses.filter((c) => c.category === filter);
  const completed = courses.filter((c) => c.status === "Completed").length;

  return (
    <div>
      <PageHeader
        icon={GraduationCap}
        title="Training"
        description={`You've completed ${completed} of ${courses.length} assigned courses.`}
      />

      <div className="mb-6 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
              filter === f
                ? "bg-brand-600 text-white"
                : "bg-white text-slate-600 ring-1 ring-inset ring-slate-200 hover:bg-slate-50"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((course) => (
          <CourseCard key={course.id} course={course} />
        ))}
      </div>
    </div>
  );
}
