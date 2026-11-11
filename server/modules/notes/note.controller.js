import { asyncHandler } from "../../utils/asyncHandler.js";
import { ApiError } from "../../utils/ApiError.js";
import { assertContentAccess } from "../../utils/accessScope.js";
import { SubModule } from "../submodules/subModule.model.js";
import { Note, MAX_NOTES_PER_QUERY, MAX_NOTE_LENGTH } from "./note.model.js";

const limits = { maxNotes: MAX_NOTES_PER_QUERY, maxLength: MAX_NOTE_LENGTH };

// Notes are opt-in per query (`notesEnabled`, set by the Admin) and follow the same access
// rules as the query itself — you can only annotate a query you're allowed to see.
async function requireNotesAccess(user, subModuleId) {
  const subModule = await SubModule.findById(subModuleId).select("notesEnabled createdBy");
  if (!subModule) throw new ApiError(404, "Query not found");
  await assertContentAccess(user, subModule, "subModuleIds");
  if (!subModule.notesEnabled) throw new ApiError(403, "Notes are not enabled for this query");
}

function cleanText(value) {
  const text = typeof value === "string" ? value.trim() : "";
  if (!text) throw new ApiError(400, "A note can't be empty");
  if (text.length > MAX_NOTE_LENGTH) throw new ApiError(400, `A note can be at most ${MAX_NOTE_LENGTH} characters`);
  return text;
}

export const listNotes = asyncHandler(async (req, res) => {
  if (!req.query.subModule) throw new ApiError(400, "subModule is required");
  await requireNotesAccess(req.user, req.query.subModule);
  const notes = await Note.find({ user: req.user._id, subModule: req.query.subModule }).sort({ updatedAt: -1 }).lean();
  res.json({ success: true, data: notes, limits });
});

export const createNote = asyncHandler(async (req, res) => {
  const { subModule } = req.body;
  if (!subModule) throw new ApiError(400, "subModule is required");
  await requireNotesAccess(req.user, subModule);
  const text = cleanText(req.body.text);

  const count = await Note.countDocuments({ user: req.user._id, subModule });
  if (count >= MAX_NOTES_PER_QUERY) {
    throw new ApiError(409, `You've reached the limit of ${MAX_NOTES_PER_QUERY} notes for this query — delete one to add another`);
  }
  const note = await Note.create({ user: req.user._id, subModule, text });
  res.status(201).json({ success: true, data: note });
});

export const updateNote = asyncHandler(async (req, res) => {
  const note = await Note.findOne({ _id: req.params.id, user: req.user._id });
  if (!note) throw new ApiError(404, "Note not found");
  await requireNotesAccess(req.user, note.subModule);
  note.text = cleanText(req.body.text);
  await note.save();
  res.json({ success: true, data: note });
});

// Deleting your own note is always allowed — even if notes were later switched off or
// access was revoked, you can still clear out what you wrote.
export const deleteNote = asyncHandler(async (req, res) => {
  const { deletedCount } = await Note.deleteOne({ _id: req.params.id, user: req.user._id });
  if (!deletedCount) throw new ApiError(404, "Note not found");
  res.json({ success: true, message: "Note deleted" });
});
