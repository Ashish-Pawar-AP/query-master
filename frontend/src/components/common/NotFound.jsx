import { Link } from "react-router";
import { Compass } from "lucide-react";

export default function NotFound() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center gap-4 overflow-hidden bg-surface text-center">
      <div className="ambient-blob animate-blob-float left-1/2 top-1/2 h-96 w-96 -translate-x-1/2 -translate-y-1/2 bg-primary-500/[0.06]" aria-hidden="true" />
      <div className="animate-fade-in-up relative flex flex-col items-center gap-4">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-surface-raised text-slate-500 ring-1 ring-surface-border-soft">
          <Compass size={26} />
        </span>
        <div>
          <p className="text-5xl font-bold tracking-tight text-slate-800">404</p>
          <h1 className="mt-2 text-lg font-semibold text-slate-200">Page not found.</h1>
          <p className="mt-1 text-sm text-slate-500">The page you're looking for doesn't exist.</p>
        </div>
        <Link
          to="/dashboard"
          className="mt-2 rounded-md bg-primary-500 px-4 py-2 text-sm font-medium text-slate-950 shadow-glow-primary-sm transition-all duration-150 hover:bg-primary-400 hover:shadow-glow-primary active:scale-[0.97]"
        >
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
