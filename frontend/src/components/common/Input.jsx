import clsx from "clsx";
import { forwardRef } from "react";

const Input = forwardRef(function Input({ label, error, className, ...rest }, ref) {
  return (
    <label className="flex flex-col gap-1.5">
      {label && <span className="text-xs font-medium text-slate-400">{label}</span>}
      <input
        ref={ref}
        className={clsx(
          "w-full rounded-md border bg-surface-raised px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500",
          "transition-[border-color,box-shadow] duration-150",
          "focus:outline-hidden focus:ring-2 focus:ring-primary-500/40 focus:border-primary-500/60",
          error ? "border-red-500/60" : "border-surface-border hover:border-slate-600",
          className
        )}
        {...rest}
      />
      {error && <span className="animate-fade-in text-xs text-red-400">{error}</span>}
    </label>
  );
});

export default Input;
