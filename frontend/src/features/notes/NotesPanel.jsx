import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { StickyNote, Plus, Copy, Check, Pencil, Trash2, X } from "lucide-react";
import toast from "react-hot-toast";
import clsx from "clsx";
import { noteApi } from "./noteApi.js";
import Button from "../../components/common/Button.jsx";
import ConfirmDialog from "../../components/common/ConfirmDialog.jsx";
import { timeAgo } from "../../lib/format.js";

const errorMessage = (err, fallback) => err.response?.data?.message || fallback;

// Defined at module scope on purpose: a component declared inside NotesPanel would get a new
// identity every render and remount the textarea (dropping focus) on each keystroke.
function NoteEditor({ value, onChange, onSave, onCancel, saving, label, maxLength }) {
  const canSave = value.trim() && !saving;
  const onKeyDown = (e) => {
    if (e.key === "Escape") onCancel();
    else if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && canSave) onSave(); // Ctrl/Cmd+Enter saves
  };
  return (
    <div className="animate-fade-in-up space-y-2">
      <textarea
        autoFocus
        aria-label={label}
        value={value}
        maxLength={maxLength}
        rows={4}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder="Write anything worth remembering about this query…"
        className="sql-block w-full resize-y rounded-md border border-surface-border bg-surface px-3 py-2 text-sm text-slate-100 outline-hidden transition-[border-color,box-shadow] duration-150 placeholder:text-slate-600 focus:border-primary-500/50 focus:ring-2 focus:ring-primary-500/30"
      />
      <div className="flex items-center justify-between gap-2">
        <span className={clsx("text-[11px]", value.length > maxLength * 0.9 ? "text-amber-400" : "text-slate-500")}>
          {value.length}/{maxLength} · Ctrl+Enter to save
        </span>
        <div className="flex gap-2">
          <Button type="button" variant="ghost" size="sm" icon={X} onClick={onCancel}>Cancel</Button>
          <Button type="button" size="sm" icon={Check} onClick={onSave} loading={saving} disabled={!value.trim()}>Save note</Button>
        </div>
      </div>
    </div>
  );
}

// Personal notes on a query: create, read, edit, delete, copy. Shown only when an Admin has
// enabled notes for the query; each user sees only their own notes.
export default function NotesPanel({ subModuleId }) {
  const queryClient = useQueryClient();
  const queryKey = ["notes", subModuleId];
  const { data, isLoading } = useQuery({ queryKey, queryFn: () => noteApi.list(subModuleId).then((r) => r.data) });
  const notes = data?.data ?? [];
  const { maxNotes = 20, maxLength = 2000 } = data?.limits ?? {};

  const [composing, setComposing] = useState(false);
  const [draft, setDraft] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [copiedId, setCopiedId] = useState(null);

  const refresh = () => queryClient.invalidateQueries({ queryKey });

  const createMutation = useMutation({
    mutationFn: () => noteApi.create(subModuleId, draft),
    onSuccess: () => { toast.success("Note added"); setDraft(""); setComposing(false); refresh(); },
    onError: (err) => toast.error(errorMessage(err, "Couldn't add note")),
  });
  const updateMutation = useMutation({
    mutationFn: () => noteApi.update(editingId, editText),
    onSuccess: () => { toast.success("Note updated"); setEditingId(null); refresh(); },
    onError: (err) => toast.error(errorMessage(err, "Couldn't update note")),
  });
  const deleteMutation = useMutation({
    mutationFn: (id) => noteApi.remove(id),
    onSuccess: () => { toast.success("Note deleted"); setDeleteTarget(null); refresh(); },
    onError: (err) => toast.error(errorMessage(err, "Couldn't delete note")),
  });

  async function copyNote(note) {
    await navigator.clipboard.writeText(note.text);
    setCopiedId(note._id);
    toast.success("Note copied");
    setTimeout(() => setCopiedId((id) => (id === note._id ? null : id)), 1600);
  }

  return (
    <section className="animate-fade-in-up mt-6 rounded-xl border border-surface-border bg-surface-raised p-4 shadow-elevated">
      <div className="mb-3 flex items-center gap-2">
        <span className="flex h-6 w-6 items-center justify-center rounded-md bg-amber-500/10 text-amber-400">
          <StickyNote size={13} />
        </span>
        <h3 className="text-sm font-semibold text-slate-200">Notes</h3>
        <span className="rounded-full bg-surface-overlay px-2 py-0.5 text-[11px] text-slate-400">{notes.length}/{maxNotes}</span>
        <span className="text-xs text-slate-500">Only you can see these</span>
        {!composing && (
          <Button type="button" variant="secondary" size="sm" icon={Plus} className="ml-auto" disabled={notes.length >= maxNotes} onClick={() => setComposing(true)}>
            New note
          </Button>
        )}
      </div>

      {composing && (
        <div className="mb-3 rounded-lg border border-primary-500/20 bg-primary-500/[0.03] p-3">
          <NoteEditor maxLength={maxLength} label="New note" value={draft} onChange={setDraft} onSave={() => createMutation.mutate()} onCancel={() => { setComposing(false); setDraft(""); }} saving={createMutation.isPending} />
        </div>
      )}

      {isLoading ? (
        <div className="space-y-2">{[0, 1].map((i) => <div key={i} className="skeleton h-14 rounded-lg" />)}</div>
      ) : notes.length === 0 && !composing ? (
        <div className="flex flex-col items-center gap-1.5 rounded-lg border border-dashed border-surface-border py-8 text-center">
          <StickyNote size={20} className="text-slate-600" />
          <p className="text-sm text-slate-300">No notes yet</p>
          <p className="text-xs text-slate-500">Jot down filters, ticket numbers, or anything you'd rather not retype.</p>
        </div>
      ) : (
        <ul className="stagger-children space-y-2">
          {notes.map((note) => (
            <li key={note._id} className="group relative overflow-hidden rounded-lg border border-surface-border bg-surface p-3 pl-4 transition-colors duration-150 hover:border-slate-600">
              <span className="absolute inset-y-0 left-0 w-0.5 bg-amber-400/60 transition-colors group-hover:bg-amber-400" />
              {editingId === note._id ? (
                <NoteEditor maxLength={maxLength} label="Edit note" value={editText} onChange={setEditText} onSave={() => updateMutation.mutate()} onCancel={() => setEditingId(null)} saving={updateMutation.isPending} />
              ) : (
                <>
                  <p className="whitespace-pre-wrap break-words text-sm text-slate-200">{note.text}</p>
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <span className="text-[11px] text-slate-500">{timeAgo(note.updatedAt)}</span>
                    <div className="flex gap-1 opacity-70 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
                      <Button type="button" variant="ghost" size="sm" icon={copiedId === note._id ? Check : Copy} aria-label="Copy note" onClick={() => copyNote(note)}>
                        {copiedId === note._id ? "Copied" : "Copy"}
                      </Button>
                      <Button type="button" variant="ghost" size="sm" icon={Pencil} aria-label="Edit note" onClick={() => { setEditingId(note._id); setEditText(note.text); }}>Edit</Button>
                      <Button type="button" variant="ghost" size="sm" icon={Trash2} aria-label="Delete note" className="text-red-400" onClick={() => setDeleteTarget(note)}>Delete</Button>
                    </div>
                  </div>
                </>
              )}
            </li>
          ))}
        </ul>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete note"
        message="Delete this note? This can't be undone."
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => deleteMutation.mutate(deleteTarget._id)}
        loading={deleteMutation.isPending}
      />
    </section>
  );
}
