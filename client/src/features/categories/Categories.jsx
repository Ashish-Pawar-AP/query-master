import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { categoryApi } from "./categoryApi.js";
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

const EMPTY_FORM = { name: "", description: "", status: "ACTIVE" };

export default function Categories() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["categories"], queryFn: () => categoryApi.list().then((r) => r.data.data) });

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["categories"] });

  const createMutation = useMutation({
    mutationFn: (payload) => categoryApi.create(payload),
    onSuccess: () => {
      toast.success("Category created");
      invalidate();
      closeModal();
    },
    onError: (err) => toast.error(err.response?.data?.message || "Failed to create category"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }) => categoryApi.update(id, payload),
    onSuccess: () => {
      toast.success("Category updated");
      invalidate();
      closeModal();
    },
    onError: (err) => toast.error(err.response?.data?.message || "Failed to update category"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => categoryApi.remove(id),
    onSuccess: () => {
      toast.success("Category deleted");
      invalidate();
      setDeleteTarget(null);
    },
    onError: (err) => toast.error(err.response?.data?.message || "Failed to delete category"),
  });

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  }

  function openEdit(category) {
    setEditing(category);
    setForm({ name: category.name, description: category.description || "", status: category.status || "ACTIVE" });
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
      updateMutation.mutate({ id: editing._id, payload: form });
    } else {
      createMutation.mutate(form);
    }
  }

  const columns = [
    { key: "name", label: "Category", render: (row) => <span className="font-medium text-slate-100">{row.name}</span> },
    { key: "description", label: "Description", render: (row) => row.description || "—" },
    {
      key: "status",
      label: "Status",
      render: (row) => <Badge tone={row.status === "ACTIVE" ? "success" : "neutral"}>{row.status}</Badge>,
    },
    { key: "createdAt", label: "Created", render: (row) => formatDate(row.createdAt) },
    {
      key: "actions",
      label: "",
      render: (row) => (
        <div className="flex justify-end gap-1">
          <Button variant="ghost" size="sm" icon={Pencil} onClick={() => openEdit(row)}>Edit</Button>
          <Button variant="ghost" size="sm" icon={Trash2} onClick={() => setDeleteTarget(row)} className="text-red-400">
            Delete
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="animate-fade-in-up">
      <PageHeader
        title="Categories"
        description="Top-level groupings for your organization's SQL query library."
        actions={
          <Button icon={Plus} onClick={openCreate}>
            Create Category
          </Button>
        }
      />

      <DataTable
        columns={columns}
        rows={data}
        loading={isLoading}
        emptyTitle="No categories yet"
        emptyDescription="Create your first category, e.g. Employee, UCC, or Trading."
      />

      <Modal
        open={modalOpen}
        onClose={closeModal}
        title={editing ? "Edit Category" : "Create Category"}
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={closeModal}>Cancel</Button>
            <Button size="sm" onClick={handleSubmit} loading={createMutation.isPending || updateMutation.isPending}>
              {editing ? "Save Changes" : "Create Category"}
            </Button>
          </>
        }
      >
        <form className="space-y-4" onSubmit={handleSubmit}>
          <Input
            label="Category Name"
            required
            placeholder="e.g. Employee"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          />
          <TextArea
            label="Description"
            rows={3}
            placeholder="What kind of queries live under this category?"
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
        title="Delete category"
        message={`Delete "${deleteTarget?.name}"? This can't be undone. Categories with modules can't be deleted — archive them instead.`}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => deleteMutation.mutate(deleteTarget._id)}
        loading={deleteMutation.isPending}
      />
    </div>
  );
}
