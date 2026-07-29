import { useState } from "react";
import { CalendarDays, Plus, Send } from "lucide-react";
import { PageHeader } from "../components/ui/PageHeader.jsx";
import { Card } from "../components/ui/Card.jsx";
import { Badge } from "../components/ui/Badge.jsx";
import { LoadingState } from "../components/ui/Spinner.jsx";
import { useAsync } from "../hooks/useAsync.js";
import {
  getLeaveRequests,
  getLeaveBalances,
  createLeaveRequest,
} from "../services/api.js";
import { formatDateRange } from "../lib/format.js";

const LEAVE_TYPES = ["Vacation", "Sick", "Personal"];

function daysBetween(start, end) {
  if (!start || !end) return 0;
  const ms = new Date(end) - new Date(start);
  return Math.max(0, Math.round(ms / 86400000) + 1);
}

export function Leave() {
  const { data: requests, loading, setData: setRequests } = useAsync(getLeaveRequests);
  const { data: balances } = useAsync(getLeaveBalances);

  const [form, setForm] = useState({
    type: "Vacation",
    startDate: "",
    endDate: "",
    reason: "",
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.startDate || !form.endDate) return;
    setSubmitting(true);
    const created = await createLeaveRequest({
      ...form,
      days: daysBetween(form.startDate, form.endDate),
    });
    setRequests((prev) => [created, ...(prev ?? [])]);
    setForm({ type: "Vacation", startDate: "", endDate: "", reason: "" });
    setSubmitting(false);
  };

  if (loading) return <LoadingState label="Loading leave requests…" />;

  return (
    <div>
      <PageHeader
        icon={CalendarDays}
        title="Leave"
        description="Review your time-off history and request new leave."
      />

      {/* Balance chips */}
      <div className="mb-6 flex flex-wrap gap-3">
        {balances?.map((b) => (
          <div
            key={b.type}
            className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm"
          >
            <div>
              <p className="text-xs text-slate-400">{b.type}</p>
              <p className="text-lg font-bold text-slate-900">
                {b.total - b.used}
                <span className="text-sm font-normal text-slate-400"> / {b.total} days</span>
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Requests table */}
        <Card className="lg:col-span-2">
          <div className="border-b border-slate-100 px-5 py-4">
            <h3 className="text-sm font-semibold text-slate-900">Leave requests</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-400">
                  <th className="px-5 py-3 font-medium">Type</th>
                  <th className="px-5 py-3 font-medium">Dates</th>
                  <th className="px-5 py-3 font-medium">Days</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {requests?.map((r) => (
                  <tr key={r.id} className="transition-colors hover:bg-slate-50/60">
                    <td className="px-5 py-3.5">
                      <span className="font-medium text-slate-800">{r.type}</span>
                      {r.reason && (
                        <p className="text-xs text-slate-400">{r.reason}</p>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-slate-600">
                      {formatDateRange(r.startDate, r.endDate)}
                    </td>
                    <td className="px-5 py-3.5 text-slate-600">{r.days}</td>
                    <td className="px-5 py-3.5">
                      <Badge status={r.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Request form */}
        <Card>
          <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-4">
            <Plus size={16} className="text-brand-600" />
            <h3 className="text-sm font-semibold text-slate-900">Request time off</h3>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4 p-5">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-500">
                Leave type
              </label>
              <select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
              >
                {LEAVE_TYPES.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-500">
                  From
                </label>
                <input
                  type="date"
                  required
                  value={form.startDate}
                  onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-500">
                  To
                </label>
                <input
                  type="date"
                  required
                  min={form.startDate}
                  value={form.endDate}
                  onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
                />
              </div>
            </div>

            {form.startDate && form.endDate && (
              <p className="text-xs text-slate-400">
                Requesting{" "}
                <span className="font-semibold text-slate-600">
                  {daysBetween(form.startDate, form.endDate)} day(s)
                </span>
              </p>
            )}

            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-500">
                Reason (optional)
              </label>
              <textarea
                rows={3}
                value={form.reason}
                onChange={(e) => setForm({ ...form, reason: e.target.value })}
                placeholder="e.g. Family trip"
                className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-700 disabled:opacity-50"
            >
              <Send size={16} />
              {submitting ? "Submitting…" : "Submit request"}
            </button>
          </form>
        </Card>
      </div>
    </div>
  );
}
