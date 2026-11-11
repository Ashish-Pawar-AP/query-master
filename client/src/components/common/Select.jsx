import clsx from "clsx";
import { forwardRef } from "react";
import { ChevronDown } from "lucide-react";

const Select = forwardRef(function Select({ label, error, className, children, ...rest }, ref) {
  return (
    <label className="flex flex-col gap-1.5">
      {label && <span className="text-xs font-medium text-slate-400">{label}</span>}
      <div className="relative">
        <select
          ref={ref}
          className={clsx(
            "w-full appearance-none rounded-md border bg-surface-raised px-3 py-2 pr-8 text-sm text-slate-100",
            "transition-[border-color,box-shadow] duration-150",
            "focus:outline-hidden focus:ring-2 focus:ring-primary-500/40 focus:border-primary-500/60",
            "disabled:cursor-not-allowed disabled:opacity-50",
            error ? "border-red-500/60" : "border-surface-border hover:border-slate-600",
            className
          )}
          {...rest}
        >
          {children}
        </select>
        <ChevronDown size={14} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
      </div>
      {error && <span className="animate-fade-in text-xs text-red-400">{error}</span>}
    </label>
  );
});

export default Select;
