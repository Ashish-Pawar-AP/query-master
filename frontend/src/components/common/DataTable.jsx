import EmptyState from "./EmptyState.jsx";
import { Inbox } from "lucide-react";

function SkeletonRows({ columns, rows = 6 }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, r) => (
        <tr key={r}>
          {columns.map((col, c) => (
            <td key={col.key} className="px-4 py-3">
              <div
                className="skeleton h-3.5 rounded-sm"
                style={{ width: c === 0 ? "70%" : `${45 + ((r * 13 + c * 7) % 35)}%` }}
              />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

// Minimal, dependency-free data table. columns: [{ key, label, render?(row) }]
// Loading state renders skeleton rows (reserving the table's real shape) instead of a
// bare spinner, so the layout doesn't jump when data arrives and there's continuous
// visual feedback rather than a blank beat.
export default function DataTable({ columns, rows, loading, emptyTitle = "Nothing here yet", emptyDescription }) {
  if (!loading && (!rows || rows.length === 0)) {
    return <EmptyState icon={Inbox} title={emptyTitle} description={emptyDescription} />;
  }

  return (
    <div className="animate-fade-in overflow-x-auto rounded-lg border border-surface-border bg-surface shadow-elevated">
      <table className="min-w-full divide-y divide-surface-border text-sm">
        <thead className="bg-surface-raised">
          <tr>
            {columns.map((col) => (
              <th key={col.key} className="whitespace-nowrap px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="stagger-children divide-y divide-surface-border">
          {loading ? (
            <SkeletonRows columns={columns} />
          ) : (
            rows.map((row, idx) => (
              <tr
                key={row._id || row.id || idx}
                className="group transition-colors duration-150 hover:bg-surface-raised/70"
              >
                {columns.map((col) => (
                  <td key={col.key} className="whitespace-nowrap px-4 py-2.5 text-slate-300">
                    {col.render ? col.render(row) : row[col.key]}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
