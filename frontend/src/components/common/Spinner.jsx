export default function Spinner({ label = "Loading" }) {
  return (
    <div className="flex animate-fade-in items-center justify-center gap-2.5 py-10 text-slate-500">
      <span className="relative h-4 w-4">
        <span className="absolute inset-0 animate-spin-smooth rounded-full border-2 border-slate-700 border-t-primary-500" />
      </span>
      <span className="text-xs">{label}…</span>
    </div>
  );
}
