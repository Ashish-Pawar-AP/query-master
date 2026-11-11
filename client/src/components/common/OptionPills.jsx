import clsx from "clsx";

// Multi-select for ARRAY fields marked "multiple": the admin-defined options as toggle
// pills, so the user can pick several (single-select ARRAY fields stay a dropdown).
export default function OptionPills({ options = [], values = [], onChange, disabled = false, ariaLabel }) {
  if (options.length === 0) {
    return <p className="text-xs text-slate-600">No options have been defined for this field.</p>;
  }

  const selected = new Set(values);
  // Keep the admin's option order regardless of the order they were clicked in.
  const emit = (set) => onChange(options.filter((option) => set.has(option)));

  function toggle(option) {
    const next = new Set(selected);
    if (next.has(option)) next.delete(option);
    else next.add(option);
    emit(next);
  }

  return (
    <div role="group" aria-label={ariaLabel} className={clsx("space-y-1.5", disabled && "opacity-40")}>
      <div className="flex flex-wrap gap-1.5">
        {options.map((option) => {
          const active = selected.has(option);
          return (
            <button
              key={option}
              type="button"
              role="checkbox"
              aria-checked={active}
              disabled={disabled}
              onClick={() => toggle(option)}
              className={clsx(
                "rounded-full border px-2.5 py-1 text-xs font-medium transition-all duration-150 active:scale-95 disabled:cursor-not-allowed",
                active
                  ? "border-primary-500/40 bg-primary-500/15 text-primary-text"
                  : "border-surface-border text-slate-500 hover:border-slate-600 hover:text-slate-300"
              )}
            >
              {option}
            </button>
          );
        })}
      </div>
      <div className="flex gap-3 text-[11px] text-slate-500">
        <button type="button" disabled={disabled} onClick={() => emit(new Set(options))} className="transition-colors hover:text-slate-300 disabled:cursor-not-allowed">
          Select all
        </button>
        <button type="button" disabled={disabled} onClick={() => emit(new Set())} className="transition-colors hover:text-slate-300 disabled:cursor-not-allowed">
          Clear
        </button>
      </div>
    </div>
  );
}
