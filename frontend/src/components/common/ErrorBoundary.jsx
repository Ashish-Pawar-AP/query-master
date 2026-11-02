import { Component } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";

// Without a boundary, one render error anywhere unmounts the entire React tree and the
// user is left with a blank white page. Error boundaries must be class components —
// React has no hook equivalent.
//
// `resetKey` lets a parent clear the error automatically (AppShell passes the current
// route path), so navigating away from a crashed page recovers instead of staying stuck.
export default class ErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error("Unhandled render error:", error, info?.componentStack);
  }

  componentDidUpdate(prevProps) {
    if (this.state.error && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ error: null });
    }
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div role="alert" className="flex min-h-[50vh] flex-col items-center justify-center gap-4 p-8 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10 text-red-400">
          <AlertTriangle size={22} />
        </span>
        <div>
          <h2 className="text-base font-semibold text-slate-100">Something went wrong</h2>
          <p className="mt-1 max-w-sm text-sm text-slate-500">
            This page hit an unexpected error. The rest of the app is still working — try again, or reload if it keeps happening.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => this.setState({ error: null })}
            className="inline-flex items-center gap-2 rounded-md border border-surface-border bg-surface-overlay px-3.5 py-2 text-sm font-medium text-slate-100 transition-colors duration-150 hover:bg-surface-raised"
          >
            <RotateCcw size={14} /> Try again
          </button>
          <button
            onClick={() => window.location.reload()}
            className="rounded-md bg-primary-500 px-3.5 py-2 text-sm font-medium text-slate-950 shadow-glow-primary-sm transition-colors duration-150 hover:bg-primary-400"
          >
            Reload page
          </button>
        </div>
      </div>
    );
  }
}
