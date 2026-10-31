import mongoose from "mongoose";

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
    message: "Multiple values aren't supported for BOOLEAN, NULL or JSON fields",
  },
});

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
    // The pre-selected value. For BOOLEAN this should be "true" or "false".
    // For ARRAY it should match one of `options`.
    defaultValue: { type: String, default: "" }, // for `multiple`, a comma-separated list
    multiple: multipleOption(),
  },
  { _id: false }
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
    defaultValue: { type: String, default: "" }, // for `multiple`, a comma-separated list
    // Only meaningful for WHERE fields (-> IN list). Ignored for INSERT/UPDATE columns,
    // where a column can't be set to several values at once.
    multiple: multipleOption(),
  },
  { _id: false }
);

const subModuleSchema = new mongoose.Schema(
  {
    // Sub module identity (also doubles as the query title)
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true, default: "" },
    category: { type: mongoose.Schema.Types.ObjectId, ref: "Category", required: true, index: true },
    module: { type: mongoose.Schema.Types.ObjectId, ref: "Module", required: true, index: true },
    status: { type: String, enum: ["ACTIVE", "ARCHIVED"], default: "ACTIVE" },

    // Query definition
    queryType: { type: String, enum: Object.values(QUERY_TYPES), required: true, default: "SELECT" },
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

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true }
);

subModuleSchema.index({ module: 1, name: 1 }, { unique: true });
subModuleSchema.index({ name: "text", description: "text", tags: "text" });

export const SubModule = mongoose.model("SubModule", subModuleSchema);
