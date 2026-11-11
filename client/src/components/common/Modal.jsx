import { X } from "lucide-react";
import { useEffect } from "react";

export default function Modal({ open, onClose, title, children, footer, size = "md" }) {
  useEffect(() => {
    function handleKey(e) {
      if (e.key === "Escape") onClose?.();
    }
    if (open) document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  if (!open) return null;

  const widths = { sm: "max-w-sm", md: "max-w-lg", lg: "max-w-2xl", xl: "max-w-4xl" };

  return (
    <div
      className="animate-overlay-in fixed inset-0 z-50 flex items-center justify-center bg-surface-deep/80 p-4 backdrop-blur-xs"
      onClick={(e) => e.target === e.currentTarget && onClose?.()}
    >
      <div
        className={`animate-panel-in w-full ${widths[size]} rounded-xl border border-surface-border-soft bg-surface-raised shadow-panel`}
      >
        <div className="flex items-center justify-between border-b border-surface-border-soft px-5 py-4">
          <h2 className="text-sm font-semibold text-slate-100">{title}</h2>
          <button
            onClick={onClose}
            className="rounded-md p-1.5 text-slate-400 transition-all duration-150 hover:bg-surface-overlay hover:text-slate-100 active:scale-90"
            aria-label="Close dialog"
          >
            <X size={16} />
          </button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-surface-border-soft px-5 py-3">{footer}</div>}
      </div>
    </div>
  );
}
