import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Copy, Check, Pencil, Trash2, ArrowLeft, Sparkles, SlidersHorizontal, ListChecks, Filter, Terminal, Info } from "lucide-react";
import toast from "react-hot-toast";
import { subModuleApi } from "./subModuleApi.js";
import { favoriteApi } from "../favorites/favoriteApi.js";
import { useAuth } from "../auth/useAuth.js";
import { ROLES } from "../../lib/roles.js";
import PageHeader from "../../components/common/PageHeader.jsx";
import Button from "../../components/common/Button.jsx";
import Badge from "../../components/common/Badge.jsx";
import Spinner from "../../components/common/Spinner.jsx";
import ConfirmDialog from "../../components/common/ConfirmDialog.jsx";
import MultiValueInput from "../../components/common/MultiValueInput.jsx";
import OptionPills from "../../components/common/OptionPills.jsx";
import { canBeMultiple, parseValues } from "../../lib/multiValue.js";
import FavoriteToggle from "../../components/common/FavoriteToggle.jsx";
import NotesPanel from "../notes/NotesPanel.jsx";
import { formatDateTime } from "../../lib/format.js";

// A field the admin marked "multiple" takes a list of values (-> IN (...)); BOOLEAN/NULL/JSON
// can't, whatever the flag says.
const isMulti = (field) => Boolean(field.multiple) && canBeMultiple(field.dataType);

// Renders the right input control for a field's data type:
//   multiple + ARRAY -> toggle pills, pick any number of the admin-defined options
//   multiple         -> chip input, type/paste any number of values
//   BOOLEAN          -> fixed True/False dropdown
//   ARRAY            -> dropdown of the admin-defined options (single choice)
//   other            -> free text
function ValueControl({ dataType, options, value, onChange, disabled, placeholder, multiple, ariaLabel }) {
  const base =
    "w-full rounded-md border border-surface-border bg-surface px-2.5 py-1.5 text-sm text-slate-100 transition-[border-color,box-shadow] duration-150 focus:outline-hidden focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500/50 disabled:opacity-40";

  if (multiple) {
    const list = Array.isArray(value) ? value : [];
    return (
      <div className="min-w-0 flex-1">
        {dataType === "ARRAY" ? (
          <OptionPills options={options} values={list} onChange={onChange} disabled={disabled} ariaLabel={ariaLabel} />
        ) : (
          <MultiValueInput values={list} onChange={onChange} disabled={disabled} ariaLabel={ariaLabel} />
        )}
      </div>
    );
  }
  if (dataType === "BOOLEAN") {
    return (
      <select disabled={disabled} value={value ?? ""} onChange={(e) => onChange(e.target.value)} className={base}>
        <option value="">Select…</option>
        <option value="true">True</option>
        <option value="false">False</option>
      </select>
    );
  }
  if (dataType === "ARRAY") {
    return (
      <select disabled={disabled} value={value ?? ""} onChange={(e) => onChange(e.target.value)} className={base}>
        <option value="">Select…</option>
        {(options || []).map((opt) => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
    );
  }
  return (
    <input
      disabled={disabled}
      placeholder={placeholder}
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value)}
      className={`${base} placeholder:text-slate-600`}
    />
  );
}

function SectionCard({ icon: Icon, title, hint, children }) {
  return (
    <section className="animate-fade-in-up rounded-xl border border-surface-border bg-surface-raised p-4 transition-colors duration-150 hover:border-slate-700">
      <div className="mb-3 flex items-center gap-2">
        <span className="flex h-6 w-6 items-center justify-center rounded-md bg-surface-overlay text-slate-400">
          <Icon size={13} />
        </span>
        <h3 className="text-sm font-semibold text-slate-200">{title}</h3>
        {hint && <span className="text-xs font-normal text-slate-500">{hint}</span>}
      </div>
      {children}
    </section>
  );
}

export default function SubModuleDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isAdmin = user.role === ROLES.ADMIN; // this route is Admin+User only; Super Admin never reaches it

  const { data: subModule, isLoading } = useQuery({
    queryKey: ["submodule", id],
    queryFn: () => subModuleApi.get(id).then((r) => r.data.data),
  });

  const [placeholderValues, setPlaceholderValues] = useState({});
  const [selectedUpdateFields, setSelectedUpdateFields] = useState([]);
  const [updateFieldValues, setUpdateFieldValues] = useState({});
  const [selectedWhereFields, setSelectedWhereFields] = useState([]);
  const [whereFieldValues, setWhereFieldValues] = useState({});
  const [generatedSql, setGeneratedSql] = useState("");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [justCopied, setJustCopied] = useState(false);

  useEffect(() => {
    if (subModule) {
      setSelectedUpdateFields(subModule.updatableFields.filter((f) => f.defaultChecked).map((f) => f.fieldName));
      setSelectedWhereFields(subModule.whereFields.filter((f) => f.defaultChecked).map((f) => f.fieldName));
      // Defaults are stored as text; a multiple field's default "A, B" becomes the list [A, B].
      const initial = (field) => (isMulti(field) ? parseValues(field.defaultValue) : field.defaultValue);
      setPlaceholderValues(
        Object.fromEntries(subModule.placeholders.filter((p) => p.defaultValue).map((p) => [p.name, initial(p)]))
      );
      setUpdateFieldValues(
        Object.fromEntries(subModule.updatableFields.filter((f) => f.defaultValue).map((f) => [f.fieldName, f.defaultValue]))
      );
      setWhereFieldValues(
        Object.fromEntries(subModule.whereFields.filter((f) => f.defaultValue).map((f) => [f.fieldName, initial(f)]))
      );
    }
  }, [subModule]);

  const buildPayload = () => ({
    placeholderValues,
    selectedUpdateFields,
    updateFieldValues,
    selectedWhereFields,
    whereFieldValues,
  });

  const generateMutation = useMutation({
    mutationFn: () => subModuleApi.generate(id, buildPayload()),
    onSuccess: (res) => setGeneratedSql(res.data.data.sql),
    onError: (err) => toast.error(err.response?.data?.message || "Couldn't generate SQL"),
  });

  const copyMutation = useMutation({
    mutationFn: () => subModuleApi.generate(id, buildPayload()),
    onSuccess: async (res) => {
      setGeneratedSql(res.data.data.sql);
      await navigator.clipboard.writeText(res.data.data.sql);
      toast.success("Query copied to clipboard.");
      setJustCopied(true);
      setTimeout(() => setJustCopied(false), 1800);
    },
    onError: (err) => toast.error(err.response?.data?.message || "Couldn't copy query"),
  });

  const deleteMutation = useMutation({
    mutationFn: () => subModuleApi.remove(id),
    onSuccess: () => {
      toast.success("Query deleted");
      navigate("/submodules");
    },
    onError: (err) => toast.error(err.response?.data?.message || "Failed to delete query"),
  });

  const favoriteMutation = useMutation({
    mutationFn: () => (subModule.isFavorite ? favoriteApi.remove(id) : favoriteApi.add(id)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["submodule", id] });
      queryClient.invalidateQueries({ queryKey: ["favorites"] });
    },
    onError: () => toast.error("Couldn't update favorite"),
  });

  if (isLoading || !subModule) return <Spinner />;

  return (
    <div className="animate-fade-in-up">
      <button onClick={() => navigate(-1)} className="mb-4 flex items-center gap-1.5 text-xs text-slate-500 transition-colors hover:text-slate-300">
        <ArrowLeft size={13} /> Back
      </button>

      <PageHeader
        title={subModule.name}
        description={subModule.description}
        actions={
          <>
            <FavoriteToggle
              isFavorite={subModule.isFavorite}
              loading={favoriteMutation.isPending}
              onToggle={() => favoriteMutation.mutate()}
            />
            {isAdmin && (
              <>
                <Button variant="secondary" icon={Pencil} onClick={() => navigate(`/submodules/${id}/edit`)}>Edit</Button>
                <Button variant="danger" icon={Trash2} onClick={() => setDeleteOpen(true)}>Delete</Button>
              </>
            )}
          </>
        }
      />

      <div className="mb-6 flex flex-wrap gap-2">
        <Badge tone="accent">{subModule.queryType}</Badge>
        <Badge>{subModule.category?.name}</Badge>
        <Badge>{subModule.module?.name}</Badge>
        {subModule.tags?.map((t) => <Badge key={t} tone="neutral">#{t}</Badge>)}
        <Badge tone="success">v{subModule.version}</Badge>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="space-y-5">
          {subModule.placeholders?.length > 0 && (
            <SectionCard icon={SlidersHorizontal} title="Variables">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {subModule.placeholders.map((ph) => {
                  const multiple = isMulti(ph);
                  // A <label> around a chip input would "click" its first chip's remove
                  // button when the label text is clicked — so list fields use a <div>.
                  const Wrapper = multiple ? "div" : "label";
                  return (
                    <Wrapper key={ph.name} className={`flex flex-col gap-1.5 ${multiple ? "sm:col-span-2" : ""}`}>
                      <span className="text-xs font-medium text-slate-400">
                        {ph.label}
                        {ph.required ? " *" : ""}
                        {multiple && <span className="ml-1.5 font-normal text-slate-600">(one or more values)</span>}
                      </span>
                      <ValueControl
                        dataType={ph.dataType}
                        options={ph.options}
                        value={placeholderValues[ph.name]}
                        onChange={(v) => setPlaceholderValues((vals) => ({ ...vals, [ph.name]: v }))}
                        placeholder={ph.dataType}
                        multiple={multiple}
                        ariaLabel={ph.label}
                      />
                    </Wrapper>
                  );
                })}
              </div>
            </SectionCard>
          )}

          {subModule.updatableFields?.length > 0 && (
            <SectionCard icon={ListChecks} title={subModule.queryType === "INSERT" ? "Fields to Insert" : "Fields to Update"}>
              <div className="space-y-2">
                {subModule.updatableFields.map((f) => {
                  const checked = selectedUpdateFields.includes(f.fieldName);
                  return (
                    <div
                      key={f.fieldName}
                      className={`flex items-center gap-3 rounded-md p-1.5 transition-colors duration-150 ${checked ? "bg-primary-500/[0.04]" : ""}`}
                    >
                      <label className="flex w-40 shrink-0 items-center gap-2 text-sm text-slate-300">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) =>
                            setSelectedUpdateFields((sel) =>
                              e.target.checked ? [...sel, f.fieldName] : sel.filter((n) => n !== f.fieldName)
                            )
                          }
                          className="h-3.5 w-3.5 accent-primary-500"
                        />
                        {f.fieldName}
                      </label>
                      <ValueControl
                        dataType={f.dataType}
                        options={f.options}
                        value={updateFieldValues[f.fieldName]}
                        onChange={(v) => setUpdateFieldValues((vals) => ({ ...vals, [f.fieldName]: v }))}
                        disabled={!checked}
                        placeholder={f.dataType}
                      />
                    </div>
                  );
                })}
              </div>
            </SectionCard>
          )}

          {subModule.whereFields?.length > 0 && (
            <SectionCard icon={Filter} title="WHERE Conditions" hint={`(${subModule.whereLogic})`}>
              <div className="space-y-2">
                {subModule.whereFields.map((f) => {
                  const checked = selectedWhereFields.includes(f.fieldName);
                  const multiple = isMulti(f);
                  return (
                    <div
                      key={f.fieldName}
                      className={`flex gap-3 rounded-md p-1.5 transition-colors duration-150 ${multiple ? "items-start" : "items-center"} ${checked ? "bg-primary-500/[0.04]" : ""}`}
                    >
                      <label className={`flex w-40 shrink-0 items-center gap-2 text-sm text-slate-300 ${multiple ? "pt-1.5" : ""}`}>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) =>
                            setSelectedWhereFields((sel) =>
                              e.target.checked ? [...sel, f.fieldName] : sel.filter((n) => n !== f.fieldName)
                            )
                          }
                          className="h-3.5 w-3.5 accent-primary-500"
                        />
                        {f.fieldName}
                        {multiple && (
                          <span title="Accepts several values — generates IN (…)" className="rounded bg-surface-overlay px-1 text-[10px] font-semibold text-slate-400">
                            IN
                          </span>
                        )}
                      </label>
                      <ValueControl
                        dataType={f.dataType}
                        options={f.options}
                        value={whereFieldValues[f.fieldName]}
                        onChange={(v) => setWhereFieldValues((vals) => ({ ...vals, [f.fieldName]: v }))}
                        disabled={!checked}
                        placeholder={f.dataType}
                        multiple={multiple}
                        ariaLabel={f.fieldName}
                      />
                    </div>
                  );
                })}
              </div>
            </SectionCard>
          )}

          <div className="flex gap-2">
            <Button variant="secondary" icon={Sparkles} onClick={() => generateMutation.mutate()} loading={generateMutation.isPending}>
              Generate SQL
            </Button>
            <Button
              icon={justCopied ? Check : Copy}
              onClick={() => copyMutation.mutate()}
              loading={copyMutation.isPending}
              className={justCopied ? "bg-primary-400!" : ""}
            >
              {justCopied ? "Copied!" : "Copy Query"}
            </Button>
          </div>
        </div>

        <div className="space-y-4 lg:sticky lg:top-6 lg:self-start">
          <section className="overflow-hidden rounded-xl border border-surface-border bg-surface-raised shadow-elevated">
            <div className="flex items-center gap-2 border-b border-surface-border-soft bg-surface-overlay/50 px-4 py-2.5">
              <Terminal size={13} className="text-slate-500" />
              <h3 className="text-sm font-semibold text-slate-200">Generated SQL</h3>
              <span className="ml-auto flex gap-1" aria-hidden="true">
                <span className="h-2.5 w-2.5 rounded-full bg-red-500/40" />
                <span className="h-2.5 w-2.5 rounded-full bg-amber-500/40" />
                <span className="h-2.5 w-2.5 rounded-full bg-primary-500/40" />
              </span>
            </div>
            <pre className="sql-block min-h-[160px] p-4 text-xs leading-relaxed text-primary-text">
              {generatedSql || subModule.sqlTemplate}
            </pre>
          </section>

          <section className="flex items-start gap-2 rounded-xl border border-surface-border bg-surface-raised p-4 text-xs text-slate-500">
            <Info size={14} className="mt-0.5 shrink-0 text-slate-600" />
            <dl className="w-full space-y-1.5">
              <div className="flex justify-between"><dt>Version</dt><dd className="text-slate-300">v{subModule.version}</dd></div>
              <div className="flex justify-between"><dt>Last updated</dt><dd className="text-slate-300">{formatDateTime(subModule.updatedAt)}</dd></div>
            </dl>
          </section>
        </div>
      </div>

      {subModule.notesEnabled && <NotesPanel subModuleId={id} />}

      <ConfirmDialog
        open={deleteOpen}
        title="Delete query"
        message={`Delete "${subModule.name}"? This can't be undone.`}
        onCancel={() => setDeleteOpen(false)}
        onConfirm={() => deleteMutation.mutate()}
        loading={deleteMutation.isPending}
      />
    </div>
  );
}
