import mongoose from "mongoose";

const categorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true, default: "" },
    status: { type: String, enum: ["ACTIVE", "ARCHIVED"], default: "ACTIVE" },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true }
);

// Uniqueness is per-Admin, not global — each Admin owns an isolated tree, so two
// different Admins can both have a category named "Employee" without colliding.
categorySchema.index({ name: 1, createdBy: 1 }, { unique: true });

export const Category = mongoose.model("Category", categorySchema);
