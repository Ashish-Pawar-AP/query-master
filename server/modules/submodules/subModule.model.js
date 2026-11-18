import mongoose from "mongoose";
import { ApiError } from "../../utils/ApiError.js";

// A Sub Module IS a query — one query template per sub module, no separate query
// collection. This is a deliberate 1:1 relationship: the sub module is the final
// navigation layer (PRD Feature 6) and permissions are already granted at this level,
// so folding the query fields in here means there's no way to end up with more than
// one query under a sub module.

export const QUERY_TYPES = Object.freeze({
  INSERT: "INSERT",
  UPDATE: "UPDATE",
  DELETE: "DELETE",
  SELECT: "SELECT",
});

export const DATA_TYPES = Object.freeze([
  "STRING",
  "INTEGER",
  "DECIMAL",
  "BOOLEAN",
  "DATE",
  "DATETIME",
  "ARRAY",
  "JSON",
  "NULL",
  "CUSTOM",
]);

// Types that hold exactly one value and can't meaningfully be a list.
const SINGLE_VALUE_TYPES = ["BOOLEAN", "NULL", "JSON"];

// `multiple: true` turns a WHERE field into `column IN (v1, v2, …)`, and a placeholder
// into a comma-separated list for use inside a hand-written IN ( … ). Built per use
// because Mongoose attaches schema-type state to the options object it's given.
const multipleOption = () => ({
  type: Boolean,
  default: false,
  validate: {
    validator(value) {
      return !value || !SINGLE_VALUE_TYPES.includes(this.dataType);
    },
    message:
      "Multiple values aren't supported for BOOLEAN, NULL or JSON fields",
  },
});

// One dropdown choice where the text the user SEES differs from the value that goes into the SQL,
// e.g. { label: "Self", value: "SE" }. Only used by JSON fields; `options` always mirrors the
// labels (see the pre-validate hook below), so anything that only reads `options` keeps working.
// ARRAY stays a plain comma-separated dropdown; this mapping belongs to the JSON data type.
const optionPairSchema = new mongoose.Schema(
  {
    label: { type: String, required: true, trim: true },
    value: { type: String, required: true, trim: true },
  },
  { _id: false },
);

// A single fillable placeholder, e.g. {{EmployeeId}}
const placeholderSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true }, // matches {{name}} in sqlTemplate
    label: { type: String, required: true, trim: true },
    dataType: { type: String, enum: DATA_TYPES, default: "STRING" },
    required: { type: Boolean, default: true },
    // BOOLEAN: ignored — the frontend always renders a fixed True/False dropdown.
    // ARRAY: the fixed list of choices the frontend renders as a single-select dropdown.
    // Anything else: ignored (renders as free text).
    options: { type: [String], default: [] },
    // JSON only: label -> SQL value pairs. When present, `options` holds the labels and the
    // generator writes the pair's value into the query instead of the label.
    optionPairs: { type: [optionPairSchema], default: [] },
    // The pre-selected value. For BOOLEAN this should be "true" or "false".
    // For ARRAY it should match one of `options`; for JSON with optionPairs, one of the labels.
    defaultValue: { type: String, default: "" }, // for `multiple`, a comma-separated list
    multiple: multipleOption(),
  },
  { _id: false },
);

// A column that can be dynamically toggled on/off for UPDATE/INSERT/WHERE generation.
// Same BOOLEAN/ARRAY rendering rules as placeholders above.
const fieldSchema = new mongoose.Schema(
  {
    fieldName: { type: String, required: true, trim: true }, // display label
    columnName: { type: String, required: true, trim: true }, // actual SQL column
    dataType: { type: String, enum: DATA_TYPES, default: "STRING" },
    defaultChecked: { type: Boolean, default: false },
    options: { type: [String], default: [] },
    optionPairs: { type: [optionPairSchema], default: [] }, // see placeholderSchema
    defaultValue: { type: String, default: "" }, // for `multiple`, a comma-separated list
    // Only meaningful for WHERE fields (-> IN list). Ignored for INSERT/UPDATE columns,
    // where a column can't be set to several values at once.
    multiple: multipleOption(),
  },
  { _id: false },
);

const subModuleSchema = new mongoose.Schema(
  {
    // Sub module identity (also doubles as the query title)
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true, default: "" },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
      index: true,
    },
    module: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Module",
      required: true,
      index: true,
    },
    status: { type: String, enum: ["ACTIVE", "ARCHIVED"], default: "ACTIVE" },

    // Query definition
    queryType: {
      type: String,
      enum: Object.values(QUERY_TYPES),
      required: true,
      default: "SELECT",
    },
    tableName: { type: String, trim: true, default: "" },
    sqlTemplate: { type: String, required: true, default: "" },
    placeholders: { type: [placeholderSchema], default: [] },
    updatableFields: { type: [fieldSchema], default: [] }, // INSERT columns / UPDATE SET columns
    whereFields: { type: [fieldSchema], default: [] },
    whereLogic: { type: String, enum: ["AND", "OR"], default: "AND" },
    tags: { type: [String], default: [] },
    // Opt-in: when true, users can keep personal notes on this query (see modules/notes).
    notesEnabled: { type: Boolean, default: false },
    version: { type: Number, default: 1 },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true },
);

// Keeps `options` and `optionPairs` consistent no matter what the client sent:
//  - only JSON rows can carry pairs, so stale ones on any other type are dropped;
//  - labels must be unique (they are what the user picks), and `options` is rebuilt from them;
//  - a default must be one of the labels, otherwise the dropdown could never show it.
function normaliseOptionPairs(rows) {
  for (const row of rows) {
    const name = row.fieldName || row.name;
    if (row.dataType !== "JSON") {
      if (row.optionPairs?.length) row.optionPairs = [];
      continue;
    }
    if (!row.optionPairs?.length) continue;

    const labels = row.optionPairs.map((pair) => pair.label);
    if (new Set(labels).size !== labels.length) {
      throw new ApiError(
        400,
        `"${name}" has the same option label more than once`,
      );
    }
    row.options = labels;

    const defaults = row.multiple
      ? String(row.defaultValue ?? "")
          .split(/[\n\r,]+/)
          .map((v) => v.trim())
          .filter(Boolean)
      : row.defaultValue
        ? [row.defaultValue]
        : [];
    const unknown = defaults.find((value) => !labels.includes(value));
    if (unknown !== undefined) {
      throw new ApiError(
        400,
        `Default "${unknown}" for "${name}" is not one of its option labels`,
      );
    }
  }
}

subModuleSchema.pre("validate", function () {
  normaliseOptionPairs(this.placeholders);
  normaliseOptionPairs(this.updatableFields);
  normaliseOptionPairs(this.whereFields);
});

subModuleSchema.index({ module: 1, name: 1 }, { unique: true });
subModuleSchema.index({ name: "text", description: "text", tags: "text" });

export const SubModule = mongoose.model("SubModule", subModuleSchema);
