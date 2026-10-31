import mongoose from "mongoose";

// Access is granted at the Sub Module level (the final navigation layer, per PRD Feature 6).
// Category/Module are denormalized here so sidebar & access checks avoid extra lookups.
export const ACTIONS = Object.freeze(["VIEW", "CREATE", "UPDATE", "DELETE", "MANAGE"]);

const permissionSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    category: { type: mongoose.Schema.Types.ObjectId, ref: "Category", required: true },
    module: { type: mongoose.Schema.Types.ObjectId, ref: "Module", required: true },
    subModule: { type: mongoose.Schema.Types.ObjectId, ref: "SubModule", required: true },
    actions: {
      type: [String],
      enum: ACTIONS,
      default: ["VIEW"],
    },
    grantedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

permissionSchema.index({ user: 1, subModule: 1 }, { unique: true });

export const Permission = mongoose.model("Permission", permissionSchema);
