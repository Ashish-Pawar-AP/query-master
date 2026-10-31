import mongoose from "mongoose";

// Just membership — no count field anywhere. A user either has a query favorited or
// doesn't; "how many people favorited this" isn't tracked, so favoriting never touches
// any other document besides this one small join record.
const favoriteSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    subModule: { type: mongoose.Schema.Types.ObjectId, ref: "SubModule", required: true },
  },
  { timestamps: true }
);

favoriteSchema.index({ user: 1, subModule: 1 }, { unique: true });

export const Favorite = mongoose.model("Favorite", favoriteSchema);
