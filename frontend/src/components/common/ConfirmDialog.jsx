import { AlertTriangle } from "lucide-react";
import Modal from "./Modal.jsx";
import Button from "./Button.jsx";

export default function ConfirmDialog({ open, title = "Are you sure?", message, onCancel, onConfirm, danger = true, loading }) {
  return (
    <Modal open={open} onClose={onCancel} title={title} size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onCancel} size="sm">Cancel</Button>
          <Button variant={danger ? "danger" : "primary"} onClick={onConfirm} loading={loading} size="sm">
            Confirm
          </Button>
        </>
      }
    >
      <div className="flex gap-3">
        {danger && (
          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-500/10 text-red-400">
            <AlertTriangle size={16} />
          </span>
        )}
        <p className="text-sm leading-relaxed text-slate-300">{message}</p>
      </div>
    </Modal>
  );
}
