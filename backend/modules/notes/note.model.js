import mongoose from "mongoose";

// Personal notes on a query. Storage stays bounded by design: one user's notes on one
// query are capped at MAX_NOTES_PER_QUERY, each at MAX_NOTE_LENGTH characters.
export const MAX_NOTES_PER_QUERY = 20;
export const MAX_NOTE_LENGTH = 2000;

const noteSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    subModule: { type: mongoose.Schema.Types.ObjectId, ref: "SubModule", required: true },
    text: { type: String, required: true, trim: true, maxlength: MAX_NOTE_LENGTH },
  },
  { timestamps: true }
);

noteSchema.index({ user: 1, subModule: 1, updatedAt: -1 });

export const Note = mongoose.model("Note", noteSchema);
