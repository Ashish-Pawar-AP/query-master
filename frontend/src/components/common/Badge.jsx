import clsx from "clsx";

const TONES = {
  neutral: "bg-slate-700/40 text-slate-300 border-slate-600/50",
  primary: "bg-primary-500/10 text-primary-text border-primary-500/30",
  accent: "bg-blue-500/10 text-blue-400 border-blue-500/30",
  warning: "bg-amber-500/10 text-amber-400 border-amber-500/30",
  danger: "bg-red-500/10 text-red-400 border-red-500/30",
  success: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
};

export default function Badge({ tone = "neutral", children, className, pulse = false }) {
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium",
        TONES[tone],
        className
      )}
    >
      {pulse && <span className="h-1.5 w-1.5 animate-pulse-ring rounded-full bg-current" />}
      {children}
    </span>
  );
}
