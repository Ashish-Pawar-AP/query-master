import { useCountUp } from "../../hooks/useCountUp.js";

export default function StatCard({ label, value, icon: Icon, tone = "primary" }) {
  const shown = useCountUp(value);
  const toneClasses = {
    primary: "text-primary-text bg-primary-500/10 group-hover:shadow-glow-primary-sm",
    accent: "text-blue-400 bg-blue-500/10",
    warning: "text-amber-400 bg-amber-500/10",
  };
  return (
    <div className="group relative overflow-hidden rounded-xl border border-surface-border bg-surface-raised p-4 transition-all duration-300 ease-out-expo hover:-translate-y-0.5 hover:border-slate-600 hover:shadow-elevated">
      <span className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-primary-500/[0.07] blur-2xl transition-opacity duration-300 group-hover:opacity-100 opacity-0" />
      <div className="relative flex items-center justify-between">
        <span className="text-xs font-medium text-slate-400">{label}</span>
        {Icon && (
          <span className={`rounded-md p-1.5 transition-all duration-300 group-hover:scale-110 ${toneClasses[tone] || toneClasses.primary}`}>
            <Icon size={14} />
          </span>
        )}
      </div>
      <p className="relative mt-2 text-2xl font-semibold tracking-tight text-slate-100 tabular-nums">{shown}</p>
    </div>
  );
}
