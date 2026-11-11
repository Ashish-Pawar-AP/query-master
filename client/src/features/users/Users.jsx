import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, KeyRound } from "lucide-react";
import { useNavigate } from "react-router";
import toast from "react-hot-toast";
import { userApi } from "./userApi.js";
import PageHeader from "../../components/common/PageHeader.jsx";
import Button from "../../components/common/Button.jsx";
import DataTable from "../../components/common/DataTable.jsx";
import Modal from "../../components/common/Modal.jsx";
import Input from "../../components/common/Input.jsx";
import Badge from "../../components/common/Badge.jsx";
import ConfirmDialog from "../../components/common/ConfirmDialog.jsx";
import { formatDate, timeAgo } from "../../lib/format.js";

const EMPTY_FORM = { name: "", email: "", password: "" };

// Renders the "Users" (role=USER) management screen. Reused by Admins.jsx for role=ADMIN.
export default function Users({ role = "USER", title = "Users", description = "Support engineers who search, copy and favorite queries." }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["users", role], queryFn: () => userApi.list({ role }).then((r) => r.data.data) });

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["users", role] });

  const createMutation = useMutation({
    mutationFn: (payload) => userApi.create({ ...payload, role }),
    onSuccess: () => { toast.success("User created"); invalidate(); closeModal(); },
    onError: (err) => toast.error(err.response?.data?.message || "Failed to create user"),
  });
  const toggleStatusMutation = useMutation({
    mutationFn: ({ id, status }) => userApi.update(id, { status }),
    onSuccess: () => { toast.success("User updated"); invalidate(); },
    onError: (err) => toast.error(err.response?.data?.message || "Failed to update user"),
  });
  const deleteMutation = useMutation({
    mutationFn: (id) => userApi.remove(id),
    onSuccess: () => { toast.success("User removed"); invalidate(); setDeleteTarget(null); },
    onError: (err) => toast.error(err.response?.data?.message || "Failed to remove user"),
  });

  function closeModal() {
    setModalOpen(false);
    setForm(EMPTY_FORM);
  }
  function handleSubmit(e) {
    e.preventDefault();
    createMutation.mutate(form);
  }

  const columns = [
    { key: "name", label: "Name", render: (row) => <span className="font-medium text-slate-100">{row.name}</span> },
    { key: "email", label: "Email" },
    { key: "status", label: "Status", render: (row) => <Badge tone={row.status === "ACTIVE" ? "success" : "danger"}>{row.status}</Badge> },
    { key: "lastLoginAt", label: "Last Login", render: (row) => timeAgo(row.lastLoginAt) },
    { key: "createdAt", label: "Created", render: (row) => formatDate(row.createdAt) },
    {
      key: "actions",
      label: "",
      render: (row) => (
        <div className="flex justify-end gap-1">
          {role === "USER" && (
            <Button variant="ghost" size="sm" icon={KeyRound} onClick={() => navigate(`/permissions/${row._id}`)}>Access</Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            icon={Pencil}
            onClick={() => toggleStatusMutation.mutate({ id: row._id, status: row.status === "ACTIVE" ? "DISABLED" : "ACTIVE" })}
          >
            {row.status === "ACTIVE" ? "Disable" : "Enable"}
          </Button>
          <Button variant="ghost" size="sm" icon={Trash2} onClick={() => setDeleteTarget(row)} className="text-red-400">Remove</Button>
        </div>
      ),
    },
  ];

  return (
    <div className="animate-fade-in-up">
      <PageHeader title={title} description={description} actions={<Button icon={Plus} onClick={() => setModalOpen(true)}>Create {role === "ADMIN" ? "Admin" : "User"}</Button>} />

      <DataTable columns={columns} rows={data} loading={isLoading} emptyTitle={`No ${role === "ADMIN" ? "admins" : "users"} yet`} />

      <Modal
        open={modalOpen}
        onClose={closeModal}
        title={`Create ${role === "ADMIN" ? "Admin" : "User"}`}
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={closeModal}>Cancel</Button>
            <Button size="sm" onClick={handleSubmit} loading={createMutation.isPending}>Create</Button>
          </>
        }
      >
        <form className="space-y-4" onSubmit={handleSubmit}>
          <Input label="Full Name" required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          <Input label="Email" type="email" required value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
          <Input label="Temporary Password" type="password" required minLength={8} value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} />
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        title={`Remove ${role === "ADMIN" ? "admin" : "user"}`}
        message={`Remove "${deleteTarget?.name}"? They will immediately lose access to Query Master.`}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => deleteMutation.mutate(deleteTarget._id)}
        loading={deleteMutation.isPending}
      />
    </div>
  );
}
