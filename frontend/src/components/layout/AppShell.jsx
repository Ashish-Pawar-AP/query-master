import { Outlet, useLocation } from "react-router";
import Sidebar from "./Sidebar.jsx";
import Topbar from "./Topbar.jsx";
import ErrorBoundary from "../common/ErrorBoundary.jsx";

export default function AppShell() {
  const { pathname } = useLocation();
  return (
    <div className="relative flex h-screen overflow-hidden bg-surface">
      {/* Faint ambient glow anchored behind the main content — subtle depth, never
          behind text or interactive controls, fixed so it doesn't move with scroll. */}
      <div
        className="ambient-blob animate-blob-float -right-32 -top-32 h-96 w-96 bg-primary-500/[0.06]"
        aria-hidden="true"
      />
      <div
        className="ambient-blob animate-blob-float bottom-0 left-1/3 h-80 w-80 bg-blue-500/[0.04]"
        style={{ animationDelay: "-9s" }}
        aria-hidden="true"
      />

      <Sidebar />
      <div className="relative z-10 flex min-w-0 flex-1 flex-col">
        <Topbar />
        <main className="flex-1 overflow-y-auto p-6">
          {/* A crash in one page leaves the sidebar/topbar alive, and clears on navigation */}
          <ErrorBoundary resetKey={pathname}>
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
}
