// Shared rules for multi-value (IN list) fields, used by both the admin editor and the
// generator screen so they can never disagree.

// Types that hold exactly one value — mirrors SINGLE_VALUE_TYPES on the backend.
const SINGLE_VALUE_TYPES = ["BOOLEAN", "NULL", "JSON"];
export const canBeMultiple = (dataType) => !SINGLE_VALUE_TYPES.includes(dataType);

// What separates values when text is pasted or a default list is typed: newlines (a column
// copied from Excel/Sheets), tabs (a row copied from a spreadsheet), commas, semicolons.
const SPLIT_RE = /[\n\r\t,;]+/;
export const hasSeparator = (text) => SPLIT_RE.test(text);

// "a, b\nc" -> ["a", "b", "c"]  (trimmed, blanks dropped; duplicates are handled where added)
export const parseValues = (text) =>
  String(text ?? "")
    .split(SPLIT_RE)
    .map((value) => value.trim())
    .filter(Boolean);

// Some databases cap an IN list (Oracle: 1,000 expressions) — worth a heads-up, not a block.
export const MAX_RECOMMENDED_VALUES = 1000;
