import { Wallet, Download, TrendingUp } from "lucide-react";
import { PageHeader } from "../components/ui/PageHeader.jsx";
import { Card } from "../components/ui/Card.jsx";
import { LoadingState } from "../components/ui/Spinner.jsx";
import { useAsync } from "../hooks/useAsync.js";
import { getPaystubs, getNextPayday } from "../services/api.js";
import { formatCurrency, formatDate } from "../lib/format.js";

export function Payroll() {
  const { data: paystubs, loading } = useAsync(getPaystubs);
  const { data: payday } = useAsync(getNextPayday);

  if (loading) return <LoadingState label="Loading paystubs…" />;

  const latest = paystubs[0];

  // Placeholder for a real download (e.g. blob from Azure Blob Storage / API).
  const handleDownload = (stub) => {
    // eslint-disable-next-line no-alert
    alert(`(Mock) Downloading paystub for ${stub.period}…`);
  };

  return (
    <div>
      <PageHeader
        icon={Wallet}
        title="Payroll"
        description="Your recent paystubs and upcoming pay."
      />

      {/* Summary */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="p-5">
          <p className="text-sm font-medium text-slate-500">Next payday</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">
            {payday ? formatDate(payday.date) : "—"}
          </p>
          <p className="mt-1 text-xs text-slate-400">
            Est. {payday ? formatCurrency(payday.amount) : "—"} net
          </p>
        </Card>
        <Card className="p-5">
          <p className="text-sm font-medium text-slate-500">Latest net pay</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">
            {formatCurrency(latest.net)}
          </p>
          <p className="mt-1 text-xs text-slate-400">{latest.period}</p>
        </Card>
        <Card className="p-5">
          <p className="flex items-center gap-1 text-sm font-medium text-slate-500">
            <TrendingUp size={15} className="text-emerald-500" /> YTD gross (est.)
          </p>
          <p className="mt-2 text-2xl font-bold text-slate-900">
            {formatCurrency(latest.gross * 13)}
          </p>
          <p className="mt-1 text-xs text-slate-400">Semi-monthly schedule</p>
        </Card>
      </div>

      {/* Paystub list */}
      <Card>
        <div className="border-b border-slate-100 px-5 py-4">
          <h3 className="text-sm font-semibold text-slate-900">Recent paystubs</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-400">
                <th className="px-5 py-3 font-medium">Pay period</th>
                <th className="px-5 py-3 font-medium">Pay date</th>
                <th className="px-5 py-3 text-right font-medium">Gross</th>
                <th className="px-5 py-3 text-right font-medium">Taxes</th>
                <th className="px-5 py-3 text-right font-medium">Net</th>
                <th className="px-5 py-3 text-right font-medium">Statement</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {paystubs.map((s) => (
                <tr key={s.id} className="transition-colors hover:bg-slate-50/60">
                  <td className="px-5 py-3.5 font-medium text-slate-800">{s.period}</td>
                  <td className="px-5 py-3.5 text-slate-600">{formatDate(s.payDate)}</td>
                  <td className="px-5 py-3.5 text-right text-slate-600">
                    {formatCurrency(s.gross)}
                  </td>
                  <td className="px-5 py-3.5 text-right text-rose-600">
                    −{formatCurrency(s.taxes)}
                  </td>
                  <td className="px-5 py-3.5 text-right font-semibold text-slate-900">
                    {formatCurrency(s.net)}
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <button
                      type="button"
                      onClick={() => handleDownload(s)}
                      title="Download PDF"
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-brand-50 hover:text-brand-600"
                    >
                      <Download size={17} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
