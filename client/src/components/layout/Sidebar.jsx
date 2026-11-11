import { useState } from "react";
import { NavLink, useNavigate, useLocation } from "react-router";
import { useQuery } from "@tanstack/react-query";
import clsx from "clsx";
import {
  LayoutDashboard,
  LayoutGrid,
  Star,
  Users,
  ShieldCheck,
  KeyRound,
  Settings,
  ChevronRight,
  Folder,
  FolderOpen,
  Boxes,
  FileCode2,
  Sparkles,
} from "lucide-react";
import { categoryApi } from "../../features/categories/categoryApi.js";
import { useAuth } from "../../features/auth/useAuth.js";
import { ROLES } from "../../lib/roles.js";

function NavItem({ to, icon: Icon, label }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        clsx(
          "group relative flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors duration-150",
          isActive ? "text-primary-text" : "text-slate-400 hover:bg-surface-raised hover:text-slate-100"
        )
      }
    >
      {({ isActive }) => (
        <>
          {isActive && (
            <span className="absolute inset-0 rounded-md bg-primary-500/10 ring-1 ring-inset ring-primary-500/20" />
          )}
          {isActive && (
            <span className="absolute -left-2 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-full bg-primary-400" />
          )}
          <Icon size={16} className="relative shrink-0" />
          <span className="relative">{label}</span>
        </>
      )}
    </NavLink>
  );
}

function SubModuleNode({ subModule }) {
  const navigate = useNavigate();
  const location = useLocation();
  const isActive = location.pathname === `/submodules/${subModule._id}`;
  return (
    <button
      onClick={() => navigate(`/submodules/${subModule._id}`)}
      className={clsx(
        "flex w-full items-center gap-2 rounded-md py-1.5 pl-14 pr-3 text-left text-[13px] transition-colors duration-150",
        isActive ? "bg-primary-500/10 text-primary-text" : "text-slate-400 hover:bg-surface-raised hover:text-slate-100"
      )}
      title={subModule.name}
    >
      <FileCode2 size={13} className="shrink-0 text-slate-600 group-hover:text-slate-400" />
      <span className="truncate">{subModule.name}</span>
    </button>
  );
}

function ModuleNode({ module }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2 rounded-md py-1.5 pl-8 pr-3 text-left text-[13px] font-medium text-slate-300 transition-colors duration-150 hover:bg-surface-raised"
      >
        <ChevronRight size={12} className={clsx("shrink-0 text-slate-600 transition-transform duration-200 ease-out-expo", open && "rotate-90")} />
        <Boxes size={13} className="shrink-0 text-slate-500" />
        <span className="truncate">{module.name}</span>
      </button>
      {open && (
        <div className="animate-fade-in-up">
          {module.subModules.length === 0 ? (
            <p className="py-1 pl-14 text-[12px] text-slate-600">No sub modules</p>
          ) : (
            module.subModules.map((sm) => <SubModuleNode key={sm._id} subModule={sm} />)
          )}
        </div>
      )}
    </div>
  );
}

function CategoryNode({ category }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2 rounded-md px-3 py-1.5 text-left text-[13px] font-semibold text-slate-200 transition-colors duration-150 hover:bg-surface-raised"
      >
        <ChevronRight size={12} className={clsx("shrink-0 text-slate-500 transition-transform duration-200 ease-out-expo", open && "rotate-90")} />
        {open ? <FolderOpen size={14} className="shrink-0 text-primary-text" /> : <Folder size={14} className="shrink-0 text-slate-500" />}
        <span className="truncate">{category.name}</span>
      </button>
      {open && (
        <div className="animate-fade-in-up">
          {category.modules.length === 0 ? (
            <p className="py-1 pl-8 text-[12px] text-slate-600">No modules</p>
          ) : (
            category.modules.map((m) => <ModuleNode key={m._id} module={m} />)
          )}
        </div>
      )}
    </div>
  );
}

function TreeSkeleton() {
  return (
    <div className="space-y-2 px-3 py-1">
      {[0, 1, 2].map((i) => (
        <div key={i} className="skeleton h-4 rounded-sm" style={{ width: `${70 - i * 12}%` }} />
      ))}
    </div>
  );
}

export default function Sidebar() {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === ROLES.SUPER_ADMIN;
  const isAdmin = user?.role === ROLES.ADMIN;
  const canSeeContent = !isSuperAdmin; // Admin + User browse/manage content; Super Admin doesn't

  const { data, isLoading } = useQuery({
    queryKey: ["sidebar-tree"],
    queryFn: () => categoryApi.sidebar().then((r) => r.data.data),
    enabled: canSeeContent,
  });

  return (
    <aside className="relative z-10 hidden w-64 shrink-0 flex-col border-r border-surface-border bg-surface/80 backdrop-blur-xs md:flex">
      <div className="flex h-14 items-center gap-2.5 border-b border-surface-border-soft px-4">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary-500/15 text-primary-text shadow-glow-primary-sm">
          <Sparkles size={15} />
        </span>
        <span className="text-sm font-semibold tracking-tight text-slate-100">
          Query <span className="text-gradient">Master</span>
        </span>
      </div>

      <nav className="stagger-children flex flex-col gap-0.5 px-3 py-3">
        <NavItem to="/dashboard" icon={LayoutDashboard} label="Dashboard" />
        {isAdmin && <NavItem to="/admin-panel" icon={LayoutGrid} label="Admin Panel" />}
        {canSeeContent && <NavItem to="/submodules" icon={FileCode2} label="All Queries" />}
        {canSeeContent && <NavItem to="/favorites" icon={Star} label="Favorites" />}
        {(isSuperAdmin || isAdmin) && <NavItem to="/users" icon={Users} label="Users" />}
        {isSuperAdmin && <NavItem to="/admins" icon={ShieldCheck} label="Admins" />}
        {isAdmin && <NavItem to="/permissions" icon={KeyRound} label="Permissions" />}
      </nav>

      {canSeeContent && (
        <>
          <div className="flex items-center justify-between px-4 pb-1 pt-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-600">Explorer</span>
          </div>

          <div className="flex-1 overflow-y-auto px-2 pb-3">
            {isLoading ? (
              <TreeSkeleton />
            ) : !data || data.length === 0 ? (
              <p className="px-3 py-2 text-xs text-slate-600">No categories assigned yet.</p>
            ) : (
              data.map((cat) => <CategoryNode key={cat._id} category={cat} />)
            )}
          </div>
        </>
      )}

      <div className="border-t border-surface-border-soft px-3 py-2">
        <NavItem to="/settings" icon={Settings} label="Settings" />
      </div>
    </aside>
  );
}
