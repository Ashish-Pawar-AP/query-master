import { asyncHandler } from "../../utils/asyncHandler.js";
import { ApiError } from "../../utils/ApiError.js";
import { Favorite } from "./favorite.model.js";
import { SubModule } from "../submodules/subModule.model.js";
import { assertContentAccess } from "../../utils/accessScope.js";

export const listFavorites = asyncHandler(async (req, res) => {
  const favorites = await Favorite.find({ user: req.user._id })
    .populate({
      path: "subModule",
      select: "-sqlTemplate",
      populate: [
        { path: "category", select: "name" },
        { path: "module", select: "name" },
      ],
    })
    .sort({ createdAt: -1 })
    .lean();

  res.json({ success: true, data: favorites.filter((f) => f.subModule).map((f) => f.subModule) });
});

export const addFavorite = asyncHandler(async (req, res) => {
  const { subModuleId } = req.params;
  const subModule = await SubModule.findById(subModuleId);
  if (!subModule) throw new ApiError(404, "Query not found");
  await assertContentAccess(req.user, subModule, "subModuleIds");

  // Upsert-style: if it's already favorited, this is a no-op rather than an error.
  await Favorite.updateOne(
    { user: req.user._id, subModule: subModuleId },
    { $setOnInsert: { user: req.user._id, subModule: subModuleId } },
    { upsert: true }
  );

  res.status(201).json({ success: true, message: "Added to favorites" });
});

export const removeFavorite = asyncHandler(async (req, res) => {
  const { subModuleId } = req.params;
  await Favorite.deleteOne({ user: req.user._id, subModule: subModuleId });
  res.json({ success: true, message: "Removed from favorites" });
});
