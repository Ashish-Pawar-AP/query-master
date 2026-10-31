import { asyncHandler } from "../../utils/asyncHandler.js";
import { ApiError } from "../../utils/ApiError.js";
import { Module } from "../modules/module.model.js";
import { SubModule } from "../submodules/subModule.model.js";
import { Category } from "../categories/category.model.js";
import { getContentFilter, assertContentAccess } from "../../utils/accessScope.js";

export const listModules = asyncHandler(async (req, res) => {
  const filter = await getContentFilter(req.user, "moduleIds");
  if (req.query.category) filter.category = req.query.category;

  const modules = await Module.find(filter).populate("category", "name").sort({ name: 1 }).lean();
  res.json({ success: true, data: modules });
});

export const createModule = asyncHandler(async (req, res) => {
  const { name, description, category } = req.body;
  if (!name || !category) throw new ApiError(400, "Module name and category are required");

  // The parent category must belong to this Admin — otherwise Admin A could create a
  // module inside Admin B's category just by knowing/guessing its id.
  const categoryDoc = await Category.findById(category);
  if (!categoryDoc) throw new ApiError(404, "Category not found");
  await assertContentAccess(req.user, categoryDoc, "categoryIds");

  const exists = await Module.findOne({ name, category });
  if (exists) throw new ApiError(409, "A module with this name already exists in this category");

  const module = await Module.create({ name, description, category, createdBy: req.user._id });
  res.status(201).json({ success: true, data: module });
});

export const updateModule = asyncHandler(async (req, res) => {
  const { name, description, status } = req.body;
  const module = await Module.findById(req.params.id);
  if (!module) throw new ApiError(404, "Module not found");
  await assertContentAccess(req.user, module, "moduleIds");

  if (name) module.name = name;
  if (description !== undefined) module.description = description;
  if (status) module.status = status;
  module.updatedBy = req.user._id;
  await module.save();
  res.json({ success: true, data: module });
});

export const deleteModule = asyncHandler(async (req, res) => {
  const module = await Module.findById(req.params.id);
  if (!module) throw new ApiError(404, "Module not found");
  await assertContentAccess(req.user, module, "moduleIds");

  const subModuleCount = await SubModule.countDocuments({ module: module._id });
  if (subModuleCount > 0) {
    throw new ApiError(409, "Cannot delete a module that still has sub modules. Archive it instead.");
  }

  await module.deleteOne();
  res.json({ success: true, message: "Module deleted" });
});
