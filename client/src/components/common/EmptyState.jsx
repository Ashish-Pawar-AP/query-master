export default function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="animate-fade-in-up flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-surface-border bg-surface-raised/30 py-16 text-center">
      {Icon && (
        <div className="rounded-full bg-surface-overlay p-3 text-slate-500 ring-1 ring-surface-border-soft">
          <Icon size={22} />
        </div>
      )}
      <div>
        <p className="text-sm font-medium text-slate-200">{title}</p>
        {description && <p className="mt-1 text-xs text-slate-500">{description}</p>}
      </div>
      {action}
    </div>
  );
}
