import { Loader2 } from "lucide-react";

export function Spinner({ size = 20, className = "" }) {
  return <Loader2 size={size} className={`animate-spin ${className}`} />;
}

export function LoadingState({ label = "Loading…" }) {
  return (
    <div className="flex items-center justify-center gap-2 py-16 text-sm text-slate-400">
      <Spinner /> {label}
    </div>
  );
}
