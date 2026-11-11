import clsx from "clsx";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Button from "./Button.jsx";

// Returns e.g. [1, "gap-2", 4, 5, 6, "gap-9", 10]: first and last page, the current page
// with one neighbour each side, and a gap marker wherever pages are skipped.
function getPageItems(page, pages) {
  if (pages <= 7) return Array.from({ length: pages }, (_, i) => i + 1);

  const keep = new Set([1, pages, page - 1, page, page + 1]);
  if (page <= 3) [2, 3, 4].forEach((n) => keep.add(n));
  if (page >= pages - 2) [pages - 3, pages - 2, pages - 1].forEach((n) => keep.add(n));

  const sorted = [...keep].filter((n) => n >= 1 && n <= pages).sort((a, b) => a - b);
  const items = [];
  sorted.forEach((n, i) => {
    if (i > 0 && n - sorted[i - 1] > 1) items.push(`gap-${n}`);
    items.push(n);
  });
  return items;
}

// Presentational only: it never fetches. The parent owns `page` and reacts to onPageChange.
// Props come straight from the API's `pagination` object ({ page, limit, total, pages }).
export default function Pagination({ page, pages, total, limit, onPageChange, disabled = false }) {
  if (!total) return null;

  const from = (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);

  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
      <p className="text-xs text-slate-500">
        Showing <span className="text-slate-300">{from}–{to}</span> of <span className="text-slate-300">{total}</span>
      </p>

      {pages > 1 && (
        <nav aria-label="Pagination" className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            icon={ChevronLeft}
            disabled={disabled || page <= 1}
            onClick={() => onPageChange(page - 1)}
            aria-label="Previous page"
          >
            Prev
          </Button>

          {getPageItems(page, pages).map((item) =>
            typeof item === "string" ? (
              <span key={item} className="px-1.5 text-xs text-slate-500" aria-hidden="true">…</span>
            ) : (
              <button
                key={item}
                type="button"
                disabled={disabled}
                aria-current={item === page ? "page" : undefined}
                aria-label={`Page ${item}`}
                onClick={() => onPageChange(item)}
                className={clsx(
                  "h-8 min-w-8 rounded-md px-2 text-xs font-medium transition-colors",
                  "focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-primary-400",
                  "disabled:cursor-not-allowed",
                  item === page
                    ? "bg-primary-500 text-slate-950"
                    : "text-slate-300 hover:bg-surface-raised hover:text-slate-100"
                )}
              >
                {item}
              </button>
            )
          )}

          <Button
            variant="ghost"
            size="sm"
            disabled={disabled || page >= pages}
            onClick={() => onPageChange(page + 1)}
            aria-label="Next page"
          >
            Next <ChevronRight size={15} />
          </Button>
        </nav>
      )}
    </div>
  );
}
