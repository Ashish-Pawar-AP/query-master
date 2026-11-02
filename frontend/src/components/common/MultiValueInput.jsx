import { useRef, useState } from "react";
import { X } from "lucide-react";
import clsx from "clsx";
import { parseValues, hasSeparator, MAX_RECOMMENDED_VALUES } from "../../lib/multiValue.js";

// Chip input for IN-list values. Type a value and press Enter (or a comma) to add it;
// paste a whole column from Excel/Sheets to add them all at once; Backspace on an empty
// field removes the last one.
export default function MultiValueInput({
  values = [],
  onChange,
  disabled = false,
  placeholder = "Type a value, press Enter — or paste a list",
  ariaLabel,
}) {
  const [draft, setDraft] = useState("");
  const inputRef = useRef(null);

  function addValues(incoming) {
    const next = [...values];
    for (const value of incoming) {
      if (!next.includes(value)) next.push(value); // duplicates are dropped silently
    }
    if (next.length !== values.length) onChange(next);
  }

  function commitDraft() {
    addValues(parseValues(draft));
    setDraft("");
  }

  function handleChange(event) {
    const text = event.target.value;
    // A separator can arrive by typing a comma, a mobile keyboard, autofill or a drop —
    // not just paste — so anything containing one is split into values right away.
    if (hasSeparator(text)) {
      addValues(parseValues(text));
      setDraft("");
    } else {
      setDraft(text);
    }
  }

  function handlePaste(event) {
    // Browsers flatten line breaks when pasting into a single-line <input>, which would
    // turn a pasted column into one blob — so read the raw clipboard text instead.
    const text = event.clipboardData?.getData("text") ?? "";
    if (hasSeparator(text)) {
      event.preventDefault();
      addValues(parseValues(text));
    }
  }

  function handleKeyDown(event) {
    if (event.key === "Enter") {
      event.preventDefault();
      commitDraft();
    } else if (event.key === "Backspace" && draft === "" && values.length > 0) {
      onChange(values.slice(0, -1));
    }
  }

  return (
    <div
      onClick={() => inputRef.current?.focus()}
      className={clsx(
        "rounded-md border bg-surface px-2 py-1.5 transition-[border-color,box-shadow] duration-150",
        disabled
          ? "border-surface-border opacity-40"
          : "border-surface-border focus-within:border-primary-500/50 focus-within:ring-2 focus-within:ring-primary-500/30"
      )}
    >
      <div className="flex max-h-40 flex-wrap gap-1.5 overflow-y-auto">
        {values.map((value) => (
          <span
            key={value}
            className="inline-flex max-w-full items-center gap-1 rounded-md bg-primary-500/10 py-0.5 pl-2 pr-1 text-xs text-primary-text ring-1 ring-inset ring-primary-500/20"
          >
            <span className="truncate">{value}</span>
            <button
              type="button"
              disabled={disabled}
              aria-label={`Remove ${value}`}
              onClick={(event) => {
                event.stopPropagation();
                onChange(values.filter((v) => v !== value));
              }}
              className="rounded p-0.5 transition-colors hover:bg-primary-500/20 disabled:cursor-not-allowed"
            >
              <X size={11} />
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          value={draft}
          disabled={disabled}
          aria-label={ariaLabel}
          placeholder={values.length === 0 ? placeholder : "Add another…"}
          onChange={handleChange}
          onPaste={handlePaste}
          onKeyDown={handleKeyDown}
          onBlur={commitDraft} // so typing a value and clicking Generate doesn't lose it
          className="min-w-[8rem] flex-1 bg-transparent py-0.5 text-sm text-slate-100 outline-hidden placeholder:text-slate-600 disabled:cursor-not-allowed"
        />
      </div>

      {values.length > 0 && (
        <div className="mt-1.5 flex items-center justify-between gap-2 text-[11px] text-slate-500">
          <span>
            {values.length} {values.length === 1 ? "value" : "values"}
            {values.length > MAX_RECOMMENDED_VALUES && (
              <span className="ml-1.5 text-amber-400">
                · some databases (e.g. Oracle) limit an IN list to {MAX_RECOMMENDED_VALUES.toLocaleString()} values
              </span>
            )}
          </span>
          <button
            type="button"
            disabled={disabled}
            onClick={(event) => {
              event.stopPropagation();
              onChange([]);
            }}
            className="transition-colors hover:text-slate-300 disabled:cursor-not-allowed"
          >
            Clear all
          </button>
        </div>
      )}
    </div>
  );
}
