import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Save, ArrowLeft } from "lucide-react";
import toast from "react-hot-toast";
import { subModuleApi } from "./subModuleApi.js";
import { categoryApi } from "../categories/categoryApi.js";
import { moduleApi } from "../modules/moduleApi.js";
import { QUERY_TYPES, DATA_TYPES } from "../../lib/roles.js";
import { canBeMultiple, parseValues } from "../../lib/multiValue.js";
import PageHeader from "../../components/common/PageHeader.jsx";
import Button from "../../components/common/Button.jsx";
import Input from "../../components/common/Input.jsx";
import TextArea from "../../components/common/TextArea.jsx";
import Select from "../../components/common/Select.jsx";
import Spinner from "../../components/common/Spinner.jsx";
import Switch from "../../components/common/Switch.jsx";

const EMPTY_FORM = {
  name: "",
  description: "",
  category: "",
  module: "",
  queryType: "SELECT",
  tableName: "",
  sqlTemplate: "",
  placeholders: [],
  updatableFields: [],
  whereFields: [],
  whereLogic: "AND",
  tags: "",
  status: "ACTIVE",
  notesEnabled: false,
};

// Applies one edit to a row while keeping `multiple` consistent with the data type:
// BOOLEAN/NULL/JSON can't hold a list, and a row that stops being "multiple" collapses its
// comma-separated default down to a single value so it never holds an invalid default.
function patchRow(row, key, value) {
  const next = { ...row, [key]: value };
  const stopsBeingMultiple = (key === "multiple" && !value) || (key === "dataType" && !canBeMultiple(value));
  if (stopsBeingMultiple && row.multiple) {
    next.multiple = false;
    next.defaultValue = parseValues(row.defaultValue)[0] ?? "";
  }
  return next;
}

// "Multiple values" checkbox — hidden for data types that can only ever hold one value.
function MultipleToggle({ row, onChange, label, hint }) {
  if (!canBeMultiple(row.dataType)) return null;
  return (
    <label title={hint} className="flex items-center gap-1 text-xs text-slate-400">
      <input type="checkbox" checked={!!row.multiple} onChange={(e) => onChange(e.target.checked)} className="accent-primary-500" />
      {label}
    </label>
  );
}

// A single row in one of the dynamic field editors below (a placeholder, an
// insert/update column, or a WHERE condition). Renders the shared bits, then a "smart"
// default-value control that adapts to the row's chosen data type:
//   multiple -> comma-separated list of default values
//   BOOLEAN -> fixed True/False dropdown
//   ARRAY   -> dropdown built live from the options the admin just typed
//   other   -> free text
function SmartDefaultControl({ row, onChange }) {
  if (row.multiple) {
    return (
      <input
        placeholder="Default values, comma separated"
        value={row.defaultValue}
        onChange={(e) => onChange(e.target.value)}
        className="min-w-[160px] flex-1 rounded-md border border-surface-border bg-surface-raised px-2 py-1 text-xs text-slate-100 placeholder:text-slate-600"
      />
    );
  }
  if (row.dataType === "BOOLEAN") {
    return (
      <select
        value={row.defaultValue}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-md border border-surface-border bg-surface-raised px-2 py-1 text-xs text-slate-100"
      >
        <option value="">No default</option>
        <option value="true">True</option>
        <option value="false">False</option>
      </select>
    );
  }
  if (row.dataType === "ARRAY") {
    const opts = (row.options || "")
      .split(",")
      .map((o) => o.trim())
      .filter(Boolean);
    return (
      <select
        value={row.defaultValue}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-md border border-surface-border bg-surface-raised px-2 py-1 text-xs text-slate-100"
      >
        <option value="">No default</option>
        {opts.map((opt) => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
    );
  }
  return (
    <input
      placeholder="Default value"
      value={row.defaultValue}
      onChange={(e) => onChange(e.target.value)}
      className="min-w-[110px] flex-1 rounded-md border border-surface-border bg-surface-raised px-2 py-1 text-xs text-slate-100 placeholder:text-slate-600"
    />
  );
}

function RowEditor({ title, hint, rows, setRows, includeOptions = true, allowMultiple = false }) {
  function addRow() {
    setRows([
      ...rows,
      { fieldName: "", columnName: "", dataType: "STRING", defaultChecked: false, options: "", defaultValue: "", multiple: false },
    ]);
  }
  function updateRow(idx, key, value) {
    setRows(rows.map((r, i) => (i === idx ? patchRow(r, key, value) : r)));
  }
  function removeRow(idx) {
    setRows(rows.filter((_, i) => i !== idx));
  }

  return (
    <section className="rounded-lg border border-surface-border bg-surface-raised p-4">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-slate-200">{title}</h3>
          {hint && <p className="text-xs text-slate-500">{hint}</p>}
        </div>
        <Button type="button" variant="ghost" size="sm" icon={Plus} onClick={addRow}>Add row</Button>
      </div>
      {rows.length === 0 ? (
        <p className="text-xs text-slate-600">None added yet.</p>
      ) : (
        <div className="space-y-2">
          {rows.map((row, idx) => (
            <div key={idx} className="animate-fade-in-up flex flex-wrap items-center gap-2 rounded-md border border-surface-border bg-surface p-2">
              <input
                placeholder="Field label (e.g. Name)"
                value={row.fieldName}
                onChange={(e) => updateRow(idx, "fieldName", e.target.value)}
                className="min-w-[110px] flex-1 rounded-md border border-surface-border bg-surface-raised px-2 py-1 text-xs text-slate-100 placeholder:text-slate-600"
              />
              <input
                placeholder="Column (e.g. name)"
                value={row.columnName}
                onChange={(e) => updateRow(idx, "columnName", e.target.value)}
                className="min-w-[110px] flex-1 rounded-md border border-surface-border bg-surface-raised px-2 py-1 text-xs text-slate-100 placeholder:text-slate-600"
              />
              <select
                value={row.dataType}
                onChange={(e) => updateRow(idx, "dataType", e.target.value)}
                className="rounded-md border border-surface-border bg-surface-raised px-2 py-1 text-xs text-slate-100"
              >
                {DATA_TYPES.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
              </select>

              {includeOptions && row.dataType === "ARRAY" && (
                <input
                  placeholder="Options, comma separated (e.g. Active, Inactive, Pending)"
                  value={row.options}
                  onChange={(e) => updateRow(idx, "options", e.target.value)}
                  className="min-w-[220px] flex-1 rounded-md border border-primary-500/30 bg-surface-raised px-2 py-1 text-xs text-slate-100 placeholder:text-slate-600"
                />
              )}

              {allowMultiple && (
                <MultipleToggle
                  row={row}
                  onChange={(v) => updateRow(idx, "multiple", v)}
                  label="Multiple values (IN)"
                  hint="The user can enter several values — generates: column IN (a, b, c)"
                />
              )}

              <SmartDefaultControl row={row} onChange={(v) => updateRow(idx, "defaultValue", v)} />

              <label className="flex items-center gap-1 text-xs text-slate-400">
                <input
                  type="checkbox"
                  checked={!!row.defaultChecked}
                  onChange={(e) => updateRow(idx, "defaultChecked", e.target.checked)}
                  className="accent-primary-500"
                />
                Checked by default
              </label>

              <button type="button" onClick={() => removeRow(idx)} className="ml-auto shrink-0 text-red-400 transition-colors hover:text-red-300">
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

// Placeholders don't have a column/checkbox — they're pure fill-in-the-blank {{tokens}}.
function PlaceholderEditor({ rows, setRows }) {
  function addRow() {
    setRows([...rows, { name: "", label: "", dataType: "STRING", required: true, options: "", defaultValue: "", multiple: false }]);
  }
  function updateRow(idx, key, value) {
    setRows(rows.map((r, i) => (i === idx ? patchRow(r, key, value) : r)));
  }
  function removeRow(idx) {
    setRows(rows.filter((_, i) => i !== idx));
  }

  return (
    <section className="rounded-lg border border-surface-border bg-surface-raised p-4">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-slate-200">Variable Placeholders</h3>
          <p className="text-xs text-slate-500">Fillable {"{{tokens}}"} referenced in the SQL template above.</p>
        </div>
        <Button type="button" variant="ghost" size="sm" icon={Plus} onClick={addRow}>Add row</Button>
      </div>
      {rows.length === 0 ? (
        <p className="text-xs text-slate-600">None added yet.</p>
      ) : (
        <div className="space-y-2">
          {rows.map((row, idx) => (
            <div key={idx} className="animate-fade-in-up flex flex-wrap items-center gap-2 rounded-md border border-surface-border bg-surface p-2">
              <input
                placeholder="Token name (EmployeeId)"
                value={row.name}
                onChange={(e) => updateRow(idx, "name", e.target.value)}
                className="min-w-[110px] flex-1 rounded-md border border-surface-border bg-surface-raised px-2 py-1 text-xs text-slate-100 placeholder:text-slate-600"
              />
              <input
                placeholder="Display label"
                value={row.label}
                onChange={(e) => updateRow(idx, "label", e.target.value)}
                className="min-w-[110px] flex-1 rounded-md border border-surface-border bg-surface-raised px-2 py-1 text-xs text-slate-100 placeholder:text-slate-600"
              />
              <select
                value={row.dataType}
                onChange={(e) => updateRow(idx, "dataType", e.target.value)}
                className="rounded-md border border-surface-border bg-surface-raised px-2 py-1 text-xs text-slate-100"
              >
                {DATA_TYPES.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
              </select>

              {row.dataType === "ARRAY" && (
                <input
                  placeholder="Options, comma separated"
                  value={row.options}
                  onChange={(e) => updateRow(idx, "options", e.target.value)}
                  className="min-w-[220px] flex-1 rounded-md border border-primary-500/30 bg-surface-raised px-2 py-1 text-xs text-slate-100 placeholder:text-slate-600"
                />
              )}

              <MultipleToggle
                row={row}
                onChange={(v) => updateRow(idx, "multiple", v)}
                label="Multiple values"
                hint="Fills the {{token}} with a comma-separated list — use it inside IN ( … ), e.g. WHERE id IN ({{Ids}})"
              />

              <SmartDefaultControl row={row} onChange={(v) => updateRow(idx, "defaultValue", v)} />

              <label className="flex items-center gap-1 text-xs text-slate-400">
                <input
                  type="checkbox"
                  checked={!!row.required}
                  onChange={(e) => updateRow(idx, "required", e.target.checked)}
                  className="accent-primary-500"
                />
                Required
              </label>

              <button type="button" onClick={() => removeRow(idx)} className="ml-auto shrink-0 text-red-400 transition-colors hover:text-red-300">
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export default function SubModuleForm() {
  const { id } = useParams();
  const isEdit = !!id;
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: existing, isLoading } = useQuery({
    queryKey: ["submodule", id],
    queryFn: () => subModuleApi.get(id).then((r) => r.data.data),
    enabled: isEdit,
  });

  const { data: categories } = useQuery({ queryKey: ["categories"], queryFn: () => categoryApi.list().then((r) => r.data.data) });

  const [form, setForm] = useState(EMPTY_FORM);
  const [modules, setModules] = useState([]);

  useEffect(() => {
    if (existing) {
      setForm({
        name: existing.name,
        description: existing.description || "",
        category: existing.category?._id || existing.category,
        module: existing.module?._id || existing.module,
        queryType: existing.queryType,
        tableName: existing.tableName || "",
        sqlTemplate: existing.sqlTemplate,
        placeholders: (existing.placeholders || []).map((p) => ({ ...p, options: (p.options || []).join(", ") })),
        updatableFields: (existing.updatableFields || []).map((f) => ({ ...f, options: (f.options || []).join(", ") })),
        whereFields: (existing.whereFields || []).map((f) => ({ ...f, options: (f.options || []).join(", ") })),
        whereLogic: existing.whereLogic || "AND",
        tags: (existing.tags || []).join(", "),
        status: existing.status || "ACTIVE",
        notesEnabled: !!existing.notesEnabled,
      });
    }
  }, [existing]);

  useEffect(() => {
    if (form.category) {
      moduleApi.list({ category: form.category }).then((r) => setModules(r.data.data));
    } else {
      setModules([]);
    }
  }, [form.category]);

  const saveMutation = useMutation({
    mutationFn: () => {
      const toArray = (v) => (typeof v === "string" ? v.split(",").map((s) => s.trim()).filter(Boolean) : v);
      const payload = {
        ...form,
        tags: toArray(form.tags),
        placeholders: form.placeholders.map((p) => ({ ...p, options: toArray(p.options) })),
        updatableFields: form.updatableFields.map((f) => ({ ...f, options: toArray(f.options) })),
        whereFields: form.whereFields.map((f) => ({ ...f, options: toArray(f.options) })),
      };
      return isEdit ? subModuleApi.update(id, payload) : subModuleApi.create(payload);
    },
    onSuccess: (res) => {
      toast.success(isEdit ? "Query updated" : "Query created");
      queryClient.invalidateQueries({ queryKey: ["submodules"] });
      queryClient.invalidateQueries({ queryKey: ["sidebar-tree"] });
      navigate(`/submodules/${res.data.data._id}`);
    },
    onError: (err) => toast.error(err.response?.data?.message || "Failed to save query"),
  });

  function handleSubmit(e) {
    e.preventDefault();
    saveMutation.mutate();
  }

  if (isEdit && isLoading) return <Spinner />;

  return (
    <div className="animate-fade-in-up">
      <button onClick={() => navigate(-1)} className="mb-4 flex items-center gap-1.5 text-xs text-slate-500 transition-colors hover:text-slate-300">
        <ArrowLeft size={13} /> Back
      </button>

      <PageHeader
        title={isEdit ? "Edit Query" : "Create Query"}
        description="A sub module holds exactly one query — define it here, in one place."
      />

      <form onSubmit={handleSubmit} className="space-y-5">
        <section className="grid grid-cols-1 gap-4 rounded-lg border border-surface-border bg-surface-raised p-4 sm:grid-cols-2">
          <Input label="Sub Module / Query Name" required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. Insert Employee" />
          <Select label="Query Type" required value={form.queryType} onChange={(e) => setForm((f) => ({ ...f, queryType: e.target.value }))}>
            {QUERY_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </Select>

          <Select label="Category" required value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value, module: "" }))} disabled={isEdit}>
            <option value="" disabled>Select a category</option>
            {categories?.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
          </Select>
          <Select label="Module" required value={form.module} onChange={(e) => setForm((f) => ({ ...f, module: e.target.value }))} disabled={!form.category || isEdit}>
            <option value="" disabled>Select a module</option>
            {modules.map((m) => <option key={m._id} value={m._id}>{m.name}</option>)}
          </Select>
          <Input label="Table Name" value={form.tableName} onChange={(e) => setForm((f) => ({ ...f, tableName: e.target.value }))} placeholder="e.g. Employee" />
          <Input label="Tags (comma separated)" value={form.tags} onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))} placeholder="employee, insert, hr" />
          {isEdit && (
            <Select label="Status" value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}>
              <option value="ACTIVE">Active</option>
              <option value="ARCHIVED">Archived</option>
            </Select>
          )}

          <div className="sm:col-span-2">
            <Switch
              checked={form.notesEnabled}
              onChange={(v) => setForm((f) => ({ ...f, notesEnabled: v }))}
              label="Enable notes for this query"
              hint="Users can keep their own private notes on it — create, edit, delete and copy. Off by default."
            />
          </div>
          <div className="sm:col-span-2">
            <TextArea label="Description" rows={2} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
          </div>
        </section>

        <section className="rounded-lg border border-surface-border bg-surface-raised p-4">
          <TextArea
            label="SQL Template"
            required
            rows={7}
            value={form.sqlTemplate}
            onChange={(e) => setForm((f) => ({ ...f, sqlTemplate: e.target.value }))}
            placeholder={"UPDATE Employee\nSET\n{{SET_CLAUSE}}\nWHERE\n{{WHERE_CLAUSE}};"}
          />
          <p className="mt-2 text-xs text-slate-500">
            Use <code className="text-primary-text">{"{{placeholderName}}"}</code> for fillable variables, and the reserved tokens{" "}
            <code className="text-primary-text">{"{{SET_CLAUSE}}"}</code>, <code className="text-primary-text">{"{{WHERE_CLAUSE}}"}</code>,{" "}
            <code className="text-primary-text">{"{{INSERT_COLUMNS}}"}</code> / <code className="text-primary-text">{"{{INSERT_VALUES}}"}</code> where dynamic
            field selection should be injected. For a list inside <code className="text-primary-text">IN ( … )</code>, mark the placeholder (or a WHERE field) <em>Multiple values</em>. Full reference: <code className="text-primary-text">docs/QUERY_TEMPLATE_GUIDE.md</code>.
          </p>
        </section>

        <PlaceholderEditor rows={form.placeholders} setRows={(rows) => setForm((f) => ({ ...f, placeholders: rows }))} />

        <RowEditor
          title={form.queryType === "INSERT" ? "Insertable Fields" : "Updatable Fields"}
          hint="Rendered as checkboxes on the generator screen — the user picks which ones apply."
          rows={form.updatableFields}
          setRows={(rows) => setForm((f) => ({ ...f, updatableFields: rows }))}
        />

        <RowEditor
          title="WHERE Clause Fields"
          hint="Conditions selectable when generating SQL, combined using the logic below. Tick “Multiple values (IN)” on a field to let the user enter a list."
          rows={form.whereFields}
          allowMultiple
          setRows={(rows) => setForm((f) => ({ ...f, whereFields: rows }))}
        />

        <div className="max-w-xs">
          <Select label="WHERE Logic" value={form.whereLogic} onChange={(e) => setForm((f) => ({ ...f, whereLogic: e.target.value }))}>
            <option value="AND">AND</option>
            <option value="OR">OR</option>
          </Select>
        </div>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={() => navigate(-1)}>Cancel</Button>
          <Button type="submit" icon={Save} loading={saveMutation.isPending}>{isEdit ? "Save Changes" : "Create Query"}</Button>
        </div>
      </form>
    </div>
  );
}
