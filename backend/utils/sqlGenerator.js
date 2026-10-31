import { ApiError } from "./ApiError.js";

// Types that hold exactly one value — a `multiple` flag on these is ignored.
const SINGLE_VALUE_TYPES = new Set(["BOOLEAN", "NULL", "JSON"]);

const INTEGER_RE = /^[+-]?\d+$/;
const DECIMAL_RE = /^[+-]?(\d+(\.\d+)?|\.\d+)$/;

const isMultiple = (field) => Boolean(field.multiple) && !SINGLE_VALUE_TYPES.has(field.dataType);
const quote = (text) => `'${String(text).replace(/'/g, "''")}'`;
const asArray = (value) => (Array.isArray(value) ? value : []);
const asObject = (value) => (value && typeof value === "object" && !Array.isArray(value) ? value : {});

// Renders ONE scalar value as a SQL literal for its declared data type. `label` is only
// used to make validation errors say which field was wrong.
//
// INTEGER/DECIMAL are interpolated unquoted, so they're validated rather than trusted —
// otherwise a stray header cell in a pasted list (`1, 2, id`) or a hostile value would be
// copied straight into the generated SQL.
function renderValue(rawValue, dataType, label = "value") {
  if (rawValue === undefined || rawValue === null || rawValue === "") {
    return dataType === "NULL" ? "NULL" : "''";
  }
  switch (dataType) {
    case "INTEGER": {
      const text = String(rawValue).trim();
      if (!INTEGER_RE.test(text)) throw new ApiError(400, `"${label}" must be a whole number — got "${text}"`);
      return text.replace(/^\+/, "");
    }
    case "DECIMAL": {
      const text = String(rawValue).trim();
      if (!DECIMAL_RE.test(text)) throw new ApiError(400, `"${label}" must be a number — got "${text}"`);
      return text.replace(/^\+/, "");
    }
    case "BOOLEAN":
      return String(rawValue).toLowerCase() === "true" || rawValue === true ? "1" : "0";
    case "NULL":
      return "NULL";
    case "JSON":
      return quote(typeof rawValue === "string" ? rawValue : JSON.stringify(rawValue));
    default: // STRING, DATE, DATETIME, ARRAY (the chosen option), CUSTOM
      return quote(rawValue);
  }
}

// Normalizes a multi-value input into a clean list: trimmed, blanks dropped, duplicates
// removed (first occurrence wins, order kept). Accepts an array (what the UI sends) or a
// string — admin-defined default values are stored as "a, b, c".
function toList(raw) {
  const items = Array.isArray(raw) ? raw : raw == null ? [] : String(raw).split(/[\n\r,]+/);
  const seen = new Set();
  const list = [];
  for (const item of items) {
    const value = item == null ? "" : String(item).trim();
    if (value !== "" && !seen.has(value)) {
      seen.add(value);
      list.push(value);
    }
  }
  return list;
}

const renderList = (items, dataType, label) => items.map((item) => renderValue(item, dataType, label));

// Resolves one placeholder to the text that replaces its {{token}}.
function resolvePlaceholder(placeholder, provided) {
  const label = placeholder.label || placeholder.name;
  const missing = () => new ApiError(400, `Missing required value for placeholder "${placeholder.name}"`);

  if (isMultiple(placeholder)) {
    let items = toList(provided);
    if (items.length === 0) {
      if (placeholder.required) throw missing();
      items = toList(placeholder.defaultValue);
    }
    // An optional list left empty becomes NULL so a hand-written `IN ({{Ids}})` stays
    // valid SQL (it simply matches nothing) instead of turning into the syntax error `IN ()`.
    return items.length === 0 ? "NULL" : renderList(items, placeholder.dataType, label).join(", ");
  }

  const isEmpty = provided === undefined || provided === null || provided === "";
  if (placeholder.required && isEmpty) throw missing();
  return renderValue(isEmpty ? placeholder.defaultValue : provided, placeholder.dataType, label);
}

const chosenFields = (fields, selectedNames) => fields.filter((f) => selectedNames.includes(f.fieldName));

// Builds a dynamic SET clause for UPDATE templates from the fields the user checked, plus their values.
export function buildSetClause(updatableFields, selectedFieldNames, fieldValues) {
  const chosen = chosenFields(updatableFields, selectedFieldNames);
  if (chosen.length === 0) {
    throw new ApiError(400, "Select at least one field to update");
  }
  return chosen
    .map((f) => `${f.columnName} = ${renderValue(fieldValues[f.fieldName] ?? f.defaultValue, f.dataType, f.fieldName)}`)
    .join(",\n  ");
}

// Builds a dynamic INSERT column/value list from the fields the user checked, plus their values.
export function buildInsertClause(updatableFields, selectedFieldNames, fieldValues) {
  const chosen = chosenFields(updatableFields, selectedFieldNames);
  if (chosen.length === 0) {
    throw new ApiError(400, "Select at least one field to insert");
  }
  const columns = chosen.map((f) => f.columnName).join(", ");
  const values = chosen
    .map((f) => renderValue(fieldValues[f.fieldName] ?? f.defaultValue, f.dataType, f.fieldName))
    .join(", ");
  return { columns, values };
}

// Builds a dynamic WHERE clause from the conditions the user checked, joined by AND/OR.
// A `multiple` field becomes `column IN (a, b, c)`; every other field is `column = value`.
export function buildWhereClause(whereFields, selectedFieldNames, fieldValues, logic = "AND") {
  const chosen = chosenFields(whereFields, selectedFieldNames);
  if (chosen.length === 0) {
    throw new ApiError(400, "Select at least one condition for the WHERE clause");
  }
  const joiner = logic === "OR" ? " OR " : " AND ";
  return chosen
    .map((f) => {
      const provided = fieldValues[f.fieldName] ?? f.defaultValue;
      if (!isMultiple(f)) {
        return `${f.columnName} = ${renderValue(provided, f.dataType, f.fieldName)}`;
      }
      const items = toList(provided);
      if (items.length === 0) {
        // `IN ()` is a syntax error in every database — say what's missing instead.
        throw new ApiError(400, `Add at least one value for "${f.fieldName}"`);
      }
      return `${f.columnName} IN (${renderList(items, f.dataType, f.fieldName).join(", ")})`;
    })
    .join(joiner);
}

// Matches {{token}} (whitespace inside the braces is allowed).
const TOKEN_RE = /{{\s*([^{}]+?)\s*}}/g;

// Assembles the final SQL for a sub module's query given the user's inputs.
//
// Every token is replaced in ONE pass over the template, using a function replacer. That
// matters now that values are arbitrary pasted data: with sequential String.replace calls,
// a value containing `$&` would be mangled by replacement-pattern syntax, and a value that
// happened to contain `{{WHERE_CLAUSE}}` would get substituted by a later step.
export function generateSql(template, input = {}) {
  const placeholderValues = asObject(input.placeholderValues);
  const updateFieldValues = asObject(input.updateFieldValues);
  const whereFieldValues = asObject(input.whereFieldValues);
  const selectedUpdateFields = asArray(input.selectedUpdateFields);
  const selectedWhereFields = asArray(input.selectedWhereFields);

  const tokens = new Map();

  for (const placeholder of template.placeholders) {
    tokens.set(placeholder.name, resolvePlaceholder(placeholder, placeholderValues[placeholder.name]));
  }

  if (template.queryType === "UPDATE" && template.updatableFields.length > 0 && selectedUpdateFields.length > 0) {
    tokens.set("SET_CLAUSE", buildSetClause(template.updatableFields, selectedUpdateFields, updateFieldValues));
  }

  if (template.queryType === "INSERT" && template.updatableFields.length > 0 && selectedUpdateFields.length > 0) {
    const { columns, values } = buildInsertClause(template.updatableFields, selectedUpdateFields, updateFieldValues);
    tokens.set("INSERT_COLUMNS", columns);
    tokens.set("INSERT_VALUES", values);
  }

  if (template.whereFields.length > 0 && selectedWhereFields.length > 0) {
    tokens.set(
      "WHERE_CLAUSE",
      buildWhereClause(template.whereFields, selectedWhereFields, whereFieldValues, template.whereLogic)
    );
  }

  // Unknown tokens are left as written, same as before.
  return template.sqlTemplate.replace(TOKEN_RE, (match, name) => (tokens.has(name) ? tokens.get(name) : match));
}
