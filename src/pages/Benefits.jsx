import { ShieldCheck, Heart, Smile, Eye, IdCard } from "lucide-react";
import { PageHeader } from "../components/ui/PageHeader.jsx";
import { Card } from "../components/ui/Card.jsx";
import { LoadingState } from "../components/ui/Spinner.jsx";
import { useAsync } from "../hooks/useAsync.js";
import { getBenefits } from "../services/api.js";

function BenefitCard({ icon: Icon, accent, kind, plan }) {
  return (
    <Card className="flex flex-col">
      <div className="flex items-start justify-between border-b border-slate-100 p-5">
        <div className="flex items-center gap-3">
          <span className={`flex h-11 w-11 items-center justify-center rounded-xl ${accent}`}>
            <Icon size={22} />
          </span>
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-400">{kind}</p>
            <h3 className="text-base font-semibold text-slate-900">{plan.plan}</h3>
            <p className="text-xs text-slate-500">{plan.provider}</p>
          </div>
        </div>
        <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
          Active
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 border-b border-slate-100 p-5 text-sm">
        <div className="flex items-center gap-2 text-slate-500">
          <IdCard size={15} className="text-slate-400" />
          <span className="font-mono text-xs">{plan.memberId}</span>
        </div>
        <div className="text-right text-slate-500">
          <span className="font-semibold text-slate-800">{plan.premiumPerMonth}</span>/mo
        </div>
        <div className="col-span-2 text-slate-500">
          Coverage tier: <span className="text-slate-700">{plan.tier}</span>
        </div>
      </div>

      <ul className="divide-y divide-slate-50 p-2">
        {plan.coverage.map((c) => (
          <li key={c.label} className="flex items-center justify-between px-3 py-2.5 text-sm">
            <span className="text-slate-600">{c.label}</span>
            <span className="font-medium text-slate-900">{c.value}</span>
          </li>
        ))}
      </ul>
    </Card>
  );
}

export function Benefits() {
  const { data: benefits, loading } = useAsync(getBenefits);

  if (loading) return <LoadingState label="Loading your benefits…" />;

  return (
    <div>
      <PageHeader
        icon={ShieldCheck}
        title="Benefits"
        description="Your current health, dental, and vision coverage."
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <BenefitCard
          icon={Heart}
          accent="bg-rose-50 text-rose-600"
          kind="Health"
          plan={benefits.health}
        />
        <BenefitCard
          icon={Smile}
          accent="bg-sky-50 text-sky-600"
          kind="Dental"
          plan={benefits.dental}
        />
        <BenefitCard
          icon={Eye}
          accent="bg-violet-50 text-violet-600"
          kind="Vision"
          plan={benefits.vision}
        />
      </div>

      <Card className="mt-6 border-brand-100 bg-brand-50/50 p-5">
        <p className="text-sm text-slate-600">
          <span className="font-semibold text-slate-800">Open enrollment</span> runs
          each November. Have a qualifying life event? You have 30 days to make
          mid-year changes — just ask the Copilot to walk you through it.
        </p>
      </Card>
    </div>
  );
}
