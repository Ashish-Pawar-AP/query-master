import clsx from "clsx";

// Accessible on/off switch (role="switch") with an optional label and hint.
export default function Switch({ checked, onChange, label, hint, disabled = false }) {
  return (
    <div className="flex items-start gap-3">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={clsx(
          "relative mt-0.5 h-5 w-9 shrink-0 rounded-full border transition-colors duration-200 ease-out-expo",
          "focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:ring-offset-2 focus-visible:ring-offset-surface",
          "disabled:cursor-not-allowed disabled:opacity-50",
          checked ? "border-primary-500/60 bg-primary-500 shadow-glow-primary-sm" : "border-surface-border bg-surface-overlay"
        )}
      >
        <span className={clsx("absolute left-0.5 top-0.5 h-3.5 w-3.5 rounded-full bg-white shadow transition-transform duration-200 ease-out-expo", checked && "translate-x-4")} />
      </button>
      {(label || hint) && (
        <div>
          {label && <p className="text-sm font-medium text-slate-200">{label}</p>}
          {hint && <p className="text-xs text-slate-500">{hint}</p>}
        </div>
      )}
    </div>
  );
}
