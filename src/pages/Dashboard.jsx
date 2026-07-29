import {
  LayoutDashboard,
  CalendarDays,
  Wallet,
  GraduationCap,
  ArrowUpRight,
  Sparkles,
  Clock,
} from "lucide-react";
import { PageHeader } from "../components/ui/PageHeader.jsx";
import { Card } from "../components/ui/Card.jsx";
import { Badge } from "../components/ui/Badge.jsx";
import { LoadingState } from "../components/ui/Spinner.jsx";
import { useAsync } from "../hooks/useAsync.js";
import { useCopilot } from "../context/CopilotContext.jsx";
import {
  getLeaveBalances,
  getNextPayday,
  getTrainingCourses,
  getCurrentUser,
} from "../services/api.js";
import { formatCurrency, formatDate } from "../lib/format.js";

function StatCard({ icon: Icon, label, value, sub, accent }) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
            {value}
          </p>
          {sub && <p className="mt-1 text-xs text-slate-400">{sub}</p>}
        </div>
        <span className={`flex h-11 w-11 items-center justify-center rounded-xl ${accent}`}>
          <Icon size={22} />
        </span>
      </div>
    </Card>
  );
}

export function Dashboard() {
  const { data: user } = useAsync(getCurrentUser);
  const { data: balances, loading: loadingBalances } = useAsync(getLeaveBalances);
  const { data: payday } = useAsync(getNextPayday);
  const { data: courses, loading: loadingCourses } = useAsync(getTrainingCourses);
  const { askCopilot } = useCopilot();

  const vacation = balances?.find((b) => b.type === "Vacation");
  const vacationLeft = vacation ? vacation.total - vacation.used : "—";
  const pendingTraining = courses?.filter((c) => c.status !== "Completed") ?? [];

  if (loadingBalances || loadingCourses) {
    return <LoadingState label="Loading your dashboard…" />;
  }

  return (
    <div>
      <PageHeader
        icon={LayoutDashboard}
        title={`Welcome back, ${user?.name.split(" ")[0] ?? ""} 👋`}
        description="Here's a snapshot of your HR world today."
      />

      {/* Quick stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          icon={CalendarDays}
          label="Vacation days left"
          value={vacationLeft}
          sub={`of ${vacation?.total ?? 0} annual days`}
          accent="bg-brand-50 text-brand-600"
        />
        <StatCard
          icon={Wallet}
          label="Next payday"
          value={payday ? formatDate(payday.date, { month: "short", day: "numeric" }) : "—"}
          sub={payday ? `Est. ${formatCurrency(payday.amount)} net` : ""}
          accent="bg-emerald-50 text-emerald-600"
        />
        <StatCard
          icon={GraduationCap}
          label="Pending training"
          value={pendingTraining.length}
          sub={pendingTraining[0] ? `Next: ${pendingTraining[0].title}` : "All caught up"}
          accent="bg-amber-50 text-amber-600"
        />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Leave balances */}
        <Card className="lg:col-span-2">
          <div className="border-b border-slate-100 px-5 py-4">
            <h3 className="text-sm font-semibold text-slate-900">Leave balances</h3>
          </div>
          <div className="space-y-5 p-5">
            {balances?.map((b) => {
              const left = b.total - b.used;
              const pct = Math.round((b.used / b.total) * 100);
              const barColor =
                b.color === "rose"
                  ? "bg-rose-500"
                  : b.color === "amber"
                    ? "bg-amber-500"
                    : "bg-brand-500";
              return (
                <div key={b.type}>
                  <div className="mb-1.5 flex items-center justify-between text-sm">
                    <span className="font-medium text-slate-700">{b.type}</span>
                    <span className="text-slate-500">
                      <span className="font-semibold text-slate-800">{left}</span> left
                      <span className="text-slate-400"> / {b.total}</span>
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={`h-full rounded-full ${barColor}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Copilot CTA */}
        <Card className="relative overflow-hidden bg-gradient-to-br from-brand-600 to-brand-800 text-white">
          <div className="p-5">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/15">
              <Sparkles size={22} />
            </span>
            <h3 className="mt-4 text-lg font-bold">Ask the HR Copilot</h3>
            <p className="mt-1 text-sm text-brand-100">
              One assistant for leave, benefits, payroll, training &amp; people —
              powered by multi-tool AI.
            </p>
            <div className="mt-4 space-y-2">
              {[
                "How many sick days do I have and what is the policy?",
                "When is my next payday?",
              ].map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => askCopilot(q)}
                  className="flex w-full items-center justify-between gap-2 rounded-xl bg-white/10 px-3 py-2 text-left text-sm font-medium text-white transition-colors hover:bg-white/20"
                >
                  <span className="line-clamp-1">{q}</span>
                  <ArrowUpRight size={16} className="shrink-0 opacity-70" />
                </button>
              ))}
            </div>
          </div>
        </Card>
      </div>

      {/* Upcoming / pending training */}
      <Card className="mt-6">
        <div className="border-b border-slate-100 px-5 py-4">
          <h3 className="text-sm font-semibold text-slate-900">To-do &amp; upcoming</h3>
        </div>
        <ul className="divide-y divide-slate-100">
          {pendingTraining.slice(0, 3).map((c) => (
            <li key={c.id} className="flex items-center gap-3 px-5 py-3.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
                <Clock size={17} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-800">{c.title}</p>
                <p className="text-xs text-slate-400">Due {formatDate(c.dueDate)}</p>
              </div>
              <Badge status={c.status} />
            </li>
          ))}
          {pendingTraining.length === 0 && (
            <li className="px-5 py-6 text-center text-sm text-slate-400">
              You're all caught up. Nice work!
            </li>
          )}
        </ul>
      </Card>
    </div>
  );
}
