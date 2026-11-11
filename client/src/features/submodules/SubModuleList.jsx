import { useState, useMemo, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router";
import {
  useQuery,
  useMutation,
  useQueryClient,
  keepPreviousData,
} from "@tanstack/react-query";
import {
  Plus,
  Eye,
  Pencil,
  Trash2,
  Search as SearchIcon,
  FileCode2,
} from "lucide-react";
import toast from "react-hot-toast";
import { subModuleApi } from "./subModuleApi.js";
import { favoriteApi } from "../favorites/favoriteApi.js";
import { categoryApi } from "../categories/categoryApi.js";
import { moduleApi } from "../modules/moduleApi.js";
import { useAuth } from "../auth/useAuth.js";
import { ROLES, QUERY_TYPES } from "../../lib/roles.js";
import PageHeader from "../../components/common/PageHeader.jsx";
import Button from "../../components/common/Button.jsx";
import DataTable from "../../components/common/DataTable.jsx";
import Select from "../../components/common/Select.jsx";
import Input from "../../components/common/Input.jsx";
import Badge from "../../components/common/Badge.jsx";
import ConfirmDialog from "../../components/common/ConfirmDialog.jsx";
import Pagination from "../../components/common/Pagination.jsx";
import FavoriteToggle from "../../components/common/FavoriteToggle.jsx";
import { formatDate } from "../../lib/format.js";

const PAGE_SIZE = 20;

export default function SubModuleList() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [params, setParams] = useSearchParams();
  const [deleteTarget, setDeleteTarget] = useState(null);

  const category = params.get("category") || "";
  const module = params.get("module") || "";
  const search = params.get("search") || "";
  const queryType = params.get("queryType") || "";
  const page = Math.max(parseInt(params.get("page"), 10) || 1, 1);
  const [searchInput, setSearchInput] = useState(search);

  const isAdmin = user.role === ROLES.ADMIN; // this route is Admin+User only; Super Admin never reaches it

  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: () => categoryApi.list().then((r) => r.data.data),
  });
  const { data: modules } = useQuery({
    queryKey: ["modules", category],
    queryFn: () =>
      moduleApi.list(category ? { category } : {}).then((r) => r.data.data),
    enabled: !!categories,
  });

  const filters = useMemo(
    () => ({ category, module, search, queryType }),
    [category, module, search, queryType],
  );

  // Keep the whole response ({ data, pagination }) so the table and the pager share one request.
  // keepPreviousData shows the old page (dimmed) while the next one loads, instead of a skeleton flash.
  const {
    data: result,
    isLoading,
    isFetching,
  } = useQuery({
    queryKey: ["submodules-browse", filters, page],
    queryFn: () =>
      subModuleApi
        .list({
          ...Object.fromEntries(Object.entries(filters).filter(([, v]) => v)),
          page,
          limit: PAGE_SIZE,
        })
        .then((r) => r.data),
    placeholderData: keepPreviousData,
  });
  const rows = result?.data;
  const pagination = result?.pagination;

  // If the current page no longer exists (e.g. you deleted the last row on the last page,
  // or opened a stale ?page=9 link), move back to the last real page.
  useEffect(() => {
    if (pagination && pagination.pages > 0 && page > pagination.pages) {
      updateParam(
        "page",
        pagination.pages > 1 ? String(pagination.pages) : "",
        { replace: true },
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagination, page]);

  const deleteMutation = useMutation({
    mutationFn: (id) => subModuleApi.remove(id),
    onSuccess: () => {
      toast.success("Query deleted");
      queryClient.invalidateQueries({ queryKey: ["submodules-browse"] });
      queryClient.invalidateQueries({ queryKey: ["sidebar-tree"] });
      setDeleteTarget(null);
    },
    onError: (err) =>
      toast.error(err.response?.data?.message || "Failed to delete query"),
  });

  const favoriteMutation = useMutation({
    mutationFn: ({ id, isFavorite }) =>
      isFavorite ? favoriteApi.remove(id) : favoriteApi.add(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["submodules-browse"] });
      queryClient.invalidateQueries({ queryKey: ["favorites"] });
    },
    onError: () => toast.error("Couldn't update favorite"),
  });

  function updateParam(key, value, options) {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key === "category") next.delete("module");
    if (key !== "page") next.delete("page"); // any filter or search change goes back to page 1
    setParams(next, options);
  }

  function goToPage(n) {
    updateParam("page", n > 1 ? String(n) : "");
  }

  function handleSearchSubmit(e) {
    e.preventDefault();
    updateParam("search", searchInput);
  }

  const columns = [
    {
      key: "name",
      label: "Query",
      render: (row) => (
        <button
          className="flex items-center gap-2 text-left font-medium text-slate-100 transition-colors hover:text-primary-text"
          onClick={() => navigate(`/submodules/${row._id}`)}
        >
          <FileCode2 size={14} className="text-slate-500" /> {row.name}
        </button>
      ),
    },
    {
      key: "queryType",
      label: "Type",
      render: (row) => <Badge tone="accent">{row.queryType}</Badge>,
    },
    {
      key: "module",
      label: "Module",
      render: (row) => row.module?.name || "—",
    },
    {
      key: "updatedAt",
      label: "Last Updated",
      render: (row) => formatDate(row.updatedAt),
    },
    {
      key: "actions",
      label: "",
      render: (row) => (
        <div className="flex justify-end gap-1.5">
          <FavoriteToggle
            isFavorite={row.isFavorite}
            loading={
              favoriteMutation.isPending &&
              favoriteMutation.variables?.id === row._id
            }
            onToggle={() =>
              favoriteMutation.mutate({
                id: row._id,
                isFavorite: row.isFavorite,
              })
            }
            size="sm"
            showLabel={false}
          />
          <Button
            variant="ghost"
            size="sm"
            icon={Eye}
            onClick={() => navigate(`/submodules/${row._id}`)}
          >
            Open
          </Button>
          {isAdmin && (
            <>
              <Button
                variant="ghost"
                size="sm"
                icon={Pencil}
                onClick={() => navigate(`/submodules/${row._id}/edit`)}
              >
                Edit
              </Button>
              <Button
                variant="ghost"
                size="sm"
                icon={Trash2}
                className="text-red-400"
                onClick={() => setDeleteTarget(row)}
              >
                Delete
              </Button>
            </>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="animate-fade-in-up">
      <PageHeader
        title="Queries"
        description="Browse, search, and generate SQL from stored templates. Each sub module holds exactly one query."
        actions={
          isAdmin && (
            <Button icon={Plus} onClick={() => navigate("/submodules/new")}>
              Create Query
            </Button>
          )
        }
      />

      <form onSubmit={handleSearchSubmit} className="mb-4 flex flex-wrap gap-3">
        <div className="w-64">
          <Input
            placeholder="Search by name, tag, keyword…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </div>
        <div className="w-44">
          <Select
            value={category}
            onChange={(e) => updateParam("category", e.target.value)}
          >
            <option value="">All categories</option>
            {categories?.map((c) => (
              <option key={c._id} value={c._id}>
                {c.name}
              </option>
            ))}
          </Select>
        </div>
        <div className="w-44">
          <Select
            value={module}
            onChange={(e) => updateParam("module", e.target.value)}
            disabled={!category}
          >
            <option value="">All modules</option>
            {modules?.map((m) => (
              <option key={m._id} value={m._id}>
                {m.name}
              </option>
            ))}
          </Select>
        </div>
        <div className="w-40">
          <Select
            value={queryType}
            onChange={(e) => updateParam("queryType", e.target.value)}
          >
            <option value="">All types</option>
            {QUERY_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </Select>
        </div>
        <Button type="submit" variant="secondary" icon={SearchIcon}>
          Search
        </Button>
      </form>

      <div
        className={
          isFetching && !isLoading
            ? "opacity-60 transition-opacity"
            : "transition-opacity"
        }
      >
        <DataTable
          columns={columns}
          rows={rows}
          loading={isLoading}
          emptyTitle="No queries found"
          emptyDescription="Try clearing filters, or ask an Admin to create one."
        />
      </div>

      {pagination && (
        <Pagination
          page={pagination.page}
          pages={pagination.pages}
          total={pagination.total}
          limit={pagination.limit}
          onPageChange={goToPage}
          disabled={isFetching}
        />
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete query"
        message={`Delete "${deleteTarget?.name}"? This can't be undone.`}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => deleteMutation.mutate(deleteTarget._id)}
        loading={deleteMutation.isPending}
      />
    </div>
  );
}
