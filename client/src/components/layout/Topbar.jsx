import { useState } from "react";
import { useNavigate } from "react-router";
import { Search, LogOut, User as UserIcon, ChevronDown, X } from "lucide-react";
import { useAuth } from "../../features/auth/useAuth.js";
import { ROLE_LABELS, ROLES } from "../../lib/roles.js";
import toast from "react-hot-toast";

export default function Topbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);

  const canSeeContent = user?.role !== ROLES.SUPER_ADMIN;
  const initial = user?.name?.charAt(0)?.toUpperCase() || "?";

  function handleSearch(e) {
    e.preventDefault();
    if (search.trim()) navigate(`/submodules?search=${encodeURIComponent(search.trim())}`);
  }

  async function handleLogout() {
    await logout();
    toast.success("Logged out");
    navigate("/login");
  }

  return (
    <header className="glass-panel relative z-20 flex h-14 shrink-0 items-center justify-between border-b border-surface-border-soft px-4">
      {canSeeContent ? (
        <form onSubmit={handleSearch} className="w-full max-w-md">
          <div
            className={`flex items-center gap-2 rounded-md border bg-surface-raised/80 px-3 py-1.5 transition-all duration-150 ${
              searchFocused ? "border-primary-500/50 ring-2 ring-primary-500/20" : "border-surface-border"
            }`}
          >
            <Search size={15} className="shrink-0 text-slate-500" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              placeholder="Search queries, tags, modules…"
              className="w-full bg-transparent text-sm text-slate-200 placeholder:text-slate-500 focus:outline-hidden"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="shrink-0 text-slate-500 transition-colors hover:text-slate-300"
                aria-label="Clear search"
              >
                <X size={13} />
              </button>
            )}
          </div>
        </form>
      ) : (
        <span />
      )}

      <div className="relative ml-4 shrink-0">
        <button
          onClick={() => setMenuOpen((o) => !o)}
          className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-slate-300 transition-colors duration-150 hover:bg-surface-raised"
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-linear-to-br from-primary-400 to-primary-600 text-xs font-semibold text-slate-950 ring-2 ring-surface-border-soft">
            {initial}
          </span>
          <span className="hidden text-left sm:block">
            <span className="block text-xs font-medium text-slate-100">{user?.name}</span>
            <span className="block text-[11px] text-slate-500">{ROLE_LABELS[user?.role]}</span>
          </span>
          <ChevronDown size={14} className={`text-slate-500 transition-transform duration-200 ${menuOpen ? "rotate-180" : ""}`} />
        </button>

        {menuOpen && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
            <div className="animate-panel-in absolute right-0 z-20 mt-2 max-h-72 w-48 overflow-y-auto rounded-lg border border-surface-border-soft bg-surface-overlay py-1 shadow-panel">
              <button
                onClick={() => {
                  setMenuOpen(false);
                  navigate("/settings");
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-300 transition-colors duration-150 hover:bg-surface-raised hover:text-slate-100"
              >
                <UserIcon size={14} /> Profile & Settings
              </button>
              <div className="my-1 border-t border-surface-border-soft" />
              <button
                onClick={handleLogout}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-400 transition-colors duration-150 hover:bg-red-500/10"
              >
                <LogOut size={14} /> Log out
              </button>
            </div>
          </>
        )}
      </div>
    </header>
  );
}
