import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router";
import { Tooltip, ResponsiveContainer, CartesianGrid, Area, AreaChart, XAxis, YAxis } from "recharts";
import { Users, ShieldCheck, Folder, Boxes, FileCode2, ArrowUpRight, Clock } from "lucide-react";
import { dashboardApi } from "./dashboardApi.js";
import { useAuth } from "../auth/useAuth.js";
import { useTheme } from "../../hooks/useTheme.jsx";
import { ROLES } from "../../lib/roles.js";
import StatCard from "../../components/common/StatCard.jsx";
import PageHeader from "../../components/common/PageHeader.jsx";
import Spinner from "../../components/common/Spinner.jsx";
import Badge from "../../components/common/Badge.jsx";
import EmptyState from "../../components/common/EmptyState.jsx";

function Card({ title, children, className, icon: Icon }) {
  return (
    <div className={`rounded-xl border border-surface-border bg-surface-raised p-4 shadow-elevated ${className || ""}`}>
      <div className="mb-3 flex items-center gap-2">
        {Icon && <Icon size={14} className="text-slate-500" />}
        <h3 className="text-sm font-semibold text-slate-200">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function QueryLink({ q, navigate, tone = "accent" }) {
  return (
    <li>
      <button
        onClick={() => navigate(`/submodules/${q._id}`)}
        className="group flex w-full items-center justify-between rounded-md px-2 py-2 text-sm transition-colors duration-150 hover:bg-surface-overlay"
      >
        <span className="truncate text-left text-slate-300 group-hover:text-slate-100">{q.name}</span>
        <span className="flex shrink-0 items-center gap-1.5">
          <Badge tone={tone}>{q.queryType}</Badge>
          <ArrowUpRight size={13} className="text-slate-600 opacity-0 transition-opacity duration-150 group-hover:opacity-100" />
        </span>
      </button>
    </li>
  );
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-surface-border-soft bg-surface-overlay px-3 py-2 text-xs shadow-panel">
      <p className="mb-0.5 font-medium text-slate-300">{label}</p>
      <p className="text-primary-text">{payload[0].value} new users</p>
    </div>
  );
}

// Recharts renders raw SVG, so it can't pick up Tailwind's `dark:` classes — these colors
// have to be selected explicitly based on the active theme instead.
const CHART_COLORS = {
  dark: { grid: "#232C40", axis: "#64748B", cursor: "#334155", line: "#10B981", dotStroke: "#0B0F1A" },
  light: { grid: "#E2E8F0", axis: "#64748B", cursor: "#CBD5E1", line: "#059669", dotStroke: "#FFFFFF" },
};

// Super Admin's dashboard is deliberately scoped to Admins + Users only — no category,
// module, or query stats, and no "recently added" content feed. That's Admin's domain.
function SuperAdminDashboard({ data }) {
  const w = data.widgets;
  const { theme } = useTheme();
  const c = CHART_COLORS[theme];

  return (
    <>
      <div className="stagger-children grid grid-cols-2 gap-4 md:grid-cols-3">
        <StatCard label="Total Users" value={w.totalUsers} icon={Users} />
        <StatCard label="Total Admins" value={w.totalAdmins} icon={ShieldCheck} tone="accent" />
        <StatCard label="Active Users" value={w.activeUsers} icon={Users} tone="warning" />
      </div>

      <div className="mt-6">
        <Card title="User Growth">
          {data.userGrowth?.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={data.userGrowth}>
                <defs>
                  <linearGradient id="userGrowthFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={c.line} stopOpacity={0.35} />
                    <stop offset="100%" stopColor={c.line} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={c.grid} vertical={false} />
                <XAxis dataKey="month" stroke={c.axis} fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke={c.axis} fontSize={11} allowDecimals={false} tickLine={false} axisLine={false} />
                <Tooltip content={<CustomTooltip />} cursor={{ stroke: c.cursor, strokeWidth: 1 }} />
                <Area
                  type="monotone"
                  dataKey="count"
                  stroke={c.line}
                  strokeWidth={2.5}
                  fill="url(#userGrowthFill)"
                  dot={false}
                  activeDot={{ r: 4, fill: c.line, stroke: c.dotStroke, strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-slate-500">Not enough data yet.</p>
          )}
        </Card>
      </div>
    </>
  );
}

function AdminDashboard({ data }) {
  const w = data.widgets;
  return (
    <div className="stagger-children grid grid-cols-2 gap-4 md:grid-cols-4">
      <StatCard label="Users Created" value={w.usersCreated} icon={Users} />
      <StatCard label="Categories" value={w.categories} icon={Folder} tone="accent" />
      <StatCard label="Modules" value={w.modules} icon={Boxes} />
      <StatCard label="Queries Created" value={w.queriesCreated} icon={FileCode2} tone="warning" />
    </div>
  );
}

function UserDashboard({ data }) {
  const navigate = useNavigate();
  return (
    <Card title="Recently Viewed" icon={Clock} className="max-w-xl">
      {data.recentlyViewed?.length > 0 ? (
        <ul className="space-y-0.5">
          {data.recentlyViewed.map((q) => <QueryLink key={q._id} q={q} navigate={navigate} tone="neutral" />)}
        </ul>
      ) : (
        <EmptyState icon={FileCode2} title="Nothing viewed yet" description="Open a query to see it show up here." />
      )}
    </Card>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const { data, isLoading } = useQuery({ queryKey: ["dashboard"], queryFn: () => dashboardApi.get().then((r) => r.data.data) });

  return (
    <div>
      <PageHeader
        title={`Welcome back, ${user?.name?.split(" ")[0] || ""}`}
        description="Here's what's happening in Query Master."
      />
      {isLoading || !data ? (
        <Spinner />
      ) : data.role === ROLES.SUPER_ADMIN ? (
        <SuperAdminDashboard data={data} />
      ) : data.role === ROLES.ADMIN ? (
        <AdminDashboard data={data} />
      ) : (
        <UserDashboard data={data} />
      )}
    </div>
  );
}
