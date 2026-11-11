import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { moduleApi } from "./moduleApi.js";
import { categoryApi } from "../../features/categories/categoryApi.js";
import PageHeader from "../../components/common/PageHeader.jsx";
import Button from "../../components/common/Button.jsx";
import DataTable from "../../components/common/DataTable.jsx";
import Modal from "../../components/common/Modal.jsx";
import Input from "../../components/common/Input.jsx";
import TextArea from "../../components/common/TextArea.jsx";
import Select from "../../components/common/Select.jsx";
import Badge from "../../components/common/Badge.jsx";
import ConfirmDialog from "../../components/common/ConfirmDialog.jsx";
import { formatDate } from "../../lib/format.js";

const EMPTY_FORM = { name: "", description: "", category: "", status: "ACTIVE" };

export default function Modules() {
  const queryClient = useQueryClient();
  const [categoryFilter, setCategoryFilter] = useState("");

  const { data: categories } = useQuery({ queryKey: ["categories"], queryFn: () => categoryApi.list().then((r) => r.data.data) });
  const { data, isLoading } = useQuery({
    queryKey: ["modules", categoryFilter],
    queryFn: () => moduleApi.list(categoryFilter ? { category: categoryFilter } : {}).then((r) => r.data.data),
  });

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["modules"] });

  const createMutation = useMutation({
    mutationFn: (payload) => moduleApi.create(payload),
    onSuccess: () => { toast.success("Module created"); invalidate(); closeModal(); },
    onError: (err) => toast.error(err.response?.data?.message || "Failed to create module"),
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, payload }) => moduleApi.update(id, payload),
    onSuccess: () => { toast.success("Module updated"); invalidate(); closeModal(); },
    onError: (err) => toast.error(err.response?.data?.message || "Failed to update module"),
  });
  const deleteMutation = useMutation({
    mutationFn: (id) => moduleApi.remove(id),
    onSuccess: () => { toast.success("Module deleted"); invalidate(); setDeleteTarget(null); },
    onError: (err) => toast.error(err.response?.data?.message || "Failed to delete module"),
  });

  function openCreate() {
    setEditing(null);
    setForm({ ...EMPTY_FORM, category: categoryFilter || categories?.[0]?._id || "" });
    setModalOpen(true);
  }
  function openEdit(module) {
    setEditing(module);
    setForm({
      name: module.name,
      description: module.description || "",
      category: module.category?._id || module.category,
      status: module.status || "ACTIVE",
    });
    setModalOpen(true);
  }
  function closeModal() {
    setModalOpen(false);
    setEditing(null);
    setForm(EMPTY_FORM);
  }
  function handleSubmit(e) {
    e.preventDefault();
    if (editing) {
      updateMutation.mutate({ id: editing._id, payload: { name: form.name, description: form.description, status: form.status } });
    } else {
      createMutation.mutate(form);
    }
  }

  const columns = [
    { key: "name", label: "Module", render: (row) => <span className="font-medium text-slate-100">{row.name}</span> },
    { key: "category", label: "Category", render: (row) => row.category?.name || "—" },
    { key: "description", label: "Description", render: (row) => row.description || "—" },
    { key: "status", label: "Status", render: (row) => <Badge tone={row.status === "ACTIVE" ? "success" : "neutral"}>{row.status}</Badge> },
    { key: "createdAt", label: "Created", render: (row) => formatDate(row.createdAt) },
    {
      key: "actions",
      label: "",
      render: (row) => (
        <div className="flex justify-end gap-1">
          <Button variant="ghost" size="sm" icon={Pencil} onClick={() => openEdit(row)}>Edit</Button>
          <Button variant="ghost" size="sm" icon={Trash2} onClick={() => setDeleteTarget(row)} className="text-red-400">Delete</Button>
        </div>
      ),
    },
  ];

  return (
    <div className="animate-fade-in-up">
      <PageHeader
        title="Modules"
        description="The second navigation layer, nested under each category."
        actions={<Button icon={Plus} onClick={openCreate} disabled={!categories?.length}>Create Module</Button>}
      />

      {!categories?.length && (
        <div className="mb-4 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-400">
          You need at least one Category before you can create a Module — create one on the Categories tab first.
        </div>
      )}

      <div className="mb-4 max-w-xs">
        <Select label="Filter by category" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
          <option value="">All categories</option>
          {categories?.map((c) => (
            <option key={c._id} value={c._id}>{c.name}</option>
          ))}
        </Select>
      </div>

      <DataTable columns={columns} rows={data} loading={isLoading} emptyTitle="No modules yet" emptyDescription="Create a module inside a category to continue." />

      <Modal
        open={modalOpen}
        onClose={closeModal}
        title={editing ? "Edit Module" : "Create Module"}
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={closeModal}>Cancel</Button>
            <Button size="sm" onClick={handleSubmit} loading={createMutation.isPending || updateMutation.isPending}>
              {editing ? "Save Changes" : "Create Module"}
            </Button>
          </>
        }
      >
        <form className="space-y-4" onSubmit={handleSubmit}>
          {!editing && (
            <Select
              label="Category"
              required
              value={form.category}
              onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
            >
              <option value="" disabled>Select a category</option>
              {categories?.map((c) => (
                <option key={c._id} value={c._id}>{c.name}</option>
              ))}
            </Select>
          )}
          <Input
            label="Module Name"
            required
            placeholder="e.g. Employee Creation"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          />
          <TextArea
            label="Description"
            rows={3}
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          />
          {editing && (
            <Select
              label="Status"
              value={form.status}
              onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
            >
              <option value="ACTIVE">Active</option>
              <option value="ARCHIVED">Archived</option>
            </Select>
          )}
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete module"
        message={`Delete "${deleteTarget?.name}"? Modules with sub modules can't be deleted — archive them instead.`}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => deleteMutation.mutate(deleteTarget._id)}
        loading={deleteMutation.isPending}
      />
    </div>
  );
}
