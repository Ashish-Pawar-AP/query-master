import clsx from "clsx";

const VARIANTS = {
  primary:
    "overflow-hidden bg-primary-500 text-slate-950 shadow-glow-primary-sm hover:bg-primary-400 hover:shadow-glow-primary focus-visible:ring-primary-400 before:pointer-events-none before:absolute before:inset-0 before:-translate-x-full before:bg-linear-to-r before:from-transparent before:via-white/30 before:to-transparent before:transition-transform before:duration-700 hover:before:translate-x-full",
  secondary:
    "bg-surface-overlay text-slate-100 border border-surface-border hover:bg-surface-raised hover:border-slate-600 focus-visible:ring-slate-500",
  ghost:
    "bg-transparent text-slate-300 hover:bg-surface-raised hover:text-slate-100 focus-visible:ring-slate-500",
  danger:
    "bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20 hover:border-red-500/50 focus-visible:ring-red-400",
};

const SIZES = {
  sm: "px-2.5 py-1.5 text-xs",
  md: "px-3.5 py-2 text-sm",
  lg: "px-5 py-2.5 text-sm",
};

export default function Button({
  variant = "primary",
  size = "md",
  className,
  icon: Icon,
  loading = false,
  disabled = false,
  children,
  ...rest
}) {
  return (
    <button
      className={clsx(
        "relative inline-flex items-center justify-center gap-2 rounded-md font-medium",
        "transition-[background-color,border-color,box-shadow,transform] duration-150 ease-out",
        "active:scale-[0.97]",
        "focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-surface",
        "disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100",
        VARIANTS[variant],
        SIZES[size],
        className
      )}
      disabled={disabled || loading}
      {...rest}
    >
      {loading ? (
        <span className="h-3.5 w-3.5 animate-spin-smooth rounded-full border-2 border-current border-t-transparent" />
      ) : (
        Icon && <Icon size={15} />
      )}
      {children}
    </button>
  );
}
