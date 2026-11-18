// Rules for the "Options" box in the query editor.
//
//   ARRAY  a plain comma list:      Active, Inactive, Pending
//          -> the user sees these words and the SQL gets the same words
//
//   JSON   a label -> code mapping: {"Self": "SE", "Spouse": "SP"}
//          (or [{"label": "Self", "value": "SE"}])
//          -> the user sees the LEFT side (label) in a dropdown, the SQL gets the RIGHT side (code).
//          Leave the box empty and JSON behaves as before: a free-text box whose text is
//          written into the query as quoted JSON.
//
// Both are stored as `options` (always the labels, so the dropdown code is shared) plus, for JSON,
// `optionPairs` (label -> code). The server rebuilds and checks them on save.

const looksLikeJson = (text) => /^\s*[{[]/.test(text);

function parseMapping(raw) {
  if (!looksLikeJson(raw)) {
    return { labels: [], pairs: null, error: 'Paste JSON that maps label to code, e.g. {"Self": "SE", "Spouse": "SP"}' };
  }
  let data;
  try {
    data = JSON.parse(raw);
  } catch (err) {
    return { labels: [], pairs: null, error: `Not valid JSON: ${err.message}` };
  }

  const entries = Array.isArray(data) ? data.map((item) => [item?.label, item?.value]) : Object.entries(data);
  if (entries.length === 0) return { labels: [], pairs: null, error: "The JSON has no options in it" };

  const pairs = [];
  const seen = new Set();
  for (const [rawLabel, rawValue] of entries) {
    const label = typeof rawLabel === "string" ? rawLabel.trim() : "";
    if (!label) return { labels: [], pairs: null, error: "Every option needs a label (the text users will see)" };
    if (seen.has(label)) return { labels: [], pairs: null, error: `The label "${label}" appears more than once` };
    const okType = ["string", "number", "boolean"].includes(typeof rawValue);
    const value = okType ? String(rawValue).trim() : "";
    if (!value) return { labels: [], pairs: null, error: `"${label}" needs a text or number value (the code that goes into the SQL)` };
    seen.add(label);
    pairs.push({ label, value });
  }
  return { labels: pairs.map((p) => p.label), pairs, error: null };
}

export function parseOptionsInput(text, dataType = "ARRAY") {
  const raw = String(text ?? "").trim();
  if (!raw) return { labels: [], pairs: null, error: null };
  if (dataType === "JSON") return parseMapping(raw);
  return { labels: raw.split(",").map((s) => s.trim()).filter(Boolean), pairs: null, error: null };
}

// Turns a saved row back into the text shown in the Options box when editing.
// A JSON object would re-order number-like labels ("1", "2", "10"), so those use the array form.
export function optionsToText(row) {
  if (row.optionPairs?.length) {
    if (row.optionPairs.some((p) => /^\d+$/.test(p.label))) {
      return JSON.stringify(row.optionPairs.map(({ label, value }) => ({ label, value })), null, 1);
    }
    const lines = row.optionPairs.map((p) => `  ${JSON.stringify(p.label)}: ${JSON.stringify(p.value)}`);
    return `{\n${lines.join(",\n")}\n}`;
  }
  return (row.options || []).join(", ");
}

// What gets sent to the API for one row. Only ARRAY and JSON rows keep options.
export function serialiseOptions(row) {
  if (row.dataType !== "ARRAY" && row.dataType !== "JSON") return { options: [], optionPairs: [] };
  const { labels, pairs, error } = parseOptionsInput(row.options, row.dataType);
  if (error) throw new Error(error);
  return { options: labels, optionPairs: pairs || [] };
}
