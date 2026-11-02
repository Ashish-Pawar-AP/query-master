import { Star } from "lucide-react";
import clsx from "clsx";

// A dedicated favorite star — not built on top of the generic Button variants, because
// favorited/unfavorited needs an unambiguous visual (solid amber fill vs. outline), not
// just a text color swap that can get lost against a shared variant class.
export default function FavoriteToggle({ isFavorite, onToggle, loading, size = "md", showLabel = true }) {
  const sizes = {
    sm: "h-7 px-2 text-xs gap-1",
    md: "h-8 px-2.5 text-xs gap-1.5",
  };

  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={loading}
      aria-pressed={isFavorite}
      aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
      title={isFavorite ? "Remove from favorites" : "Add to favorites"}
      className={clsx(
        "inline-flex shrink-0 items-center justify-center rounded-md border font-medium transition-all duration-150",
        "focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-surface focus-visible:ring-amber-400",
        "disabled:cursor-not-allowed disabled:opacity-50",
        sizes[size],
        isFavorite
          ? "border-amber-500/40 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20"
          : "border-surface-border bg-transparent text-slate-400 hover:border-amber-500/30 hover:bg-amber-500/5 hover:text-amber-400"
      )}
    >
      <Star
        size={14}
        fill={isFavorite ? "currentColor" : "none"}
        className={clsx("transition-transform duration-150", isFavorite && "scale-110")}
      />
      {showLabel && (isFavorite ? "Favorited" : "Favorite")}
    </button>
  );
}
