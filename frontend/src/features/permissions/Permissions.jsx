import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Save, KeyRound, ArrowLeft, Folder, Boxes, FileCode2, ShieldCheck } from "lucide-react";
import clsx from "clsx";
import toast from "react-hot-toast";
import { userApi } from "../../features/users/userApi.js";
import { categoryApi } from "../../features/categories/categoryApi.js";
import { permissionApi } from "./permissionApi.js";
import { PERMISSION_ACTIONS } from "../../lib/roles.js";
import PageHeader from "../../components/common/PageHeader.jsx";
import Button from "../../components/common/Button.jsx";
import DataTable from "../../components/common/DataTable.jsx";
import Spinner from "../../components/common/Spinner.jsx";

function UserPicker() {
  const navigate = useNavigate();
  const { data, isLoading } = useQuery({ queryKey: ["users", "USER"], queryFn: () => userApi.list({ role: "USER" }).then((r) => r.data.data) });

  const columns = [
    { key: "name", label: "Name", render: (row) => <span className="font-medium text-slate-100">{row.name}</span> },
    { key: "email", label: "Email" },
    {
      key: "actions",
      label: "",
      render: (row) => (
        <Button variant="ghost" size="sm" icon={KeyRound} onClick={() => navigate(`/permissions/${row._id}`)}>
          Manage Access
        </Button>
      ),
    },
  ];

  return (
    <div className="animate-fade-in-up">
      <PageHeader title="Permissions" description="Select a user to assign Category → Module → Sub Module access." />
      <DataTable columns={columns} rows={data} loading={isLoading} emptyTitle="No users yet" />
    </div>
  );
}

function ActionPill({ action, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        "rounded-full border px-2 py-0.5 text-[11px] font-medium transition-all duration-150 active:scale-95",
        active
          ? "border-primary-500/40 bg-primary-500/15 text-primary-text"
          : "border-surface-border text-slate-500 hover:border-slate-600 hover:text-slate-300"
      )}
    >
      {action}
    </button>
  );
}

function AccessTree({ tree, grants, toggleAction }) {
  return (
    <div className="space-y-4">
      {tree.map((cat) => (
        <div key={cat._id} className="rounded-xl border border-surface-border bg-surface-raised p-4 shadow-elevated">
          <div className="mb-3 flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-surface-overlay text-slate-400">
              <Folder size={13} />
            </span>
            <h3 className="text-sm font-semibold text-slate-100">{cat.name}</h3>
          </div>
          {cat.modules.length === 0 ? (
            <p className="pl-8 text-xs text-slate-600">No modules</p>
          ) : (
            <div className="space-y-4 pl-2">
              {cat.modules.map((mod) => (
                <div key={mod._id} className="border-l border-surface-border-soft pl-4">
                  <div className="mb-2 flex items-center gap-1.5">
                    <Boxes size={12} className="text-slate-500" />
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{mod.name}</p>
                  </div>
                  <div className="space-y-1.5">
                    {mod.subModules.length === 0 ? (
                      <p className="text-xs text-slate-600">No sub modules</p>
                    ) : (
                      mod.subModules.map((sm) => {
                        const current = grants[sm._id] || [];
                        const hasAccess = current.length > 0;
                        return (
                          <div
                            key={sm._id}
                            className={clsx(
                              "flex flex-wrap items-center gap-2.5 rounded-lg border px-3 py-2 transition-colors duration-150",
                              hasAccess ? "border-primary-500/20 bg-primary-500/[0.04]" : "border-surface-border/60"
                            )}
                          >
                            <span className="flex w-40 shrink-0 items-center gap-1.5 truncate text-sm text-slate-300">
                              <FileCode2 size={12} className="shrink-0 text-slate-600" />
                              {sm.name}
                            </span>
                            <div className="flex flex-wrap gap-1.5">
                              {PERMISSION_ACTIONS.map((action) => (
                                <ActionPill
                                  key={action}
                                  action={action}
                                  active={current.includes(action)}
                                  onClick={() => toggleAction(sm, action)}
                                />
                              ))}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function UserPermissions() {
  const { userId } = useParams();
  const navigate = useNavigate();

  const { data: user } = useQuery({ queryKey: ["user", userId], queryFn: () => userApi.get(userId).then((r) => r.data.data) });
  const { data: tree, isLoading: treeLoading } = useQuery({ queryKey: ["sidebar-tree-admin"], queryFn: () => categoryApi.sidebar().then((r) => r.data.data) });
  const { data: existingGrants, isLoading: grantsLoading } = useQuery({
    queryKey: ["permissions", userId],
    queryFn: () => permissionApi.list(userId).then((r) => r.data.data),
  });

  const [grants, setGrants] = useState({});

  useEffect(() => {
    if (existingGrants) {
      setGrants(Object.fromEntries(existingGrants.map((g) => [g.subModule._id, g.actions])));
    }
  }, [existingGrants]);

  const saveMutation = useMutation({
    mutationFn: () =>
      permissionApi.set(
        userId,
        Object.entries(grants)
          .filter(([, actions]) => actions.length > 0)
          .map(([subModule, actions]) => ({ subModule, actions }))
      ),
    onSuccess: () => toast.success("Permissions saved"),
    onError: (err) => toast.error(err.response?.data?.message || "Failed to save permissions"),
  });

  function toggleAction(subModule, action) {
    setGrants((g) => {
      const current = g[subModule._id] || [];
      const next = current.includes(action) ? current.filter((a) => a !== action) : [...current, action];
      return { ...g, [subModule._id]: next };
    });
  }

  if (treeLoading || grantsLoading) return <Spinner />;

  const grantedCount = Object.values(grants).filter((actions) => actions.length > 0).length;

  return (
    <div className="animate-fade-in-up">
      <button onClick={() => navigate("/permissions")} className="mb-4 flex items-center gap-1.5 text-xs text-slate-500 transition-colors hover:text-slate-300">
        <ArrowLeft size={13} /> All users
      </button>
      <PageHeader
        title={`Access — ${user?.name || ""}`}
        description="Only assigned Category → Module → Sub Module resources will be visible to this user."
        actions={<Button icon={Save} onClick={() => saveMutation.mutate()} loading={saveMutation.isPending}>Save Changes</Button>}
      />
      {grantedCount > 0 && (
        <div className="mb-4 flex items-center gap-2 text-xs text-slate-500">
          <ShieldCheck size={13} className="text-primary-text" />
          {grantedCount} {grantedCount === 1 ? "query" : "queries"} with access granted
        </div>
      )}
      {!tree || tree.length === 0 ? (
        <p className="text-sm text-slate-500">No categories exist yet. Create categories, modules and sub modules first.</p>
      ) : (
        <AccessTree tree={tree} grants={grants} toggleAction={toggleAction} />
      )}
    </div>
  );
}

export default function Permissions() {
  const { userId } = useParams();
  return userId ? <UserPermissions /> : <UserPicker />;
}
